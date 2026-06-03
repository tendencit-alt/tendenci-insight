import { CriticalAlert } from "@/hooks/useCentralOperacional";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Ban, CreditCard, FileWarning, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ICON_MAP: Record<string, any> = {
  overdue_payment: CreditCard,
  stalled_order: Ban,
  late_production: AlertTriangle,
  goal_risk: Target,
  missing_doc: FileWarning,
};

interface Props {
  alerts: CriticalAlert[];
  loading: boolean;
}

export function CriticalAlertsBlock({ alerts, loading }: Props) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card className="border-destructive/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Pendências Críticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">✅ Nenhuma pendência crítica</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive animate-pulse" />
          Pendências Críticas
          <Badge variant="destructive" className="ml-auto text-xs">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[220px]">
          <div className="space-y-2">
            {alerts.map((alert) => {
              const Icon = ICON_MAP[alert.type] || AlertTriangle;
              return (
                <div
                  key={alert.id}
                  onClick={() => alert.link && navigate(alert.link)}
                  className="flex items-start gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 cursor-pointer transition-colors"
                >
                  <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${alert.severity === "critical" ? "text-destructive" : "text-orange-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{alert.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{alert.description}</p>
                  </div>
                  {alert.amount && (
                    <span className="text-xs font-semibold text-destructive whitespace-nowrap">
                      R$ {alert.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
