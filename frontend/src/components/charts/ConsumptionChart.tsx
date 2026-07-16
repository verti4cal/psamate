import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DataPoint {
  label: string;
  distanceKm: number;
  energyKwh: number;
  cost: number;
}

interface ConsumptionChartProps {
  data: DataPoint[];
}

export function ConsumptionChart({ data }: ConsumptionChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Bar yAxisId="left" dataKey="distanceKm" name="Distance (km)" fill="#3b82f6" />
        <Bar yAxisId="right" dataKey="energyKwh" name="Energy (kWh)" fill="#10b981" />
      </BarChart>
    </ResponsiveContainer>
  );
}
