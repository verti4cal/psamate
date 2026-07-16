import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Car, Copy, CheckCircle2, ExternalLink, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BRANDS = [
  { value: "peugeot",  label: "Peugeot" },
  { value: "citroen",  label: "Citroën" },
  { value: "ds",       label: "DS Automobiles" },
  { value: "opel",     label: "Opel" },
  { value: "vauxhall", label: "Vauxhall" },
];

const COUNTRIES = [
  { value: "DE", label: "Germany (DE)" },
  { value: "FR", label: "France (FR)" },
  { value: "GB", label: "United Kingdom (GB)" },
  { value: "ES", label: "Spain (ES)" },
  { value: "IT", label: "Italy (IT)" },
  { value: "NL", label: "Netherlands (NL)" },
  { value: "BE", label: "Belgium (BE)" },
  { value: "PT", label: "Portugal (PT)" },
  { value: "AT", label: "Austria (AT)" },
  { value: "CH", label: "Switzerland (CH)" },
  { value: "PL", label: "Poland (PL)" },
];

function CopyBox({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex items-start gap-2 rounded-md border bg-muted px-3 py-2 font-mono text-xs">
      <span className="flex-1 break-all leading-relaxed">{value}</span>
      <button
        onClick={copy}
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        title="Copy"
      >
        {copied
          ? <CheckCircle2 className="h-4 w-4 text-green-500" />
          : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

type Step = "brand" | "auth" | "code";

type ApiError = { response?: { data?: { error?: string } } };
function extractError(e: unknown, fallback: string): string {
  return (e as ApiError)?.response?.data?.error ?? fallback;
}

export function Setup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const prefillBrand = searchParams.get("brand") ?? "";
  const isReauth = searchParams.get("reauth") === "1";
  const [step, setStep] = useState<Step>("brand");
  const [brand, setBrand] = useState(prefillBrand);
  const [countryCode, setCountryCode] = useState("");
  const [authUrl, setAuthUrl] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: brandsData } = useQuery<{ connected: string[] }>({
    queryKey: ["setup-brands"],
    queryFn: () => api.get<{ connected: string[] }>("/api/setup/brands").then((r) => r.data),
  });
  const connectedBrands = brandsData?.connected ?? [];
  const selectedBrandAlreadyConnected = brand ? connectedBrands.includes(brand) : false;

  async function handleSync() {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.post<{ vehicleCount: number }>("/api/setup/sync-vehicles", { brand });
      await queryClient.invalidateQueries({ queryKey: ["setup-status"] });
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      navigate(resp.data.vehicleCount > 0 ? "/" : "/setup", { replace: true });
    } catch (e: unknown) {
      setError(extractError(e, "Sync failed."));
    } finally {
      setLoading(false);
    }
  }

  async function handleInit() {
    if (!brand || !countryCode) {
      setError("Please select a brand and country.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resp = await api.post<{ authUrl: string }>("/api/setup/init", { brand, countryCode });
      setAuthUrl(resp.data.authUrl);
      setStep("auth");
    } catch (e: unknown) {
      setError(extractError(e, "Failed to fetch credentials. Check your internet connection."));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerateUrl() {
    setLoading(true);
    try {
      const resp = await api.post<{ authUrl: string }>("/api/setup/init", {
        brand,
        countryCode,
      });
      setAuthUrl(resp.data.authUrl);
      setStep("auth");
    } catch (e: unknown) {
      setError(extractError(e, "Failed to regenerate URL."));
    } finally {
      setLoading(false);
    }
  }

  async function handleExchange() {
    if (!code.trim()) {
      setError("Please paste the authorization code.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/setup/exchange-code", { code: code.trim() });
      await queryClient.invalidateQueries({ queryKey: ["setup-status"] });
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      navigate("/", { replace: true });
    } catch (e: unknown) {
      setError(extractError(e, "Token exchange failed. The code may have expired — generate a new URL and try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Car className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Welcome to PSAmate</CardTitle>
          <CardDescription>
            Connect your Peugeot, Citroën, DS, Opel, or Vauxhall vehicle
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ── Step 1: select brand + country ─────────────────── */}
          {step === "brand" && (
            <>
              {isReauth && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Your connection has expired. Reconnect your account below to
                  resume tracking.
                </div>
              )}

              <div className="space-y-2">
                <Label>Brand</Label>
                <Select value={brand} onValueChange={setBrand}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your brand…" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANDS.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Country</Label>
                <Select onValueChange={setCountryCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your country…" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBrandAlreadyConnected && (
                <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900 space-y-2">
                  <p className="font-medium">
                    {BRANDS.find((b) => b.value === brand)?.label} is already connected.
                  </p>
                  <p>
                    Sync to import any vehicles not yet in PSAmate, or connect a
                    new account by going through the full login flow.
                  </p>
                  <Button
                    className="w-full"
                    onClick={handleSync}
                    disabled={loading}
                  >
                    {loading ? "Syncing…" : "Sync vehicles"}
                  </Button>
                </div>
              )}

              {error && (
                <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                className="w-full"
                variant={selectedBrandAlreadyConnected ? "outline" : "default"}
                onClick={handleInit}
                disabled={loading}
              >
                {loading
                  ? "Fetching credentials…"
                  : selectedBrandAlreadyConnected
                    ? "Connect a new account for this brand"
                    : "Continue"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                PSAmate downloads app credentials automatically — no developer
                portal sign-up required.
              </p>
            </>
          )}

          {/* ── Step 2: open auth URL in browser ───────────────── */}
          {step === "auth" && (
            <>
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 space-y-1">
                <p className="font-medium">How to get your authorization code</p>
                <ol className="ml-4 list-decimal space-y-1">
                  <li>
                    Open your browser's developer tools{" "}
                    <kbd className="rounded bg-blue-100 px-1 font-mono text-xs">F12</kbd>{" "}
                    and go to the <strong>Network</strong> tab.
                  </li>
                  <li>
                    Click the button below to open the login page. Log in with
                    your{" "}
                    {BRANDS.find((b) => b.value === brand)?.label} account
                    credentials (same as the mobile app).
                  </li>
                  <li>
                    After confirming, the browser will try to open a link
                    starting with{" "}
                    <code className="font-mono text-xs">
                      {brand === "peugeot" ? "mymap" :
                       brand === "citroen" ? "mymacsdk" :
                       brand === "ds" ? "mymdssdk" :
                       brand === "opel" ? "mymopsdk" : "mymvxsdk"}://
                    </code>{" "}
                    — this will fail visibly, which is expected.
                  </li>
                  <li>
                    In the Network tab find that failed request and copy the{" "}
                    <code className="font-mono text-xs">code</code> query
                    parameter from its URL.
                  </li>
                </ol>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Authorization URL
                </Label>
                <CopyBox value={authUrl} />
              </div>

              <Button className="w-full" asChild>
                <a href={authUrl} target="_blank" rel="noreferrer">
                  Open login page
                  <ExternalLink className="ml-1 h-4 w-4" />
                </a>
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setStep("code")}
              >
                I have the code →
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => { setStep("brand"); setAuthUrl(""); setError(null); }}
              >
                Back
              </Button>
            </>
          )}

          {/* ── Step 3: paste code ──────────────────────────────── */}
          {step === "code" && (
            <>
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                Paste the <code className="font-mono text-xs">code</code>{" "}
                parameter value from the redirect URL you captured in the
                Network tab. It is a 36-character UUID
                (e.g.&nbsp;<code className="font-mono text-xs">xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</code>).
              </div>

              <div className="space-y-2">
                <Label>Authorization code</Label>
                <Input
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="font-mono"
                />
              </div>

              {error && (
                <div className="space-y-2">
                  <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      setError(null);
                      setCode("");
                      await handleRegenerateUrl();
                    }}
                    disabled={loading}
                  >
                    {loading ? "Regenerating…" : "Generate a new URL and try again"}
                  </Button>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleExchange}
                disabled={loading || !!error}
              >
                {loading ? "Connecting…" : "Connect"}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => { setStep("auth"); setError(null); }}
              >
                Back
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
