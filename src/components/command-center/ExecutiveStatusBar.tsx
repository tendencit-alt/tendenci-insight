import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompanyStatus } from "@/hooks/useCompanyStatus";
import { TrendingUp, TrendingDown, Minus, HeartPulse } from "lucide-react";
import { ExecutiveKpiDrilldown, type KpiKey } from "./ExecutiveKpiDrilldown";

export function ExecutiveStatusBar() {
  const { data: companyStatus, isLoading } = useCompanyStatus();
  const [openKey, setOpenKey] = useState<KpiKey | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-[72px] rounded-xl" />)}
      </div>
    );
  }

  if (!companyStatus) return null;

  const kpis: { key: KpiKey; kpi: typeof companyStatus.cashBalance }[] = [
    { key: "cashBalance", kpi: companyStatus.cashBalance },
    { key: "monthlyResult", kpi: companyStatus.monthlyResult },
    { key: "openOrders", kpi: companyStatus.openOrders },
    { key: "overduePayables", kpi: companyStatus.overduePayables },
    { key: "goalProgress", kpi: companyStatus.goalProgress },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
          <HeartPulse className="h-3.5 w-3.5 text-primary" /> Status Executivo
        </h2>
        <Badge
          variant="outline"
          className={`text-[9px] gap-1 ${
            companyStatus.health === "estavel"
              ? "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
              : companyStatus.health === "atencao"
              ? "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400"
              : "border-red-300 text-red-700 dark:border-red-700 dark:text-red-400"
          }`}
        >
          <div className={`h-1.5 w-1.5 rounded-full ${
            companyStatus.health === "estavel" ? "bg-emerald-500"
            : companyStatus.health === "atencao" ? "bg-amber-500" : "bg-red-500"
          }`} />
          {companyStatus.health === "estavel" ? "Estável" : companyStatus.health === "atencao" ? "Atenção" : "Risco"}
          {` · ${companyStatus.healthScore}pts`}
        </Badge>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {kpis.map(({ key, kpi }) => {
          const TrendIcon = kpi.trend === "up" ? TrendingUp : kpi.trend === "down" ? TrendingDown : Minus;
          const trendColor = kpi.trend === "up" ? "text-emerald-600 dark:text-emerald-400" : kpi.trend === "down" ? "text-red-500 dark:text-red-400" : "text-muted-foreground";
          return (
            <Card
              key={kpi.label}
              role="button"
              tabIndex={0}
              onClick={() => setOpenKey(key)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenKey(key); } }}
              className="border-border/60 cursor-pointer hover:shadow-md hover:border-primary/40 transition-all"
              title="Clique para ver a composição"
            >
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{kpi.label}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <p className="text-sm font-bold truncate">{kpi.formatted}</p>
                  <TrendIcon className={`h-3 w-3 shrink-0 ${trendColor}`} />
                </div>
                {kpi.trendLabel && (
                  <p className={`text-[9px] mt-0.5 ${trendColor}`}>{kpi.trendLabel}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ExecutiveKpiDrilldown
        kpiKey={openKey}
        open={!!openKey}
        onOpenChange={(o) => { if (!o) setOpenKey(null); }}
      />
    </div>
  );
}
