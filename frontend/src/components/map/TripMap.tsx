import { MapContainer, TileLayer, Polyline, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { TripWithWaypoints } from "@/lib/api";

// Fix default marker icons
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface TripMapProps {
  trip: TripWithWaypoints;
}

export function TripMap({ trip }: TripMapProps) {
  const positions = trip.waypoints.map(
    (w) => [w.lat, w.lng] as [number, number]
  );

  if (positions.length === 0) {
    if (trip.startLat && trip.startLng) {
      positions.push([trip.startLat, trip.startLng]);
    }
    if (trip.endLat && trip.endLng) {
      positions.push([trip.endLat, trip.endLng]);
    }
  }

  const center = positions[Math.floor(positions.length / 2)] ?? [0, 0];

  return (
    <div className="h-64 w-full overflow-hidden rounded-lg border">
      <MapContainer center={center} zoom={13} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {positions.length > 1 && (
          <Polyline positions={positions} color="#3b82f6" weight={3} />
        )}
        {positions[0] && <Marker position={positions[0]} />}
        {positions.length > 1 && positions[positions.length - 1] && (
          <Marker position={positions[positions.length - 1]!} />
        )}
      </MapContainer>
    </div>
  );
}
