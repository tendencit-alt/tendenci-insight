import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert, TrendingUp, Lock } from "lucide-react";
import { useDenialAnalytics } from "@/hooks/usePermissionDenials";
import { usePermissionCatalog } from "@/hooks/usePermissionCatalog";

const moduleLabels: Record<string, string> = {
  financeiro: "Financeiro",
  dre: "DRE",
  fluxo_caixa: "Fluxo de Caixa",
  cadastros: "Cadastros",
  pedidos: "Pedidos",
  planning: "Planejamento",
  integracoes: "Integrações",
  permissoes: "Permissões",
  auditoria: "Auditoria",
  relatorios: "KPI's",
};

export function PermissionAnalyticsCard({ sinceDays = 30 }: { sinceDays?: number }) {
  const { isLoading, total, topPermissions, topModules } = useDenialAnalytics(sinceDays);
  const { data: catalog } = usePermissionCatalog();

  const labelFor = (key: string) =>
    catalog?.find((c) => c.permission_key === key)?.label ?? key;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> Analytics de permissões
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" />
          Analytics de permissões · últimos {sinceDays}d
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold">{total}</span>
          <span className="text-xs text-muted-foreground">tentativas bloqueadas</span>
        </div>

        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
            <Lock className="h-3 w-3" /> Permissões mais negadas
          </h4>
          {topPermissions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum bloqueio recente.</p>
          ) : (
            <div className="space-y-1">
              {topPermissions.map(([key, count]) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="truncate">{labelFor(key)}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Módulos mais restritos
          </h4>
          {topModules.length === 0 ? (
            <p className="text-xs text-muted-foreground">—</p>
          ) : (
            <div className="flex gap-1.5 flex-wrap">
              {topModules.map(([mod, count]) => (
                <Badge key={mod} variant="outline" className="text-[10px]">
                  {moduleLabels[mod] ?? mod} · {count}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
