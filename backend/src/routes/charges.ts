import type { FastifyInstance } from "fastify";
import { chargesRepository, vehiclesRepository } from "../db/repositories/index.js";

export async function chargeRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { vin?: string; limit?: string; offset?: string } }>(
    "/api/charges",
    async (req) => {
      const limit = parseInt(req.query.limit ?? "50", 10);
      const offset = parseInt(req.query.offset ?? "0", 10);

      if (req.query.vin) {
        const vehicle = vehiclesRepository.findByVin(req.query.vin);
        if (!vehicle) return [];
        return chargesRepository.findByVehicleId(vehicle.id, limit, offset);
      }

      return chargesRepository.findAll(limit, offset);
    }
  );

  app.get<{ Params: { id: string } }>("/api/charges/:id", async (req, reply) => {
    const id = parseInt(req.params.id, 10);
    const charge = chargesRepository.findById(id);
    if (!charge) return reply.status(404).send({ error: "Charge not found" });
    return charge;
  });
}
