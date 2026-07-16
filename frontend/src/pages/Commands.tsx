import { Radio, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Commands() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Remote Commands</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Vehicle Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">Remote commands are not yet available</p>
              <p>
                The PSA Connected Car API requires a separate{" "}
                <strong>virtualkey remote-access token</strong> and an{" "}
                <strong>MQTT connection to PSA's broker</strong> to send
                commands. These require extracting the PKCS#12 client
                certificate from the brand APK — a step beyond the current
                OAuth setup.
              </p>
              <p className="pt-1">
                Lock/unlock, climate pre-conditioning, horn, and lights will be
                available once the MQTT remote-access flow is implemented.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
