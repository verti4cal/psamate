import type { FastifyInstance } from "fastify";
import {
  generateAuthUrl,
  exchangeCode,
  storeClientCredentials,
  realmForBrand,
  getTokenSet,
} from "../services/psa-auth.js";
import { fetchVehicles } from "../services/psa-api.js";
import { fetchCredentialsFromApk } from "../services/apk-credentials.js";
import { settingsRepository, vehiclesRepository } from "../db/repositories/index.js";
import { startPoller } from "../services/poller.js";
import { connectMqtt } from "../services/mqtt.js";

const ALL_BRANDS = ["peugeot", "citroen", "ds", "opel", "vauxhall"] as const;

export async function setupRoutes(app: FastifyInstance): Promise<void> {
  app.post<{
    Body: { brand: string; countryCode: string };
  }>("/api/setup/init", async (req, reply) => {
    const { brand, countryCode } = req.body;
    if (!brand || !countryCode)
      return reply.status(400).send({ error: "brand and countryCode are required" });

    let credentials;
    try {
      credentials = await fetchCredentialsFromApk(brand, countryCode);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(502).send({ error: `Failed to fetch APK credentials: ${msg}` });
    }

    storeClientCredentials(brand, credentials.clientId, credentials.clientSecret);

    const authUrl = generateAuthUrl(brand, countryCode);
    return { authUrl };
  });

  app.post<{ Body: { code: string } }>(
    "/api/setup/exchange-code",
    async (req, reply) => {
      const { code } = req.body;
      if (!code) return reply.status(400).send({ error: "code is required" });

      try {
        await exchangeCode(code);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return reply.status(401).send({ error: `Token exchange failed: ${msg}` });
      }

      const brand = settingsRepository.get("pending_brand") ?? "";

      let psaVehicles;
      try {
        psaVehicles = await fetchVehicles(brand);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return reply.status(502).send({ error: `Failed to fetch vehicles: ${msg}` });
      }

      for (const v of psaVehicles) {
        const isElectric =
          v.motorization?.toLowerCase().includes("electric") ||
          v._embedded?.extension?.energy?.some((e) => e.type === "Electric") ||
          false;
        vehiclesRepository.upsert({
          psaId:     v.id,
          vin:       v.vin,
          brand,
          label:     v.label ?? v.vin,
          isElectric,
          createdAt: Math.floor(Date.now() / 1000),
        });
      }

      settingsRepository.set("setup_complete", "true");

      // Start poller if not already running (safe to call multiple times)
      startPoller();
      await connectMqtt();

      return { ok: true, vehicleCount: psaVehicles.length };
    }
  );

  app.get("/api/setup/status", async () => ({
    setupComplete: settingsRepository.get("setup_complete") === "true",
  }));

  /** Returns which brands already have tokens stored. */
  app.get("/api/setup/brands", async () => ({
    connected: ALL_BRANDS.filter((b) => getTokenSet(realmForBrand(b)) !== null),
  }));

  /**
   * Re-fetch and upsert vehicles for a brand that is already authenticated,
   * without going through the OAuth flow again.
   */
  app.post<{ Body: { brand: string } }>("/api/setup/sync-vehicles", async (req, reply) => {
    const { brand } = req.body;
    if (!brand) return reply.status(400).send({ error: "brand is required" });

    if (!getTokenSet(realmForBrand(brand))) {
      return reply.status(401).send({ error: `Brand ${brand} is not authenticated yet` });
    }

    let psaVehicles;
    try {
      psaVehicles = await fetchVehicles(brand);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(502).send({ error: `Failed to fetch vehicles: ${msg}` });
    }

    for (const v of psaVehicles) {
      const isElectric =
        v.motorization?.toLowerCase().includes("electric") ||
        v._embedded?.extension?.energy?.some((e) => e.type === "Electric") ||
        false;
      vehiclesRepository.upsert({
        psaId:     v.id,
        vin:       v.vin,
        brand,
        label:     v.label ?? v.vin,
        isElectric,
        createdAt: Math.floor(Date.now() / 1000),
      });
    }

    startPoller();
    return { ok: true, vehicleCount: psaVehicles.length };
  });
}
