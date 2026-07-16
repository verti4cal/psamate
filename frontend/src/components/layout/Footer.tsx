import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function Footer() {
  const { data } = useQuery<{ version: string }>({
    queryKey: ["version"],
    queryFn: () => api.get<{ version: string }>("/api/version").then((r) => r.data),
    staleTime: Infinity,
  });

  return (
    <div className="border-t px-3 py-2 text-center text-xs text-muted-foreground">
      PSAmate{data ? ` v${data.version}` : ""}
    </div>
  );
}
