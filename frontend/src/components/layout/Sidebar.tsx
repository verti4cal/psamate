import { useEffect } from "react";
import { NavLink, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Route,
  Zap,
  BarChart3,
  Radio,
  Calendar,
  Settings,
  Car,
  PlusCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { Vehicle } from "@/lib/api";
import { useVehicle } from "@/contexts/VehicleContext";

const navItems = [
  { to: "/",           icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/trips",      icon: Route,           label: "Trips" },
  { to: "/charges",    icon: Zap,             label: "Charges" },
  { to: "/statistics", icon: BarChart3,       label: "Statistics" },
  { to: "/commands",   icon: Radio,           label: "Commands" },
  { to: "/schedule",   icon: Calendar,        label: "Schedule" },
  { to: "/settings",   icon: Settings,        label: "Settings" },
];

export function Sidebar() {
  const { selectedVin, setSelectedVin } = useVehicle();

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: () => api.get<Vehicle[]>("/api/vehicles").then((r) => r.data),
  });

  // Auto-select first vehicle when list loads and nothing is selected yet
  useEffect(() => {
    if (vehicles.length > 0 && !selectedVin) {
      setSelectedVin(vehicles[0]!.vin);
    }
    // If the stored VIN no longer exists (e.g. after reset), fall back to first
    if (
      vehicles.length > 0 &&
      selectedVin &&
      !vehicles.find((v) => v.vin === selectedVin)
    ) {
      setSelectedVin(vehicles[0]!.vin);
    }
  }, [vehicles, selectedVin, setSelectedVin]);

  return (
    <aside className="flex w-56 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <Car className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">PSAmate</span>
      </div>

      {/* Vehicle selector */}
      {vehicles.length > 0 && (
        <div className="border-b px-3 py-3">
          {vehicles.length === 1 ? (
            <div className="flex items-center gap-2 px-1 text-sm font-medium">
              <Car className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{vehicles[0]!.label}</span>
              {vehicles[0]!.needsReauth && (
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
              )}
            </div>
          ) : (
            <Select
              value={selectedVin ?? ""}
              onValueChange={setSelectedVin}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.vin} value={v.vin}>
                    <span className="flex items-center gap-2">
                      {v.label}
                      {v.needsReauth && (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}

        {/* Add vehicle */}
        <div className="mt-auto pt-2">
          <Separator className="mb-2" />
          <Link
            to="/setup"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Add vehicle
          </Link>
        </div>
      </nav>
    </aside>
  );
}
