import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useVehicle } from "@/contexts/VehicleContext";
import { Route } from "lucide-react";
import { api } from "@/lib/api";
import type { Trip, TripWithWaypoints } from "@/lib/api";
import { TripMap } from "@/components/map/TripMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDuration, formatKm, formatKwh } from "@/lib/utils";

export function Trips() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { selectedVin } = useVehicle();

  const { data: trips = [] } = useQuery<Trip[]>({
    queryKey: ["trips", selectedVin],
    queryFn: () =>
      api.get<Trip[]>("/api/trips", { params: selectedVin ? { vin: selectedVin } : {} })
        .then((r) => r.data),
  });

  const { data: selectedTrip } = useQuery<TripWithWaypoints>({
    queryKey: ["trip", selectedId],
    queryFn: () => api.get(`/api/trips/${selectedId}`).then((r) => r.data),
    enabled: selectedId != null,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Trips</h1>

      {selectedTrip && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {formatDate(selectedTrip.startedAt)}
              {selectedTrip.endedAt && ` → ${formatDate(selectedTrip.endedAt)}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <TripMap trip={selectedTrip} />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Distance</p>
                <p className="font-semibold">{formatKm(selectedTrip.distanceKm)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-semibold">
                  {selectedTrip.endedAt
                    ? formatDuration(selectedTrip.startedAt, selectedTrip.endedAt)
                    : "In progress"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Energy</p>
                <p className="font-semibold">{formatKwh(selectedTrip.energyConsumed)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Trip History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trips.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No trips recorded yet</p>
          ) : (
            <div className="divide-y">
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  className="flex w-full items-center justify-between px-2 py-3 text-left hover:bg-accent rounded-md transition-colors"
                  onClick={() => setSelectedId(selectedId === trip.id ? null : trip.id)}
                >
                  <div>
                    <p className="font-medium">{formatDate(trip.startedAt)}</p>
                    <p className="text-sm text-muted-foreground">
                      {trip.endedAt
                        ? formatDuration(trip.startedAt, trip.endedAt)
                        : "In progress"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatKm(trip.distanceKm)}</p>
                    <p className="text-sm text-muted-foreground">{formatKwh(trip.energyConsumed)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
