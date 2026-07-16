import type { FastifyInstance } from "fastify";
import { settingsRepository } from "../db/repositories/index.js";
import { testMqttConnection, connectMqtt, disconnectMqtt } from "../services/mqtt.js";

const PUBLIC_KEYS = new Set([
  "brand",
  "polling_interval_active",
  "polling_interval_parked",
  "units",
  "currency",
  "kwh_price",
  "setup_complete",
  "mqtt_enabled",
  "mqtt_host",
  "mqtt_port",
  "mqtt_username",
  "mqtt_topic_prefix",
]);

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/settings", async () => {
    const all = settingsRepository.getAll();
    return Object.fromEntries(
      Object.entries(all).filter(([key]) => PUBLIC_KEYS.has(key))
    );
  });

  app.patch<{ Body: Record<string, string> }>("/api/settings", async (req) => {
    const mqttChanged = Object.keys(req.body).some((k) => k.startsWith("mqtt_"));

    for (const [key, value] of Object.entries(req.body)) {
      if (!PUBLIC_KEYS.has(key)) continue;
      settingsRepository.set(key, String(value));
    }

    if (mqttChanged) {
      disconnectMqtt();
      await connectMqtt();
    }

    return { ok: true };
  });

  app.post<{
    Body: { host: string; port?: number; username?: string; password?: string };
  }>("/api/settings/mqtt/test", async (req) => {
    const { host, port = 1883, username, password } = req.body;
    return testMqttConnection(host, port, username, password);
  });
}
