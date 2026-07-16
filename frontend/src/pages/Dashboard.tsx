import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useVehicle } from "@/contexts/VehicleContext";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  Battery,
  MapPin,
  Gauge,
  Lock,
  Unlock,
  Zap,
  Car,
  Navigation,
  AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Vehicle, VehicleStatus } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPercent, formatKm } from "@/lib/utils";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export function Dashboard() {
  const wsStatuses = useWebSocket();
  const { selectedVin } = useVehicle();

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: () => api.get<Vehicle[]>("/api/vehicles").then((r) => r.data),
  });

  const vehicle = vehicles.find((v) => v.vin === selectedVin) ?? vehicles[0];

  const { data: initialStatus } = useQuery<VehicleStatus>({
    queryKey: ["vehicle-status", vehicle?.vin],
    queryFn: () =>
      api.get<VehicleStatus>(`/api/vehicles/${vehicle!.vin}/status`).then((r) => r.data),
    enabled: !!vehicle,
  });

  const status = vehicle
    ? (wsStatuses[vehicle.vin] ?? initialStatus)
    : undefined;

  if (!vehicle) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Car className="mx-auto mb-4 h-16 w-16 opacity-30" />
          <p>No vehicles found. Complete setup first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      {vehicle.needsReauth && (
        <div className="flex items-center justify-between gap-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              {vehicle.label}'s connection to {vehicle.brand} has expired.
              Polling is paused until you reconnect.
            </span>
          </div>
          <Button size="sm" variant="destructive" asChild>
            <Link to={`/setup?brand=${vehicle.brand}&reauth=1`}>Reconnect</Link>
          </Button>
        </div>
      )}
      <VehicleCard vehicle={vehicle} status={status} />
    </div>
  );
}

function VehicleCard({
  vehicle,
  status,
}: {
  vehicle: Vehicle;
  status: VehicleStatus | undefined;
}) {
  const state = (status as (VehicleStatus & { state?: string }) | undefined)?.state;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{vehicle.label}</h2>
          <p className="text-sm text-muted-foreground">{vehicle.vin}</p>
        </div>
        {state && (
          <Badge
            variant={
              state === "CHARGING"
                ? "success"
                : state === "MOVING"
                  ? "default"
                  : "secondary"
            }
          >
            {state === "CHARGING" && <Zap className="mr-1 h-3 w-3" />}
            {state === "MOVING" && <Navigation className="mr-1 h-3 w-3" />}
            {state}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Battery className="h-4 w-4" />
              Battery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercent(status?.batteryLevel)}
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${status?.batteryLevel ?? 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Gauge className="h-4 w-4" />
              Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKm(status?.rangeKm)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MapPin className="h-4 w-4" />
              Mileage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKm(status?.mileageKm)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              {status?.doorsLocked ? (
                <Lock className="h-4 w-4" />
              ) : (
                <Unlock className="h-4 w-4" />
              )}
              Doors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.doorsLocked == null ? "—" : status.doorsLocked ? "Locked" : "Unlocked"}
            </div>
          </CardContent>
        </Card>
      </div>

      {status?.latitude && status.longitude && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-64 overflow-hidden rounded-b-lg">
              <MapContainer
                center={[status.latitude, status.longitude]}
                zoom={14}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[status.latitude, status.longitude]} />
              </MapContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
