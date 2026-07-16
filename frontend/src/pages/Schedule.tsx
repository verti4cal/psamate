import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export function Schedule() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Schedule</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Charge & Climate Scheduling
          </CardTitle>
          <CardDescription>
            Schedule charge windows and climate pre-conditioning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-8 text-center">
            Scheduling support coming soon — the PSA API charge scheduling
            endpoints will be integrated here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
