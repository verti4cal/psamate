import { useState } from "react";
import { useVehicle } from "@/contexts/VehicleContext";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { api } from "@/lib/api";
import type { Stats } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConsumptionChart } from "@/components/charts/ConsumptionChart";
import { formatKm, formatKwh } from "@/lib/utils";

type Period = "week" | "month" | "year";

export function Statistics() {
  const [period, setPeriod] = useState<Period>("month");
  const { selectedVin } = useVehicle();

  const { data: stats } = useQuery<Stats>({
    queryKey: ["stats", period, selectedVin],
    queryFn: () =>
      api.get<Stats>("/api/stats", {
        params: { period, ...(selectedVin ? { vin: selectedVin } : {}) },
      }).then((r) => r.data),
  });

  const chartData = stats
    ? [
        {
          label: period,
          distanceKm: stats.trips.distanceKm,
          energyKwh: stats.charges.energyAddedKwh,
          cost: stats.charges.cost,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Statistics</h1>
        <div className="flex gap-2">
          {(["week", "month", "year"] as Period[]).map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Trips</p>
            <p className="text-3xl font-bold">{stats?.trips.count ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Distance</p>
            <p className="text-3xl font-bold">{formatKm(stats?.trips.distanceKm)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Energy Added</p>
            <p className="text-3xl font-bold">{formatKwh(stats?.charges.energyAddedKwh)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Charge Cost</p>
            <p className="text-3xl font-bold">
              {stats?.charges.cost != null ? `${stats.charges.cost.toFixed(2)} €` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Distance & Energy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ConsumptionChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  );
}
