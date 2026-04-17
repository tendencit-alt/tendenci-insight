import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Loader2 } from "lucide-react";
import { useSuggestionAnalytics } from "@/hooks/useAutomationSuggestions";

export function AutomationAnalyticsCard() {
  const { data, isLoading } = useSuggestionAnalytics();

  if (isLoading) {
    return <Card><CardContent className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-primary" /> Analytics de Sugestões
        </CardTitle>
        <CardDescription>Quantas sugestões foram aceitas, ignoradas ou aplicadas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(data?.byStatus || {}).map(([k, v]) => (
            <div key={k} className="p-3 rounded-lg border text-center">
              <div className="text-2xl font-bold">{v}</div>
              <div className="text-[11px] text-muted-foreground capitalize">{k}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-2">POR TIPO</div>
          <div className="space-y-1">
            {Object.entries(data?.byType || {}).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-sm p-1.5 rounded border">
                <span className="capitalize">{k.replace(/_/g, " ")}</span>
                <Badge variant="outline">{v}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-2">EVENTOS</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(data?.byEvent || {}).map(([k, v]) => (
              <Badge key={k} variant="secondary">{k}: {v}</Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
