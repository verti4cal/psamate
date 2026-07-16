import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatDate } from "@/lib/utils";
import type { VehicleStatus } from "@/lib/api";

interface SoCChartProps {
  data: VehicleStatus[];
}

export function SoCChart({ data }: SoCChartProps) {
  const chartData = data
    .filter((s) => s.batteryLevel != null)
    .map((s) => ({
      time: formatDate(s.timestamp),
      soc: s.batteryLevel,
      range: s.rangeKm,
    }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => [`${v}%`, "SoC"]} />
        <Line type="monotone" dataKey="soc" stroke="#3b82f6" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
