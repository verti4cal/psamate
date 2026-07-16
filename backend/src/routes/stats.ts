import type { FastifyInstance } from "fastify";
import { statsRepository, type StatsPeriod } from "../db/repositories/index.js";

export async function statsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { period?: StatsPeriod; vin?: string } }>(
    "/api/stats",
    async (req) => {
      const period: StatsPeriod = req.query.period ?? "month";
      const vehicleId = req.query.vin
        ? statsRepository.resolveVehicleId(req.query.vin)
        : undefined;

      const tripStats    = statsRepository.getTripStats(period, vehicleId);
      const chargeStats  = statsRepository.getChargeStats(period, vehicleId);

      return {
        period,
        trips: {
          count:          tripStats?.totalTrips ?? 0,
          distanceKm:     tripStats?.totalDistanceKm ?? 0,
          energyConsumed: tripStats?.totalEnergyConsumed ?? 0,
        },
        charges: {
          count:          chargeStats?.totalCharges ?? 0,
          energyAddedKwh: chargeStats?.totalEnergyAddedKwh ?? 0,
          cost:           chargeStats?.totalCost ?? 0,
        },
      };
    }
  );
}
