import { db } from "../index.js";
import { trips, charges, vehicles } from "../schema.js";
import { gte, eq, and, sql } from "drizzle-orm";

export type StatsPeriod = "week" | "month" | "year";

const PERIOD_SECONDS: Record<StatsPeriod, number> = {
  week:  7 * 86400,
  month: 30 * 86400,
  year:  365 * 86400,
};

export const statsRepository = {
  getTripStats(period: StatsPeriod, vehicleId?: number) {
    const since = Math.floor(Date.now() / 1000) - PERIOD_SECONDS[period];
    const condition = vehicleId
      ? and(gte(trips.startedAt, since), eq(trips.vehicleId, vehicleId))
      : gte(trips.startedAt, since);
    return db
      .select({
        totalTrips:        sql<number>`count(*)`,
        totalDistanceKm:   sql<number>`sum(distance_km)`,
        totalEnergyConsumed: sql<number>`sum(energy_consumed)`,
      })
      .from(trips)
      .where(condition)
      .get();
  },

  getChargeStats(period: StatsPeriod, vehicleId?: number) {
    const since = Math.floor(Date.now() / 1000) - PERIOD_SECONDS[period];
    const condition = vehicleId
      ? and(gte(charges.startedAt, since), eq(charges.vehicleId, vehicleId))
      : gte(charges.startedAt, since);
    return db
      .select({
        totalCharges:        sql<number>`count(*)`,
        totalEnergyAddedKwh: sql<number>`sum(energy_added_kwh)`,
        totalCost:           sql<number>`sum(cost)`,
      })
      .from(charges)
      .where(condition)
      .get();
  },

  resolveVehicleId(vin: string): number | undefined {
    return db.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.vin, vin)).get()?.id;
  },
};
