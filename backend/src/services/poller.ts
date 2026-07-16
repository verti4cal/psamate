import { isAxiosError } from "axios";
import {
  vehiclesRepository,
  vehicleStatusRepository,
  tripsRepository,
  chargesRepository,
  settingsRepository,
} from "../db/repositories/index.js";
import { fetchVehicleStatus, type PsaStatus } from "./psa-api.js";
import { emitStatusUpdate } from "../plugins/websocket.js";
import { publishMqttStatus } from "./mqtt.js";

type PollerState = "PARKED" | "MOVING" | "CHARGING";

interface VehiclePollerContext {
  vin: string;
  psaId: string;
  brand: string;
  vehicleId: number;
  state: PollerState;
  needsReauth: boolean;
  activeTripId: number | null;
  activeChargeId: number | null;
  timer: NodeJS.Timeout | null;
}

const contexts = new Map<string, VehiclePollerContext>();
let running = false;

export function startPoller(): void {
  if (running) return;
  running = true;
  scheduleAll();
}

export function stopPoller(): void {
  running = false;
  for (const ctx of contexts.values()) {
    if (ctx.timer) clearTimeout(ctx.timer);
  }
  contexts.clear();
}

async function scheduleAll(): Promise<void> {
  if (!running) return;

  const allVehicles = vehiclesRepository.findAll();
  for (const v of allVehicles) {
    if (!contexts.has(v.vin)) {
      contexts.set(v.vin, {
        vin:           v.vin,
        psaId:         v.psaId,
        brand:         v.brand,
        vehicleId:     v.id,
        state:         "PARKED",
        needsReauth:   v.needsReauth,
        activeTripId:  null,
        activeChargeId: null,
        timer:         null,
      });
    }
    await pollVehicle(v.vin);
  }

  setTimeout(scheduleAll, 60_000);
}

async function pollVehicle(vin: string): Promise<void> {
  const ctx = contexts.get(vin);
  if (!ctx || !running) return;

  if (ctx.timer) {
    clearTimeout(ctx.timer);
    ctx.timer = null;
  }

  try {
    const status = await fetchVehicleStatus(ctx.psaId, ctx.brand);
    if (ctx.needsReauth) {
      ctx.needsReauth = false;
      vehiclesRepository.setNeedsReauth(ctx.vehicleId, false);
    }
    await handleStatus(ctx, status);
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 401) {
      console.error(`[poller] ${vin} needs reauthentication (401)`);
      if (!ctx.needsReauth) {
        ctx.needsReauth = true;
        vehiclesRepository.setNeedsReauth(ctx.vehicleId, true);
      }
    } else {
      console.error(`[poller] Error polling ${vin}:`, err);
    }
  }

  const interval = ctx.needsReauth ? getInterval("PARKED") : getInterval(ctx.state);
  ctx.timer = setTimeout(() => pollVehicle(vin), interval);
}

function getInterval(state: PollerState): number {
  if (state === "MOVING") return 30_000;
  if (state === "CHARGING") return 60_000;
  return parseInt(process.env.POLL_INTERVAL_PARKED ?? "300000", 10);
}

