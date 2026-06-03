import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, AlertTriangle, ChevronRight } from "lucide-react";
import { useNotificationIntelligence } from "@/hooks/useNotificationIntelligence";
import { cn } from "@/lib/utils";

export function NotificationSummaryWidget({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { dailySummary, criticalCount, notifications, isLoading } = useNotificationIntelligence();

  if (isLoading) return null;

  const summary = dailySummary;
  const criticalNotifs = notifications.filter(n => !n.is_read && (n.priority === "critica" || n.priority === "urgente")).slice(0, 3);

  const hasContent = (summary && summary.totalCritico > 0) || criticalNotifs.length > 0;
  if (!hasContent) return null;

  return (
    <Card className={cn("border-destructive/30", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bell className="h-4 w-4 text-destructive" />
          Alertas Operacionais
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-[10px] h-4 animate-pulse">
              {criticalCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {/* Summary counts */}
        {summary && (
          <div className="grid grid-cols-2 gap-1.5">
            {summary.contasVencidas > 0 && (
              <SummaryItem label="Contas vencidas" count={summary.contasVencidas} critical onClick={() => navigate("/contas-pagar")} />
            )}
            {summary.pedidosAguardando > 0 && (
              <SummaryItem label="Pedidos aguardando" count={summary.pedidosAguardando} onClick={() => navigate("/pedidos")} />
            )}
            {summary.ordensAtrasadas > 0 && (
              <SummaryItem label="OPs atrasadas" count={summary.ordensAtrasadas} onClick={() => navigate("/producao-operacoes")} />
            )}
          </div>
        )}

        {/* Critical notifications */}
        {criticalNotifs.length > 0 && (
          <div className="space-y-1 pt-1 border-t">
            {criticalNotifs.map(n => (
              <button
                key={n.id}
                onClick={() => n.link_path && navigate(n.link_path)}
                className="w-full text-left flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 transition-colors"
              >
                <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                <span className="text-xs truncate flex-1">{n.title}</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryItem({ label, count, critical, onClick }: { label: string; count: number; critical?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left p-1.5 rounded text-[11px] hover:bg-muted transition-colors",
        critical && "bg-destructive/10"
      )}
    >
      <span className="font-bold text-sm">{count}</span>
      <span className="block text-muted-foreground">{label}</span>
    </button>
  );
}
