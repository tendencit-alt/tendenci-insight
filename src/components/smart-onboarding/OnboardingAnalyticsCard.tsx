import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Loader2 } from "lucide-react";
import { useOnboardingAnalyticsSummary } from "@/hooks/useOnboardingAnalytics";

export function OnboardingAnalyticsCard() {
  const { data, isLoading } = useOnboardingAnalyticsSummary();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const steps = Object.entries(data?.byStep || {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-primary" />
          Onboarding Analytics
        </CardTitle>
        <CardDescription>Etapas, conclusões e abandono</CardDescription>
      </CardHeader>
      <CardContent>
        {steps.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sem eventos registrados</p>
        ) : (
          <div className="space-y-2">
            {steps.map(([key, s]) => (
              <div key={key} className="flex items-center justify-between p-2 rounded-md border">
                <span className="text-sm font-medium capitalize">{key.replace(/_/g, " ")}</span>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Badge variant="outline">✓ {s.completed}</Badge>
                  <Badge variant="outline">→ {s.started}</Badge>
                  {s.skipped > 0 && <Badge variant="outline">↷ {s.skipped}</Badge>}
                  {s.abandoned > 0 && <Badge variant="destructive">✗ {s.abandoned}</Badge>}
                  {s.avgDuration > 0 && <Badge variant="secondary">{s.avgDuration}s</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
