import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const vehicles = sqliteTable("vehicles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  psaId: text("psa_id").notNull().unique(),  // PSA internal hash ID used in all API URLs
  vin: text("vin").notNull().unique(),
  brand: text("brand").notNull(),
  label: text("label").notNull(),
  model: text("model"),
  year: integer("year"),
  isElectric: integer("is_electric", { mode: "boolean" }).notNull().default(false),
  needsReauth: integer("needs_reauth", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull(),
});

export const vehicleStatus = sqliteTable("vehicle_status", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vehicleId: integer("vehicle_id")
    .notNull()
    .references(() => vehicles.id),
  timestamp: integer("timestamp").notNull(),
  batteryLevel: real("battery_level"),
  rangeKm: real("range_km"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  mileageKm: real("mileage_km"),
  isCharging: integer("is_charging", { mode: "boolean" }),
  isMoving: integer("is_moving", { mode: "boolean" }),
  doorsLocked: integer("doors_locked", { mode: "boolean" }),
  outsideTempC: real("outside_temp_c"),
  isDaytime: integer("is_daytime", { mode: "boolean" }),
  speedKmh: real("speed_kmh"),
  headingDeg: real("heading_deg"),
  gpsSignalQuality: integer("gps_signal_quality"),
  fixStatus: text("fix_status"),
  ignitionState: text("ignition_state"),
  pluggedIn: integer("plugged_in", { mode: "boolean" }),
  chargingStatus: text("charging_status"),
  chargingMode: text("charging_mode"),
  chargingRate: real("charging_rate"),
  remainingChargeMinutes: integer("remaining_charge_minutes"),
  batteryCapacityWh: real("battery_capacity_wh"),
  batteryResidualWh: real("battery_residual_wh"),
  batteryHealthPercent: real("battery_health_percent"),
  battery12vVoltage: real("battery_12v_voltage"),
  privacyState: text("privacy_state"),
  serviceType: text("service_type"),
  rawJson: text("raw_json"),
});

export const trips = sqliteTable("trips", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vehicleId: integer("vehicle_id")
    .notNull()
    .references(() => vehicles.id),
  startedAt: integer("started_at").notNull(),
  endedAt: integer("ended_at"),
  distanceKm: real("distance_km"),
  energyConsumed: real("energy_consumed"),
  startLat: real("start_lat"),
  startLng: real("start_lng"),
  endLat: real("end_lat"),
  endLng: real("end_lng"),
  avgSpeedKmh: real("avg_speed_kmh"),
});

export const tripWaypoints = sqliteTable("trip_waypoints", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tripId: integer("trip_id")
    .notNull()
    .references(() => trips.id),
  timestamp: integer("timestamp").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
});

export const charges = sqliteTable("charges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vehicleId: integer("vehicle_id")
    .notNull()
    .references(() => vehicles.id),
  startedAt: integer("started_at").notNull(),
  endedAt: integer("ended_at"),
  energyAddedKwh: real("energy_added_kwh"),
  startSoc: real("start_soc"),
  endSoc: real("end_soc"),
  cost: real("cost"),
  locationLat: real("location_lat"),
  locationLng: real("location_lng"),
});
