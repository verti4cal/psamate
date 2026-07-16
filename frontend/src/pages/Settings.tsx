import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon, Wifi } from "lucide-react";
import { api } from "@/lib/api";
import type { AppSettings } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function Settings() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery<AppSettings>({
    queryKey: ["settings"],
    queryFn: () => api.get("/api/settings").then((r) => r.data),
  });

  const [form, setForm] = useState<AppSettings>({});
  const [mqttTest, setMqttTest] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: AppSettings) => api.patch("/api/settings", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });

  function set(key: keyof AppSettings, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function testMqtt() {
    setMqttTest(null);
    const resp = await api.post<{ ok: boolean; message: string }>(
      "/api/settings/mqtt/test",
      {
        host: form.mqtt_host,
        port: parseInt(form.mqtt_port ?? "1883", 10),
        username: form.mqtt_username,
      }
    );
    setMqttTest(resp.data);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>kWh Price (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.kwh_price ?? ""}
                onChange={(e) => set("kwh_price", e.target.value)}
                placeholder="0.30"
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input
                value={form.currency ?? ""}
                onChange={(e) => set("currency", e.target.value)}
                placeholder="EUR"
              />
            </div>
            <div className="space-y-2">
              <Label>Poll interval — parked (seconds)</Label>
              <Input
                type="number"
                value={form.polling_interval_parked ?? ""}
                onChange={(e) => set("polling_interval_parked", e.target.value)}
                placeholder="300"
              />
            </div>
            <div className="space-y-2">
              <Label>Poll interval — charging (seconds)</Label>
              <Input
                type="number"
                value={form.polling_interval_active ?? ""}
                onChange={(e) => set("polling_interval_active", e.target.value)}
                placeholder="60"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            MQTT / Home Assistant
          </CardTitle>
          <CardDescription>
            Publish vehicle state to an MQTT broker for Home Assistant integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={form.mqtt_enabled === "true"}
              onCheckedChange={(checked) => set("mqtt_enabled", checked ? "true" : "false")}
            />
            <Label>Enable MQTT</Label>
          </div>

          {form.mqtt_enabled === "true" && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Broker host</Label>
                  <Input
                    value={form.mqtt_host ?? ""}
                    onChange={(e) => set("mqtt_host", e.target.value)}
                    placeholder="192.168.1.100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input
                    type="number"
                    value={form.mqtt_port ?? ""}
                    onChange={(e) => set("mqtt_port", e.target.value)}
                    placeholder="1883"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    value={form.mqtt_username ?? ""}
                    onChange={(e) => set("mqtt_username", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Topic prefix</Label>
                  <Input
                    value={form.mqtt_topic_prefix ?? ""}
                    onChange={(e) => set("mqtt_topic_prefix", e.target.value)}
                    placeholder="psamate"
                  />
                </div>
              </div>
              <Button variant="outline" onClick={testMqtt}>
                Test connection
              </Button>
              {mqttTest && (
                <p
                  className={`text-sm ${mqttTest.ok ? "text-green-600" : "text-destructive"}`}
                >
                  {mqttTest.ok ? "✓" : "✗"} {mqttTest.message}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={() => saveMutation.mutate(form)}
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending ? "Saving…" : "Save settings"}
      </Button>
      {saveMutation.isSuccess && (
        <p className="text-sm text-green-600">Settings saved.</p>
      )}
    </div>
  );
}
