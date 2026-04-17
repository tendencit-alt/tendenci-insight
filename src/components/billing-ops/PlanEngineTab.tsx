import { useState } from "react";
import { usePlansWithDetails } from "@/hooks/useBillingData";
import { usePlanVersions } from "@/hooks/useBillingOps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, History, CreditCard } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function PlanEngineTab() {
  const { data: plans, isLoading } = usePlansWithDetails();
  const [openVersionsFor, setOpenVersionsFor] = useState<string | null>(null);
  const { data: versions } = usePlanVersions(openVersionsFor ?? undefined);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Plan Engine</h2>
        <p className="text-sm text-muted-foreground">{plans?.length ?? 0} planos configurados</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(plans ?? []).map((p: any) => (
          <Card key={p.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4" />{p.name}</CardTitle>
                <Badge variant="outline">v{p.version_current ?? 1}</Badge>
              </div>
              <p className="text-2xl font-bold">R$ {Number(p.price ?? 0).toFixed(2)}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Limites</p>
                <div className="space-y-1">
                  {(p.limits ?? []).slice(0, 5).map((l: any) => (
                    <div key={l.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{l.metric_name}</span>
                      <span className="font-medium">{l.limit_value > 0 ? l.limit_value.toLocaleString("pt-BR") : "∞"}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Features</p>
                <div className="flex flex-wrap gap-1">
                  {(p.features ?? []).slice(0, 6).map((f: any) => (
                    <Badge key={f.id} variant="secondary" className="text-xs">{f.feature_name}</Badge>
                  ))}
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setOpenVersionsFor(p.id)}>
                <History className="h-4 w-4" />Ver histórico
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet open={!!openVersionsFor} onOpenChange={(o) => !o && setOpenVersionsFor(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>Histórico de versões</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-3">
            {(versions ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma versão anterior. Mudanças no plano serão registradas aqui.</p>
            ) : (versions ?? []).map((v: any) => (
              <Card key={v.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge>v{v.version_number}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{v.changelog ?? "Atualização"}</p>
                  <pre className="mt-2 text-xs bg-muted/50 p-2 rounded overflow-x-auto">
                    Preço: R$ {Number(v.snapshot?.price ?? 0).toFixed(2)} | Anual: R$ {Number(v.snapshot?.yearly_price ?? 0).toFixed(2)}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
