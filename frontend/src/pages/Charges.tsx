import { useQuery } from "@tanstack/react-query";
import { useVehicle } from "@/contexts/VehicleContext";
import { Zap } from "lucide-react";
import { api } from "@/lib/api";
import type { Charge } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDuration, formatKwh, formatPercent } from "@/lib/utils";

export function Charges() {
  const { selectedVin } = useVehicle();

  const { data: charges = [] } = useQuery<Charge[]>({
    queryKey: ["charges", selectedVin],
    queryFn: () =>
      api.get<Charge[]>("/api/charges", { params: selectedVin ? { vin: selectedVin } : {} })
        .then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Charges</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Charge Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {charges.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No charge sessions recorded yet</p>
          ) : (
            <div className="divide-y">
              {charges.map((charge) => (
                <div key={charge.id} className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{formatDate(charge.startedAt)}</p>
                      <p className="text-sm text-muted-foreground">
                        {charge.endedAt
                          ? formatDuration(charge.startedAt, charge.endedAt)
                          : "In progress"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatKwh(charge.energyAddedKwh)}</p>
                      {charge.cost != null && (
                        <p className="text-sm text-muted-foreground">
                          {charge.cost.toFixed(2)} €
                        </p>
                      )}
                    </div>
                  </div>
                  {(charge.startSoc != null || charge.endSoc != null) && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatPercent(charge.startSoc)}</span>
                        <span>{formatPercent(charge.endSoc)}</span>
                      </div>
                      <div className="relative h-2 w-full rounded-full bg-muted">
                        <div
                          className="absolute left-0 h-2 rounded-full bg-muted"
                          style={{ width: `${charge.startSoc ?? 0}%` }}
                        />
                        <div
                          className="absolute h-2 rounded-full bg-green-500"
                          style={{
                            left: `${charge.startSoc ?? 0}%`,
                            width: `${(charge.endSoc ?? 0) - (charge.startSoc ?? 0)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
