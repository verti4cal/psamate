import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "",
});

export interface Vehicle {
  id: number;
  vin: string;
  brand: string;
  label: string;
  model: string | null;
  year: number | null;
  isElectric: boolean;
  needsReauth: boolean;
}

export interface VehicleStatus {
  id: number;
  vehicleId: number;
  timestamp: number;
  batteryLevel: number | null;
  rangeKm: number | null;
  latitude: number | null;
  longitude: number | null;
  mileageKm: number | null;
  isCharging: boolean | null;
  isMoving: boolean | null;
  doorsLocked: boolean | null;
  outsideTempC: number | null;
  isDaytime: boolean | null;
  speedKmh: number | null;
  headingDeg: number | null;
  gpsSignalQuality: number | null;
  fixStatus: string | null;
  ignitionState: string | null;
  pluggedIn: boolean | null;
  chargingStatus: string | null;
  chargingMode: string | null;
  chargingRate: number | null;
  remainingChargeMinutes: number | null;
  batteryCapacityWh: number | null;
  batteryResidualWh: number | null;
  batteryHealthPercent: number | null;
  battery12vVoltage: number | null;
  privacyState: string | null;
  serviceType: string | null;
  state?: "PARKED" | "MOVING" | "CHARGING";
}

export interface Trip {
  id: number;
  vehicleId: number;
  startedAt: number;
  endedAt: number | null;
  distanceKm: number | null;
  energyConsumed: number | null;
  startLat: number | null;
  startLng: number | null;
  endLat: number | null;
  endLng: number | null;
  avgSpeedKmh: number | null;
}

export interface TripWithWaypoints extends Trip {
  waypoints: Array<{ id: number; lat: number; lng: number; timestamp: number }>;
}

export interface Charge {
  id: number;
  vehicleId: number;
  startedAt: number;
  endedAt: number | null;
  energyAddedKwh: number | null;
  startSoc: number | null;
  endSoc: number | null;
  cost: number | null;
  locationLat: number | null;
  locationLng: number | null;
}

export interface Stats {
  period: string;
  trips: { count: number; distanceKm: number; energyConsumed: number };
  charges: { count: number; energyAddedKwh: number; cost: number };
}

export interface AppSettings {
  brand?: string;
  polling_interval_active?: string;
  polling_interval_parked?: string;
  units?: string;
  currency?: string;
  kwh_price?: string;
  setup_complete?: string;
  mqtt_enabled?: string;
  mqtt_host?: string;
  mqtt_port?: string;
  mqtt_username?: string;
  mqtt_topic_prefix?: string;
}
