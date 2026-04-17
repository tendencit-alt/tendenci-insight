import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, ShieldAlert, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Lock } from "lucide-react";
import { useStabilityGates, type GateStatus, type StabilityGate } from "@/hooks/useStabilityGates";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_CFG: Record<GateStatus, { label: string; className: string; icon: any }> = {
  green: { label: "Safe", className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", icon: CheckCircle2 },
  yellow: { label: "Warning", className: "bg-amber-500/15 text-amber-700 border-amber-500/30", icon: AlertTriangle },
  red: { label: "Blocking", className: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle },
};

const KPI = ({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "ok" | "warn" | "bad" }) => {
  const toneCls = tone === "ok" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : tone === "bad" ? "text-destructive" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`mt-1 text-2xl font-semibold ${toneCls}`}>{value}</div>
      </CardContent>
    </Card>
  );
};

export default function OwnerStabilityGates() {
  const { gates, summary, evaluations, isLoading, evaluate } = useStabilityGates();
  const [selected, setSelected] = useState<StabilityGate | null>(null);

  const blocking = summary?.blocking ?? 0;
  const canRelease = summary?.can_release ?? false;
  const selectedHistory = selected
    ? evaluations.filter((e) => e.gate_code === selected.gate_code).slice(0, 20)
    : [];

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Stability Gates</h1>
            <p className="text-sm text-muted-foreground">
              Validação estrutural automática antes de releases, rollouts e mudanças críticas.
            </p>
          </div>
        </div>
        <Button onClick={() => evaluate.mutate()} disabled={evaluate.isPending} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${evaluate.isPending ? "animate-spin" : ""}`} />
          Re-avaliar gates
        </Button>
      </div>

      {/* Banner principal */}
      {blocking > 0 ? (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertTitle>Stability gate blocking release execution</AlertTitle>
          <AlertDescription>
            {blocking} gate(s) bloqueando releases, rollouts e ativações. Resolva antes de prosseguir.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-emerald-500/30 bg-emerald-500/5">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="text-emerald-700">Sistema liberado para releases</AlertTitle>
          <AlertDescription>Todos os gates estão verdes. Releases e rollouts podem ser executados com segurança.</AlertDescription>
        </Alert>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KPI label="Total de gates" value={summary?.total ?? "—"} />
        <KPI label="Safe" value={summary?.green ?? "—"} tone="ok" />
        <KPI label="Warning" value={summary?.yellow ?? "—"} tone={(summary?.yellow ?? 0) > 0 ? "warn" : "ok"} />
        <KPI label="Blocking" value={summary?.red ?? "—"} tone={(summary?.red ?? 0) > 0 ? "bad" : "ok"} />
        <KPI label="Can release" value={canRelease ? "Sim" : "Não"} tone={canRelease ? "ok" : "bad"} />
      </div>

      {/* Tabela de gates */}
      <Card>
        <CardHeader>
          <CardTitle>Gates ativos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gate</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Razão</TableHead>
                <TableHead className="text-center">Bloqueios</TableHead>
                <TableHead>Última verificação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              )}
              {!isLoading && gates.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum gate registrado</TableCell></TableRow>
              )}
              {gates.map((g) => {
                const cfg = STATUS_CFG[g.gate_status];
                const Icon = cfg.icon;
                return (
                  <TableRow key={g.id} className="cursor-pointer" onClick={() => setSelected(g)}>
                    <TableCell>
                      <div className="font-medium">{g.gate_name}</div>
                      <div className="text-xs text-muted-foreground">{g.gate_code}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{g.gate_type}</Badge></TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cfg.className}>
                        <Icon className="mr-1 h-3 w-3" />
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate text-xs text-muted-foreground">{g.last_reason ?? "—"}</TableCell>
                    <TableCell className="text-center text-xs tabular-nums">
                      {g.last_blocking_count > 0 ? (
                        <Badge variant="destructive">{g.last_blocking_count}</Badge>
                      ) : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {g.last_checked_at ? formatDistanceToNow(new Date(g.last_checked_at), { addSuffix: true, locale: ptBR }) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Drill-down */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selected.gate_name}
                  <Badge variant="outline" className={STATUS_CFG[selected.gate_status].className}>
                    {STATUS_CFG[selected.gate_status].label}
                  </Badge>
                </SheetTitle>
                <SheetDescription>{selected.gate_description}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <section>
                  <h3 className="mb-2 text-sm font-semibold">Estado atual</h3>
                  <div className="rounded border border-border/50 p-3">
                    <div className="text-xs text-muted-foreground">Razão</div>
                    <div className="text-sm">{selected.last_reason ?? "—"}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Bloqueios detectados</span>
                      <Badge variant={selected.is_blocking ? "destructive" : "outline"}>
                        {selected.last_blocking_count}
                      </Badge>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="mb-2 text-sm font-semibold">Histórico ({selectedHistory.length})</h3>
                  <div className="space-y-1">
                    {selectedHistory.length === 0 && <div className="text-xs text-muted-foreground">Sem avaliações registradas.</div>}
                    {selectedHistory.map((e) => {
                      const cfg = STATUS_CFG[e.evaluation_result];
                      return (
                        <div key={e.id} className="flex items-start justify-between rounded border border-border/50 p-2 text-xs">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
                              <span className="text-muted-foreground">
                                {formatDistanceToNow(new Date(e.evaluated_at), { addSuffix: true, locale: ptBR })}
                              </span>
                            </div>
                            <div className="mt-1 text-muted-foreground">{e.evaluation_reason}</div>
                          </div>
                          {e.blocking_count > 0 && <Badge variant="destructive">{e.blocking_count}</Badge>}
                        </div>
                      );
                    })}
                  </div>
                </section>

                {selected.is_blocking && (
                  <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Gate bloqueando</AlertTitle>
                    <AlertDescription>
                      Releases, rollouts e ativações de módulo serão cancelados enquanto este gate estiver vermelho.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
