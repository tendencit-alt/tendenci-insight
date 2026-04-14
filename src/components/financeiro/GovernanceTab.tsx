import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Lock, Unlock, ShieldCheck, AlertTriangle, Clock, FileText,
  Activity, TrendingUp, CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useFinancePermissions } from "@/hooks/useFinancePermissions";

interface Props {
  filters: FinanceiroFiltersState;
}

const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function GovernanceTab({ filters: _filters }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { can } = useFinancePermissions();
  const [subTab, setSubTab] = useState("periods");
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [reopenReason, setReopenReason] = useState("");
  const [dialogPeriod, setDialogPeriod] = useState<{ year: number; month: number; action: "close" | "reopen" } | null>(null);

  // Period closings
  const { data: closings, isLoading: loadClosings } = useQuery({
    queryKey: ["fin-period-closings", selectedYear],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_period_closings")
        .select("*")
        .eq("year", selectedYear);
      return data || [];
    },
  });

  // Impact logs
  const { data: impactLogs, isLoading: loadImpact } = useQuery({
    queryKey: ["fin-impact-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_impact_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // Reliability metrics
  const { data: reliability } = useQuery({
    queryKey: ["fin-reliability"],
    queryFn: async () => {
      // Total ledger entries
      const { count: totalEntries } = await supabase
        .from("fin_ledger_entries")
        .select("id", { count: "exact", head: true } as any)
        .neq("status", "CANCELADO");

      // Reconciled entries
      const { count: reconciledEntries } = await supabase
        .from("fin_ledger_entries")
        .select("id", { count: "exact", head: true } as any)
        .eq("reconciliation_status", "conciliado");

      // Auto entries (have source_id)
      const { count: autoEntries } = await supabase
        .from("fin_ledger_entries")
        .select("id", { count: "exact", head: true } as any)
        .neq("status", "CANCELADO")
        .not("source_id", "is", null);

      // Closed periods this year
      const { count: closedPeriods } = await supabase
        .from("fin_period_closings")
        .select("id", { count: "exact", head: true } as any)
        .eq("year", currentYear)
        .eq("status", "closed");

      const total = totalEntries || 0;
      const reconciled = reconciledEntries || 0;
      const auto = autoEntries || 0;
      const manual = total - auto;
      const closed = closedPeriods || 0;
      const currentMonth = new Date().getMonth(); // 0-indexed, represents completed months

      const pctReconciled = total > 0 ? (reconciled / total) * 100 : 0;
      const pctClosed = currentMonth > 0 ? (closed / currentMonth) * 100 : 0;
      const pctAuto = total > 0 ? (auto / total) * 100 : 0;
      const pctManual = total > 0 ? (manual / total) * 100 : 0;

      // Reliability index: weighted average
      const reliabilityIndex = (pctReconciled * 0.4) + (pctClosed * 0.3) + (pctAuto * 0.3);

      return { total, reconciled, auto, manual, closed, currentMonth, pctReconciled, pctClosed, pctAuto, pctManual, reliabilityIndex };
    },
  });

  // Close/reopen period
  const closePeriodMut = useMutation({
    mutationFn: async ({ year, month, action, reason }: { year: number; month: number; action: "close" | "reopen"; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const existing = closings?.find((c: any) => c.year === year && c.month === month);

      if (action === "close") {
        if (existing) {
          const { error } = await supabase
            .from("fin_period_closings")
            .update({ status: "closed", closed_by: user.id, closed_at: new Date().toISOString() })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("fin_period_closings")
            .insert({ year, month, status: "closed", closed_by: user.id, closed_at: new Date().toISOString() });
          if (error) throw error;
        }
      } else {
        if (!existing) throw new Error("Período não encontrado");
        const { error } = await supabase
          .from("fin_period_closings")
          .update({ status: "open", reopened_by: user.id, reopened_at: new Date().toISOString(), reopen_reason: reason })
          .eq("id", existing.id);
        if (error) throw error;
      }

      // Log impact
      await supabase.from("fin_impact_logs").insert({
        event_type: action === "close" ? "period_closed" : "period_reopened",
        source_table: "fin_period_closings",
        field_changed: "status",
        old_value: action === "close" ? "open" : "closed",
        new_value: action === "close" ? "closed" : "open",
        impact_description: `Período ${month}/${year} ${action === "close" ? "fechado" : "reaberto"}${reason ? `: ${reason}` : ""}`,
        user_id: user.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fin-period-closings"] });
      qc.invalidateQueries({ queryKey: ["fin-impact-logs"] });
      qc.invalidateQueries({ queryKey: ["fin-reliability"] });
      toast({ title: "Período atualizado com sucesso" });
      setDialogPeriod(null);
      setReopenReason("");
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const closingMap = useMemo(() => {
    const m = new Map<number, any>();
    closings?.forEach((c: any) => m.set(c.month, c));
    return m;
  }, [closings]);

  const canCloseReopen = can("admin_financeiro") || can("chart_edit");

  const EVENT_LABELS: Record<string, string> = {
    period_closed: "Fechamento de Período",
    period_reopened: "Reabertura de Período",
    entry_deleted: "Exclusão de Lançamento",
    competence_changed: "Alteração de Competência",
    category_changed: "Alteração de Categoria",
    budget_changed: "Alteração de Orçamento",
    forecast_changed: "Alteração de Forecast",
    value_changed: "Alteração de Valor",
  };

  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="periods" className="flex items-center gap-1.5 text-xs">
            <Lock className="h-3.5 w-3.5" /> Fechamento
          </TabsTrigger>
          <TabsTrigger value="impact" className="flex items-center gap-1.5 text-xs">
            <Activity className="h-3.5 w-3.5" /> Log Impacto
          </TabsTrigger>
          <TabsTrigger value="reliability" className="flex items-center gap-1.5 text-xs">
            <ShieldCheck className="h-3.5 w-3.5" /> Confiabilidade
          </TabsTrigger>
        </TabsList>

        {/* Period Closing */}
        <TabsContent value="periods" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Fechamento Mensal — {selectedYear}
                </CardTitle>
                <div className="flex gap-1">
                  {[currentYear - 1, currentYear].map((y) => (
                    <Button key={y} size="sm" variant={selectedYear === y ? "default" : "outline"} onClick={() => setSelectedYear(y)}>
                      {y}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadClosings ? (
                <Skeleton className="h-20" />
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
                  {months.map((m, idx) => {
                    const monthNum = idx + 1;
                    const closing = closingMap.get(monthNum);
                    const isClosed = closing?.status === "closed";
                    const isFuture = selectedYear > currentYear || (selectedYear === currentYear && monthNum > new Date().getMonth() + 1);

                    return (
                      <div key={idx} className={cn(
                        "flex flex-col items-center p-2 rounded-lg border text-center transition-all",
                        isClosed && "bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-700",
                        !isClosed && !isFuture && "bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700",
                        isFuture && "bg-muted/30 border-dashed opacity-50",
                      )}>
                        <span className="text-xs font-medium">{m}</span>
                        {isClosed ? (
                          <Lock className="h-4 w-4 text-green-600 my-1" />
                        ) : isFuture ? (
                          <Clock className="h-4 w-4 text-muted-foreground my-1" />
                        ) : (
                          <Unlock className="h-4 w-4 text-amber-600 my-1" />
                        )}
                        {!isFuture && canCloseReopen && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[10px] h-5 px-1.5 mt-1"
                            onClick={() => setDialogPeriod({ year: selectedYear, month: monthNum, action: isClosed ? "reopen" : "close" })}
                          >
                            {isClosed ? "Reabrir" : "Fechar"}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Governance rules summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Regras de Proteção Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-xs">
                {[
                  { rule: "Período fechado bloqueia edição de competência, valor e categoria", active: true },
                  { rule: "Lançamento conciliado bloqueia valor, competência e categoria", active: true },
                  { rule: "Exclusão de lançamento requer perfil Owner", active: true },
                  { rule: "Edição de orçamento e forecast requer perfil Admin+", active: true },
                  { rule: "Conciliação bancária requer perfil Financeiro", active: true },
                  { rule: "Reabertura de período requer Owner ou Admin autorizado", active: true },
                  { rule: "Versionamento automático de orçamento e forecast", active: true },
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-2 p-1.5 rounded bg-muted/30">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    <span>{r.rule}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Impact Log */}
        <TabsContent value="impact" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" /> Log de Impacto Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadImpact ? (
                <Skeleton className="h-[300px]" />
              ) : !impactLogs?.length ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum evento de impacto registrado</p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {impactLogs.map((log: any) => (
                      <div key={log.id} className="flex items-start gap-2 p-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        <AlertTriangle className={cn(
                          "h-4 w-4 mt-0.5 shrink-0",
                          log.estimated_impact > 0 ? "text-red-500" : "text-amber-500"
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {EVENT_LABELS[log.event_type] || log.event_type}
                            </span>
                            {log.estimated_impact > 0 && (
                              <Badge variant="destructive" className="text-[10px]">
                                Impacto: {Number(log.estimated_impact).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </Badge>
                            )}
                          </div>
                          {log.impact_description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{log.impact_description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                            <span>{log.source_table}</span>
                            {log.field_changed && <span>Campo: {log.field_changed}</span>}
                            {log.old_value && <span className="text-red-500">De: {log.old_value}</span>}
                            {log.new_value && <span className="text-green-600">Para: {log.new_value}</span>}
                            <span>{log.created_at ? format(new Date(log.created_at), "dd/MM/yyyy HH:mm") : "—"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reliability */}
        <TabsContent value="reliability" className="space-y-4">
          {reliability ? (
            <>
              {/* Main index */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" /> Índice de Confiabilidade Financeira
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Progress
                        value={reliability.reliabilityIndex}
                        className={cn("h-4", reliability.reliabilityIndex >= 80 ? "[&>div]:bg-green-500" : reliability.reliabilityIndex >= 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500")}
                      />
                    </div>
                    <span className={cn(
                      "text-2xl font-bold font-mono",
                      reliability.reliabilityIndex >= 80 ? "text-green-600" : reliability.reliabilityIndex >= 50 ? "text-amber-600" : "text-red-600"
                    )}>
                      {reliability.reliabilityIndex.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Composto por: Conciliação (40%), Períodos Fechados (30%), Automação (30%)
                  </p>
                </CardContent>
              </Card>

              {/* Detail cards */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ReliabilityCard
                  icon={CheckCircle}
                  title="Dados Conciliados"
                  value={`${reliability.pctReconciled.toFixed(1)}%`}
                  detail={`${reliability.reconciled} de ${reliability.total}`}
                  color={reliability.pctReconciled >= 80 ? "green" : reliability.pctReconciled >= 50 ? "amber" : "red"}
                />
                <ReliabilityCard
                  icon={Lock}
                  title="Períodos Fechados"
                  value={`${reliability.pctClosed.toFixed(0)}%`}
                  detail={`${reliability.closed} de ${reliability.currentMonth} meses`}
                  color={reliability.pctClosed >= 80 ? "green" : reliability.pctClosed >= 50 ? "amber" : "red"}
                />
                <ReliabilityCard
                  icon={TrendingUp}
                  title="Lançamentos Automáticos"
                  value={`${reliability.pctAuto.toFixed(1)}%`}
                  detail={`${reliability.auto} automáticos`}
                  color={reliability.pctAuto >= 60 ? "green" : reliability.pctAuto >= 30 ? "amber" : "red"}
                />
                <ReliabilityCard
                  icon={FileText}
                  title="Lançamentos Manuais"
                  value={`${reliability.pctManual.toFixed(1)}%`}
                  detail={`${reliability.manual} manuais`}
                  color={reliability.pctManual <= 40 ? "green" : reliability.pctManual <= 70 ? "amber" : "red"}
                />
              </div>
            </>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[120px]" />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Close/Reopen Dialog */}
      <Dialog open={!!dialogPeriod} onOpenChange={(open) => !open && setDialogPeriod(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogPeriod?.action === "close" ? "Fechar Período" : "Reabrir Período"}
            </DialogTitle>
            <DialogDescription>
              {dialogPeriod?.action === "close"
                ? `Ao fechar ${months[(dialogPeriod?.month || 1) - 1]}/${dialogPeriod?.year}, lançamentos com competência neste período não poderão ser editados.`
                : `Ao reabrir ${months[(dialogPeriod?.month || 1) - 1]}/${dialogPeriod?.year}, lançamentos voltarão a ser editáveis. Informe o motivo.`}
            </DialogDescription>
          </DialogHeader>
          {dialogPeriod?.action === "reopen" && (
            <Textarea
              placeholder="Motivo da reabertura..."
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogPeriod(null)}>Cancelar</Button>
            <Button
              variant={dialogPeriod?.action === "close" ? "default" : "destructive"}
              disabled={dialogPeriod?.action === "reopen" && !reopenReason.trim()}
              onClick={() => {
                if (!dialogPeriod) return;
                closePeriodMut.mutate({
                  year: dialogPeriod.year,
                  month: dialogPeriod.month,
                  action: dialogPeriod.action,
                  reason: reopenReason,
                });
              }}
            >
              {dialogPeriod?.action === "close" ? "Confirmar Fechamento" : "Confirmar Reabertura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-component
const colorClasses = {
  green: "text-green-600",
  amber: "text-amber-600",
  red: "text-red-600",
};

function ReliabilityCard({ icon: Icon, title, value, detail, color }: {
  icon: any; title: string; value: string; detail: string; color: "green" | "amber" | "red";
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={cn("h-4 w-4", colorClasses[color])} />
          <span className="text-xs text-muted-foreground">{title}</span>
        </div>
        <p className={cn("text-2xl font-bold font-mono", colorClasses[color])}>{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{detail}</p>
      </CardContent>
    </Card>
  );
}
