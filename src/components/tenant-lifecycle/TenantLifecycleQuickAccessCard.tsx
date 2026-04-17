import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLifecycleOverview } from "@/hooks/useTenantLifecycle";

export function TenantLifecycleQuickAccessCard() {
  const navigate = useNavigate();
  const { data } = useLifecycleOverview();
  const rows = data ?? [];
  const churnHigh = rows.filter((r) => r.churn_risk_band === "alto").length;
  const expansion = rows.filter((r) => r.expansion_ready_score >= 70).length;
  const avgHealth = rows.length ? Math.round(rows.reduce((a, b) => a + b.lifecycle_health_index, 0) / rows.length) : 0;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/owner/lifecycle")}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2"><Heart className="h-4 w-4 text-primary" /> Tenant Lifecycle</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-2 text-center">
        <div><div className="text-xl font-semibold tabular-nums">{avgHealth}%</div><div className="text-[10px] text-muted-foreground">Health médio</div></div>
        <div><div className="text-xl font-semibold tabular-nums text-primary">{expansion}</div><div className="text-[10px] text-muted-foreground">Upgrade ready</div></div>
        <div><div className="text-xl font-semibold tabular-nums text-destructive">{churnHigh}</div><div className="text-[10px] text-muted-foreground">Churn alto</div></div>
      </CardContent>
    </Card>
  );
}
