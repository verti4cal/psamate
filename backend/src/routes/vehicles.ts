import type { FastifyInstance } from "fastify";
import { vehiclesRepository, vehicleStatusRepository } from "../db/repositories/index.js";

export async function vehicleRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/vehicles", async () => {
    return vehiclesRepository.findAll();
  });

  app.get<{ Params: { vin: string } }>("/api/vehicles/:vin/status", async (req, reply) => {
    const vehicle = vehiclesRepository.findByVin(req.params.vin);
    if (!vehicle) return reply.status(404).send({ error: "Vehicle not found" });

    const latest = vehicleStatusRepository.findLatestByVehicleId(vehicle.id);
    return latest ?? {};
  });
}
