import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { VehicleProvider } from "@/contexts/VehicleContext";
import { AppShell } from "@/components/layout/AppShell";
import { Setup } from "@/pages/Setup";
import { Dashboard } from "@/pages/Dashboard";
import { Trips } from "@/pages/Trips";
import { Charges } from "@/pages/Charges";
import { Statistics } from "@/pages/Statistics";
import { Commands } from "@/pages/Commands";
import { Schedule } from "@/pages/Schedule";
import { Settings } from "@/pages/Settings";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

function AppRoutes() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["setup-status"],
    queryFn: () =>
      api.get<{ setupComplete: boolean }>("/api/setup/status").then((r) => r.data),
  });

  useEffect(() => {
    if (!isLoading && data && !data.setupComplete) {
      navigate("/setup", { replace: true });
    }
  }, [data, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!data?.setupComplete) {
    return null;
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/trips" element={<Trips />} />
        <Route path="/charges" element={<Charges />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="/commands" element={<Commands />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <VehicleProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/setup" element={<Setup />} />
          <Route path="*" element={<AppRoutes />} />
        </Routes>
      </BrowserRouter>
      </VehicleProvider>
    </QueryClientProvider>
  );
}
