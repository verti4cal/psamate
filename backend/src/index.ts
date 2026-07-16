import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import cron from "node-cron";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { registerWebSocket } from "./plugins/websocket.js";
import { setupRoutes } from "./routes/setup.js";
import { vehicleRoutes } from "./routes/vehicles.js";
import { tripRoutes } from "./routes/trips.js";
import { chargeRoutes } from "./routes/charges.js";
import { commandRoutes } from "./routes/commands.js";
import { statsRoutes } from "./routes/stats.js";
import { settingsRoutes } from "./routes/settings.js";
import { refreshAllTokens } from "./services/psa-auth.js";
import { settingsRepository } from "./db/repositories/index.js";
import { startPoller } from "./services/poller.js";
import { connectMqtt } from "./services/mqtt.js";
import { appVersion } from "./version.js";

const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" } });

await app.register(cors, { origin: true });
await registerWebSocket(app);

await setupRoutes(app);
await vehicleRoutes(app);
await tripRoutes(app);
await chargeRoutes(app);
await commandRoutes(app);
await statsRoutes(app);
await settingsRoutes(app);

app.get("/api/version", async () => ({ version: appVersion }));

// Serve the built frontend when bundled alongside the backend in the
// combined production image. In dev, WEB_DIST_PATH is unset and Vite
// serves the frontend separately, so this is skipped entirely.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDistPath = process.env.WEB_DIST_PATH ?? path.join(__dirname, "../web-dist");
if (fs.existsSync(webDistPath)) {
  await app.register(fastifyStatic, { root: webDistPath });
  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url?.startsWith("/api") || req.raw.url === "/ws") {
      reply.code(404).send({ error: "Not found" });
      return;
    }
    reply.sendFile("index.html");
  });
}

// Token refresh every 5 minutes
cron.schedule("*/5 * * * *", () => refreshAllTokens().catch(console.error));

// Auto-start poller + MQTT if already set up
const setupComplete = settingsRepository.get("setup_complete");
if (setupComplete === "true") {
  startPoller();
  await connectMqtt();
}

const host = process.env.HOST ?? "0.0.0.0";
const port = parseInt(process.env.PORT ?? "3000", 10);
await app.listen({ host, port });
console.log(`PSAmate backend listening on ${host}:${port}`);