async function handleStatus(ctx: VehiclePollerContext, raw: PsaStatus): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  // API may return "energies" (nested) or "energy" (flat) — prefer energies
  const energiesEntry = raw.energies?.[0];
  const energyEntry = energiesEntry ?? raw.energy?.[0];
  const chargingInfo =
    energiesEntry?.extension?.electric?.charging ?? raw.energy?.[0]?.charging;
  const batteryDetail =
    energiesEntry?.extension?.electric?.battery ?? raw.energy?.[0]?.battery;

  const coords = raw.lastPosition?.geometry?.coordinates;
  const posProps = raw.lastPosition?.properties;

  const snapshot = {
    vehicleId:               ctx.vehicleId,
    timestamp:               now,
    batteryLevel:            energyEntry?.level ?? null,
    rangeKm:                 energyEntry?.autonomy ?? null,
    latitude:                coords ? coords[1] : null,
    longitude:               coords ? coords[0] : null,
    mileageKm:               raw.odometer?.mileage ?? null,
    isCharging:              chargingInfo?.status === "InProgress",
    isMoving:                raw.kinetic?.moving ?? false,
    doorsLocked:             null,   // not provided by this API endpoint
    outsideTempC:            raw.environment?.air?.temp ?? null,
    isDaytime:               raw.environment?.luminosity?.day ?? null,
    speedKmh:                raw.kinetic?.speed ?? null,
    headingDeg:              posProps?.heading ?? null,
    gpsSignalQuality:        posProps?.signalQuality ?? null,
    fixStatus:               posProps?.fixStatus ?? null,
    ignitionState:           raw.ignition?.type ?? null,
    pluggedIn:               chargingInfo?.plugged ?? null,
    chargingStatus:          chargingInfo?.status ?? null,
    chargingMode:            chargingInfo?.chargingMode ?? null,
    chargingRate:            chargingInfo?.chargingRate ?? null,
    remainingChargeMinutes:  parseIso8601DurationMinutes(chargingInfo?.remainingTime),
    batteryCapacityWh:       batteryDetail?.load?.capacity ?? null,
    batteryResidualWh:       batteryDetail?.load?.residual ?? null,
    batteryHealthPercent:    batteryDetail?.health?.resistance ?? null,
    battery12vVoltage:       raw.battery?.voltage ?? null,
    privacyState:            raw.privacy?.state ?? null,
    serviceType:             raw.service?.type ?? null,
    rawJson:                 JSON.stringify(raw),
  };

  vehicleStatusRepository.insert(snapshot);

  const prevState = ctx.state;

  if (prevState === "PARKED" && snapshot.isMoving) {
    ctx.state = "MOVING";
    const trip = tripsRepository.create({
      vehicleId: ctx.vehicleId,
      startedAt: now,
      startLat: snapshot.latitude,
      startLng: snapshot.longitude,
    });
    ctx.activeTripId = trip.id;

  } else if (prevState === "MOVING" && !snapshot.isMoving) {
    ctx.state = "PARKED";
    if (ctx.activeTripId) {
      const waypoints = tripsRepository.findWaypointsByTripId(ctx.activeTripId);
      const distKm = estimateDistance(waypoints.map((w) => ({ lat: w.lat, lng: w.lng })));
      tripsRepository.update(ctx.activeTripId, {
        endedAt: now,
        endLat: snapshot.latitude,
        endLng: snapshot.longitude,
        distanceKm: distKm,
      });
      ctx.activeTripId = null;
    }

  } else if (prevState === "PARKED" && snapshot.isCharging) {
    ctx.state = "CHARGING";
    const charge = chargesRepository.create({
      vehicleId: ctx.vehicleId,
      startedAt: now,
      startSoc: snapshot.batteryLevel,
      locationLat: snapshot.latitude,
      locationLng: snapshot.longitude,
    });
    ctx.activeChargeId = charge.id;

  } else if (prevState === "CHARGING" && !snapshot.isCharging) {
    ctx.state = "PARKED";
    if (ctx.activeChargeId) {
      const startRow = chargesRepository.findById(ctx.activeChargeId);
      const kwhPerPercent = 0.77;
      const deltaPercent = (snapshot.batteryLevel ?? 0) - (startRow?.startSoc ?? 0);
      const energyAdded = Math.max(0, deltaPercent * kwhPerPercent);
      const kwhPrice = parseFloat(settingsRepository.get("kwh_price") ?? "0");
      chargesRepository.update(ctx.activeChargeId, {
        endedAt: now,
        endSoc: snapshot.batteryLevel,
        energyAddedKwh: energyAdded,
        cost: energyAdded * kwhPrice,
      });
      ctx.activeChargeId = null;
    }
  }

  if (ctx.state === "MOVING" && ctx.activeTripId && snapshot.latitude && snapshot.longitude) {
    tripsRepository.addWaypoint({
      tripId: ctx.activeTripId,
      timestamp: now,
      lat: snapshot.latitude,
      lng: snapshot.longitude,
    });
  }

  emitStatusUpdate(ctx.vin, { ...snapshot, state: ctx.state });
  await publishMqttStatus(ctx.vin, snapshot).catch(() => {});
}

/** Parses an ISO 8601 duration (e.g. "PT1H30M0S") into whole minutes. */
function parseIso8601DurationMinutes(duration: string | undefined): number | null {
  if (!duration) return null;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration);
  if (!match) return null;
  const hours = parseInt(match[1] ?? "0", 10);
  const minutes = parseInt(match[2] ?? "0", 10);
  const seconds = parseInt(match[3] ?? "0", 10);
  return hours * 60 + minutes + Math.round(seconds / 60);
}

function estimateDistance(points: Array<{ lat: number; lng: number }>): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineKm(points[i - 1]!, points[i]!);
  }
  return total;
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
