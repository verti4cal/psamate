import { useEffect, useRef, useState } from "react";
import type { VehicleStatus } from "@/lib/api";

interface WsMessage {
  type: "status";
  vin: string;
  data: VehicleStatus;
}

type StatusMap = Record<string, VehicleStatus>;

export function useWebSocket() {
  const [statuses, setStatuses] = useState<StatusMap>({});
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${protocol}://${window.location.host}/ws`;

    function connect() {
      const socket = new WebSocket(url);
      ws.current = socket;

      socket.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data as string);
          if (msg.type === "status") {
            setStatuses((prev) => ({ ...prev, [msg.vin]: msg.data }));
          }
        } catch {}
      };

      socket.onclose = () => {
        setTimeout(connect, 3000);
      };
    }

    connect();
    return () => ws.current?.close();
  }, []);

  return statuses;
}
