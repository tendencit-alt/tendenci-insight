import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAdminAnalytics } from "@/hooks/useSaasAdmin";
import { Building2, ShieldCheck, AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function AdminQuickAccessCard() {
  const { data } = useAdminAnalytics();

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />Smart Admin
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/owner/admin">Abrir <ArrowRight className="h-3 w-3 ml-1" /></Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold">{data?.total_tenants ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Empresas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
              <ShieldCheck className="h-4 w-4" />{data?.tenants_healthy ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">Saudáveis</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-destructive flex items-center justify-center gap-1">
              <AlertTriangle className="h-4 w-4" />{data?.tenants_at_risk ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">Em risco</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
