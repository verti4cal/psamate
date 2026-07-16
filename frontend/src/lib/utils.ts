import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

export function formatDuration(startTs: number, endTs: number): string {
  const secs = endTs - startTs;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatKm(km: number | null | undefined): string {
  if (km == null) return "—";
  return `${km.toFixed(1)} km`;
}

export function formatKwh(kwh: number | null | undefined): string {
  if (kwh == null) return "—";
  return `${kwh.toFixed(2)} kWh`;
}

export function formatPercent(pct: number | null | undefined): string {
  if (pct == null) return "—";
  return `${Math.round(pct)}%`;
}
