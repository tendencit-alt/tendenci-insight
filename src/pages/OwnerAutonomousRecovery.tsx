import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wrench, RefreshCw, CheckCircle2, XCircle, Clock, Lock, Zap, AlertTriangle, PlayCircle } from "lucide-react";
import { useAutonomousRecovery, type RecoveryPolicy } from "@/hooks/useAutonomousRecovery";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const KPI = ({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "ok" | "warn" | "bad" }) => {
  const cls = tone === "ok" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : tone === "bad" ? "text-destructive" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`mt-1 text-2xl font-semibold ${cls}`}>{value}</div>
      </CardContent>
    </Card>
  );
};

const resultBadge = (result: string | null) => {
  if (result === "success") return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30"><CheckCircle2 className="mr-1 h-3 w-3" />success</Badge>;
  if (result === "failed") return <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30"><XCircle className="mr-1 h-3 w-3" />failed</Badge>;
  return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />never</Badge>;
};

export default function OwnerAutonomousRecovery() {
  const { policies, summary, history, isLoading, executePolicy, runSweep } = useAutonomousRecovery();
  const [selected, setSelected] = useState<RecoveryPolicy | null>(null);

  const failedToday = summary?.failed_today ?? 0;
  const selectedHistory = selected
    ? history.filter((h) => h.policy_code === selected.policy_code).slice(0, 25)
    : [];

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Wrench className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Autonomous Recovery</h1>
            <p className="text-sm text-muted-foreground">
              Motor de autocorreção de falhas estruturais, integrações, snapshots, rotas e menus.
            </p>
          </div>
        </div>
        <Button onClick={() => runSweep.mutate()} disabled={runSweep.isPending}>
          <Zap className={`mr-2 h-4 w-4 ${runSweep.isPending ? "animate-pulse" : ""}`} />
          Executar sweep autônomo
        </Button>
      </div>

      {failedToday > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{failedToday} recovery(ies) falharam hoje</AlertTitle>
          <AlertDescription>
            Verifique o histórico de cada policy e revise os logs antes de re-executar.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <KPI label="Hoje" value={summary?.executed_today ?? "—"} />
        <KPI label="Sucesso" value={summary?.success_today ?? "—"} tone="ok" />
        <KPI label="Falhas" value={summary?.failed_today ?? "—"} tone={failedToday > 0 ? "bad" : "ok"} />
        <KPI label="Auto policies" value={summary?.auto_policies ?? "—"} />
        <KPI label="Aguardando aprovação" value={summary?.pending_approval ?? "—"} tone={(summary?.pending_approval ?? 0) > 0 ? "warn" : "ok"} />
        <KPI label="Total" value={summary?.total_policies ?? "—"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Policies de recuperação</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Escopo</TableHead>
                <TableHead className="text-center">Modo</TableHead>
                <TableHead>Último resultado</TableHead>
                <TableHead>Última execução</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              )}
              {!isLoading && policies.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhuma policy registrada</TableCell></TableRow>
              )}
              {policies.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => setSelected(p)}>
                  <TableCell>
                    <div className="font-medium">{p.policy_name}</div>
                    <div className="text-xs text-muted-foreground">{p.policy_code}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{p.policy_type}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.recovery_scope}</TableCell>
                  <TableCell className="text-center">
                    {p.is_auto_execute && !p.requires_owner_approval ? (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30"><Zap className="mr-1 h-3 w-3" />auto</Badge>
                    ) : p.requires_owner_approval ? (
                      <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-500/30"><Lock className="mr-1 h-3 w-3" />approval</Badge>
                    ) : (
                      <Badge variant="outline">manual</Badge>
                    )}
                  </TableCell>
                  <TableCell>{resultBadge(p.last_result)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.last_executed_at ? formatDistanceToNow(new Date(p.last_executed_at), { addSuffix: true, locale: ptBR }) : "—"}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!p.is_enabled || executePolicy.isPending}
                      onClick={() => executePolicy.mutate(p.policy_code)}
                    >
                      <PlayCircle className="mr-1 h-3 w-3" />
                      Executar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico recente</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Policy</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Razão</TableHead>
                <TableHead className="text-right">Duração</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sem execuções registradas</TableCell></TableRow>
              )}
              {history.slice(0, 20).map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(h.executed_at), { addSuffix: true, locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-xs">{h.policy_code}</TableCell>
                  <TableCell>{resultBadge(h.execution_result)}</TableCell>
                  <TableCell className="max-w-md truncate text-xs text-muted-foreground">{h.execution_reason}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{h.duration_ms ?? 0}ms</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selected.policy_name}
                  {resultBadge(selected.last_result)}
                </SheetTitle>
                <SheetDescription>{selected.policy_description}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <section>
                  <h3 className="mb-2 text-sm font-semibold">Configuração</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded border border-border/50 p-2">
                      <div className="text-muted-foreground">Tipo</div>
                      <div className="font-medium">{selected.policy_type}</div>
                    </div>
                    <div className="rounded border border-border/50 p-2">
                      <div className="text-muted-foreground">Escopo</div>
                      <div className="font-medium">{selected.recovery_scope}</div>
                    </div>
                    <div className="rounded border border-border/50 p-2">
                      <div className="text-muted-foreground">Auto execute</div>
                      <div className="font-medium">{selected.is_auto_execute ? "Sim" : "Não"}</div>
                    </div>
                    <div className="rounded border border-border/50 p-2">
                      <div className="text-muted-foreground">Aprovação owner</div>
                      <div className="font-medium">{selected.requires_owner_approval ? "Sim" : "Não"}</div>
                    </div>
                    <div className="rounded border border-border/50 p-2 col-span-2">
                      <div className="text-muted-foreground">Cooldown</div>
                      <div className="font-medium">{selected.cooldown_minutes} min</div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="mb-2 text-sm font-semibold">Histórico ({selectedHistory.length})</h3>
                  <div className="space-y-1">
                    {selectedHistory.length === 0 && <div className="text-xs text-muted-foreground">Sem execuções.</div>}
                    {selectedHistory.map((h) => (
                      <div key={h.id} className="rounded border border-border/50 p-2 text-xs">
                        <div className="flex items-center justify-between">
                          {resultBadge(h.execution_result)}
                          <span className="text-muted-foreground">
                            {formatDistanceToNow(new Date(h.executed_at), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                        <div className="mt-1 text-muted-foreground">{h.execution_reason}</div>
                        {Array.isArray(h.execution_logs) && h.execution_logs.length > 0 && (
                          <pre className="mt-1 overflow-x-auto rounded bg-muted/30 p-1 text-[10px]">
                            {JSON.stringify(h.execution_logs, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <Button
                  className="w-full"
                  disabled={!selected.is_enabled || executePolicy.isPending}
                  onClick={() => executePolicy.mutate(selected.policy_code)}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${executePolicy.isPending ? "animate-spin" : ""}`} />
                  Executar agora
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
