import type { FastifyInstance } from "fastify";
import { sendCommand } from "../services/psa-api.js";
import { vehiclesRepository } from "../db/repositories/index.js";

async function resolvePsaId(vin: string, reply: { status: (c: number) => { send: (b: unknown) => unknown } }): Promise<string | null> {
  const vehicle = vehiclesRepository.findByVin(vin);
  if (!vehicle) {
    reply.status(404).send({ error: "Vehicle not found" });
    return null;
  }
  return vehicle.psaId;
}

export async function commandRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { vin: string } }>("/api/commands/:vin/lock", async (req, reply) => {
    const psaId = await resolvePsaId(req.params.vin, reply);
    if (!psaId) return;
    await sendCommand(psaId, "Lock");
    return { ok: true };
  });

  app.post<{ Params: { vin: string } }>("/api/commands/:vin/unlock", async (req, reply) => {
    const psaId = await resolvePsaId(req.params.vin, reply);
    if (!psaId) return;
    await sendCommand(psaId, "Unlock");
    return { ok: true };
  });

  app.post<{ Params: { vin: string }; Body: { action: "start" | "stop" } }>(
    "/api/commands/:vin/climate",
    async (req, reply) => {
      const psaId = await resolvePsaId(req.params.vin, reply);
      if (!psaId) return;
      const action = req.body?.action === "stop" ? "AirConditioning_Stop" : "AirConditioning";
      await sendCommand(psaId, action);
      return { ok: true };
    }
  );

  app.post<{ Params: { vin: string } }>("/api/commands/:vin/horn", async (req, reply) => {
    const psaId = await resolvePsaId(req.params.vin, reply);
    if (!psaId) return;
    await sendCommand(psaId, "Horn");
    return { ok: true };
  });

  app.post<{ Params: { vin: string } }>("/api/commands/:vin/lights", async (req, reply) => {
    const psaId = await resolvePsaId(req.params.vin, reply);
    if (!psaId) return;
    await sendCommand(psaId, "Lights");
    return { ok: true };
  });
}
