import axios, { type AxiosInstance } from "axios";
import { realmForBrand, getTokenSet } from "./psa-auth.js";

// Correct base URL from psa_car_controller — note .com not .io
const API_BASE = "https://api.groupe-psa.com/connectedcar/v4";

function createClient(brand: string): AxiosInstance {
  const realm  = realmForBrand(brand);
  const tokens = getTokenSet(realm);
  if (!tokens) throw new Error(`Not authenticated for brand ${brand}`);

  return axios.create({
    baseURL: API_BASE,
    headers: {
      Authorization:        `Bearer ${tokens.accessToken}`,
      "x-introspect-realm": realm,
      Accept:               "application/hal+json",
    },
    params: { client_id: tokens.clientId },
  });
}

export interface PsaVehicle {
  id: string;           // PSA internal hash — used in all API URL paths
  vin: string;
  brand?: string;
  label?: string;
  motorization?: string; // e.g. "Electric", "Hybrid", "Petrol"
  pictures: string[];
  _embedded?: {
    extension?: {
      energy?: Array<{ type: string }>;
    };
  };
}

interface PsaCharging {
  plugged: boolean;
  status: string;
  chargingRate?: number;
  chargingMode?: string;
  remainingTime?: string; // ISO 8601 duration, e.g. "PT0S"
}

interface PsaBatteryDetail {
  load?: { capacity: number; residual: number };
  health?: { resistance: number };
}

export interface PsaStatus {
  lastPosition?: {
    geometry?: { coordinates: [number, number, number?] };
    properties?: { heading?: number; fixStatus?: string; signalQuality?: number };
  };
  energies?: Array<{
    type: string;
    level: number;
    autonomy: number;
    extension?: {
      electric?: {
        charging?: PsaCharging;
        battery?: PsaBatteryDetail;
      };
    };
  }>;
  // older API versions use "energy" (flat, no extension wrapper)
  energy?: Array<{
    type: string;
    level: number;
    autonomy: number;
    charging?: PsaCharging;
    battery?: PsaBatteryDetail;
  }>;
  kinetic?: { moving: boolean; speed?: number };
  odometer?: { mileage: number };
  ignition?: { type: string };
  battery?: { voltage: number };
  environment?: {
    luminosity?: { day: boolean };
    air?: { temp: number };
  };
  privacy?: { state: string };
  service?: { type: string };
}

export async function fetchVehicles(brand: string): Promise<PsaVehicle[]> {
  const client = createClient(brand);
  const resp = await client.get<{
    _embedded?: { vehicles?: PsaVehicle[] };
    embedded?: { vehicles?: PsaVehicle[] };
  }>("/user/vehicles", { params: { embed: "extension" } });

  console.log("[psa-api] fetchVehicles raw response:", JSON.stringify(resp.data));

  // HAL+JSON uses _embedded; fall back to embedded just in case
  const vehicles =
    resp.data?._embedded?.vehicles ??
    resp.data?.embedded?.vehicles ??
    [];

  console.log(`[psa-api] found ${vehicles.length} vehicle(s)`);
  return vehicles;
}

let _statusLogged = false;
export async function fetchVehicleStatus(psaId: string, brand: string): Promise<PsaStatus> {
  const client = createClient(brand);
  const resp = await client.get<PsaStatus>(`/user/vehicles/${psaId}/status`);
  if (!_statusLogged) {
    console.log("[psa-api] first status response:", JSON.stringify(resp.data));
    _statusLogged = true;
  }
  return resp.data;
}

export async function sendCommand(
  _psaId: string,
  _command: string,
): Promise<void> {
  // Remote commands require the PSA virtualkey remote-access token and an MQTT
  // connection to PSA's broker — neither is available with the Connected Car
  // OAuth tokens alone. This is not yet implemented.
  throw new Error("NOT_IMPLEMENTED");
}
