import { useDunningSteps, useDetectDunning, useExecuteDunningStep } from "@/hooks/useBillingOps";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Building2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

const levelColors: Record<string, string> = {
  friendly_alert: "bg-blue-500/10 text-blue-500",
  reinforced_alert: "bg-yellow-500/10 text-yellow-500",
  partial_block: "bg-orange-500/10 text-orange-500",
  premium_block: "bg-red-500/10 text-red-500",
  full_suspension: "bg-red-700/10 text-red-700",
};

const levelLabels: Record<string, string> = {
  friendly_alert: "Alerta amigável",
  reinforced_alert: "Alerta reforçado",
  partial_block: "Bloqueio parcial",
  premium_block: "Bloqueio premium",
  full_suspension: "Suspensão total",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500",
  executed: "bg-blue-500/10 text-blue-500",
  cancelled: "bg-muted text-muted-foreground",
  resolved: "bg-green-500/10 text-green-500",
};

export function InadimplenciaTab() {
  const { data, isLoading } = useDunningSteps();
  const detect = useDetectDunning();
  const exec = useExecuteDunningStep();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-500" />Inadimplência Intelligence</h2>
          <p className="text-sm text-muted-foreground">Escalonamento automático: amigável (D+3) → reforçado (D+7) → bloqueio parcial (D+14) → premium (D+21) → suspensão (D+30)</p>
        </div>
        <Button variant="outline" onClick={() => detect.mutate()} disabled={detect.isPending} className="gap-2">
          {detect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Rodar detecção
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Detectado</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : !data?.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma inadimplência registrada</TableCell></TableRow>
              ) : data.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{d.tenants?.name ?? "—"}</div>
                  </TableCell>
                  <TableCell><Badge className={levelColors[d.step_level]}>{levelLabels[d.step_level]}</Badge></TableCell>
                  <TableCell className="text-sm">{d.reason}</TableCell>
                  <TableCell className="text-sm">{new Date(d.triggered_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell><Badge className={statusColors[d.status]}>{d.status}</Badge></TableCell>
                  <TableCell>
                    {d.status === "pending" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => exec.mutate({ stepId: d.id, action: "execute" })}>Executar</Button>
                        <Button size="sm" variant="ghost" onClick={() => exec.mutate({ stepId: d.id, action: "resolve" })}><CheckCircle2 className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => exec.mutate({ stepId: d.id, action: "cancel" })}><XCircle className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
