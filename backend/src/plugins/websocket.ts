import type { FastifyInstance } from "fastify";

const listeners = new Set<(data: string) => void>();

export function emitStatusUpdate(vin: string, data: Record<string, unknown>): void {
  const payload = JSON.stringify({ type: "status", vin, data });
  for (const send of listeners) {
    try {
      send(payload);
    } catch {}
  }
}

export async function registerWebSocket(app: FastifyInstance): Promise<void> {
  await app.register(import("@fastify/websocket"));

  app.get("/ws", { websocket: true }, (socket) => {
    const send = (data: string) => {
      if (socket.readyState === 1) socket.send(data);
    };
    listeners.add(send);
    socket.on("close", () => listeners.delete(send));
  });
}
