import type { FastifyInstance } from "fastify";
import { tripsRepository, vehiclesRepository } from "../db/repositories/index.js";

export async function tripRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { vin?: string; limit?: string; offset?: string } }>(
    "/api/trips",
    async (req) => {
      const limit = parseInt(req.query.limit ?? "50", 10);
      const offset = parseInt(req.query.offset ?? "0", 10);

      if (req.query.vin) {
        const vehicle = vehiclesRepository.findByVin(req.query.vin);
        if (!vehicle) return [];
        return tripsRepository.findByVehicleId(vehicle.id, limit, offset);
      }

      return tripsRepository.findAll(limit, offset);
    }
  );

  app.get<{ Params: { id: string } }>("/api/trips/:id", async (req, reply) => {
    const id = parseInt(req.params.id, 10);
    const trip = tripsRepository.findById(id);
    if (!trip) return reply.status(404).send({ error: "Trip not found" });

    const waypoints = tripsRepository.findWaypointsByTripId(id);
    return { ...trip, waypoints };
  });
}
