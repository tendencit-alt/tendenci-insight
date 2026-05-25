import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { BudgetVersionLabel, VERSION_LABELS } from "@/hooks/useBudgetData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, Save, Trash2, Target, Copy, FileSpreadsheet, TrendingUp, TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BudgetManagementTabProps {
  filters: FinanceiroFiltersState;
}

const MONTHS = [
  { value: 1, label: "Jan" }, { value: 2, label: "Fev" }, { value: 3, label: "Mar" },
  { value: 4, label: "Abr" }, { value: 5, label: "Mai" }, { value: 6, label: "Jun" },
  { value: 7, label: "Jul" }, { value: 8, label: "Ago" }, { value: 9, label: "Set" },
  { value: 10, label: "Out" }, { value: 11, label: "Nov" }, { value: 12, label: "Dez" },
];

const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function BudgetManagementTab({ filters }: BudgetManagementTabProps) {
  const queryClient = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [versionLabel, setVersionLabel] = useState<BudgetVersionLabel>("base");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editValues, setEditValues] = useState<Map<string, string>>(new Map());

  // Fetch chart accounts
  const { data: chartAccounts } = useQuery({
    queryKey: ["fin-chart-accounts-budget"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name, nature, parent_id, in_dre, in_cashflow")
        .eq("active", true)
        .order("code");
      return data || [];
    },
  });

  // Fetch budget entries for selected period
  const { data: budgetEntries, isLoading } = useQuery({
    queryKey: ["fin-budget-entries", year, month, versionLabel],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_budgets")
        .select("*, chart_account:fin_chart_accounts(code, name, nature)")
        .eq("year", year)
        .eq("month", month)
        .eq("version_label", versionLabel)
        .order("created_at");
      return data || [];
    },
  });

  // Fetch realized data for comparison
  const { data: realizedData } = useQuery({
    queryKey: ["fin-budget-realized", year, month],
    queryFn: async () => {
      const dateFrom = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const dateTo = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

      const { data } = await supabase
        .from("fin_ledger_entries")
        .select("chart_account_id, amount")
        .neq("status", "CANCELADO")
        .gte("competence_date", dateFrom)
        .lte("competence_date", dateTo)
        .not("competence_date", "is", null);

      const byAccount = new Map<string, number>();
      (data || []).forEach((e: any) => {
        byAccount.set(e.chart_account_id, (byAccount.get(e.chart_account_id) || 0) + Number(e.amount));
      });
      return byAccount;
    },
  });

  // Cost centers for dimensional
  const { activeTenantId: _budgetTenant } = useActiveTenant();
  const { data: costCenters } = useQuery({
    queryKey: ["fin-cost-centers-budget", _budgetTenant],
    enabled: !!_budgetTenant,
    queryFn: async () => {
      const { data } = await supabase.from("fin_cost_centers").select("id, name").eq("tenant_id", _budgetTenant!).eq("active", true).order("name");
      return data || [];
    },
  });

  // KPIs
  const totalBudget = budgetEntries?.reduce((s, e: any) => s + Number(e.amount), 0) || 0;
  const budgetReceitas = budgetEntries?.filter((e: any) => e.budget_type === "RECEITA").reduce((s, e: any) => s + Number(e.amount), 0) || 0;
  const budgetDespesas = budgetEntries?.filter((e: any) => e.budget_type === "DESPESA").reduce((s, e: any) => s + Number(e.amount), 0) || 0;

  // Realized totals for comparison
  let realReceitas = 0, realDespesas = 0;
  if (realizedData && chartAccounts) {
    chartAccounts.forEach((a) => {
      const amt = realizedData.get(a.id) || 0;
      if (a.nature === "RECEITA") realReceitas += amt;
      else if (a.nature === "DESPESA") realDespesas += amt;
    });
  }

  const desvioReceita = budgetReceitas > 0 ? ((realReceitas - budgetReceitas) / budgetReceitas) * 100 : 0;
  const desvioDespesa = budgetDespesas > 0 ? ((realDespesas - budgetDespesas) / budgetDespesas) * 100 : 0;

  const saveMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { error } = await supabase.from("fin_budgets").update({ amount }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Valor atualizado");
      queryClient.invalidateQueries({ queryKey: ["fin-budget-entries"] });
      queryClient.invalidateQueries({ queryKey: ["fin-budget-data"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fin_budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entrada removida");
      queryClient.invalidateQueries({ queryKey: ["fin-budget-entries"] });
    },
  });

  const duplicateMonth = async (srcMonth: number, destMonth: number) => {
    const { data: srcEntries } = await supabase
      .from("fin_budgets")
      .select("chart_account_id, cost_center_id, project_id, amount, version_label, budget_type, notes")
      .eq("year", year)
      .eq("month", srcMonth)
      .eq("version_label", versionLabel);

    if (!srcEntries?.length) { toast.error("Nenhuma entrada no mês origem"); return; }

    const inserts = srcEntries.map((e: any) => ({
      ...e,
      year,
      month: destMonth,
      version: 1,
    }));

    const { error } = await supabase.from("fin_budgets").insert(inserts);
    if (error) { toast.error(error.message); return; }
    toast.success(`${inserts.length} entradas copiadas para ${MONTHS[destMonth - 1].label}`);
    queryClient.invalidateQueries({ queryKey: ["fin-budget-entries"] });
  };

  const handleInlineEdit = (id: string, value: string) => {
    const newMap = new Map(editValues);
    newMap.set(id, value);
    setEditValues(newMap);
  };

  const handleSaveInline = (id: string) => {
    const val = editValues.get(id);
    if (val === undefined) return;
    const amount = parseFloat(val.replace(",", "."));
    if (isNaN(amount)) { toast.error("Valor inválido"); return; }
    saveMutation.mutate({ id, amount });
    const newMap = new Map(editValues);
    newMap.delete(id);
    setEditValues(newMap);
  };

  // Root-level accounts for grouping
  const rootAccounts = chartAccounts?.filter((a) => !a.parent_id) || [];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={versionLabel} onValueChange={(v) => setVersionLabel(v as BudgetVersionLabel)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(VERSION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" className="gap-1.5" onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
          const next = month < 12 ? month + 1 : 1;
          duplicateMonth(month, next);
        }}>
          <Copy className="h-3.5 w-3.5" /> Copiar p/ próximo mês
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-[11px] text-muted-foreground">Receitas Orçadas</p>
          <p className="text-lg font-bold font-mono text-green-600">{formatCurrency(budgetReceitas)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-[11px] text-muted-foreground">Despesas Orçadas</p>
          <p className="text-lg font-bold font-mono text-red-600">{formatCurrency(budgetDespesas)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-[11px] text-muted-foreground">Resultado Orçado</p>
          <p className={cn("text-lg font-bold font-mono", budgetReceitas - budgetDespesas >= 0 ? "text-green-600" : "text-red-600")}>
            {formatCurrency(budgetReceitas - budgetDespesas)}
          </p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-[11px] text-muted-foreground">Desvio Receita</p>
          <p className={cn("text-lg font-bold", desvioReceita >= 0 ? "text-green-600" : "text-red-600")}>
            {desvioReceita >= 0 ? "+" : ""}{desvioReceita.toFixed(1)}%
          </p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-[11px] text-muted-foreground">Desvio Despesa</p>
          <p className={cn("text-lg font-bold", desvioDespesa <= 0 ? "text-green-600" : "text-red-600")}>
            {desvioDespesa >= 0 ? "+" : ""}{desvioDespesa.toFixed(1)}%
          </p>
        </CardContent></Card>
      </div>

      {/* Budget Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            {VERSION_LABELS[versionLabel]} — {MONTHS[month - 1]?.label} {year}
            <Badge variant="outline" className="text-[10px] ml-2">{budgetEntries?.length || 0} linhas</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : budgetEntries?.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma entrada de orçamento para este período</p>
              <Button size="sm" className="mt-4 gap-1.5" onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Adicionar primeira entrada
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px]">Categoria</TableHead>
                  <TableHead className="text-[11px]">Tipo</TableHead>
                  <TableHead className="text-[11px] text-right">Orçado</TableHead>
                  <TableHead className="text-[11px] text-right">Realizado</TableHead>
                  <TableHead className="text-[11px] text-right">Diferença</TableHead>
                  <TableHead className="text-[11px] text-right">Desvio %</TableHead>
                  <TableHead className="text-[11px] w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgetEntries?.map((entry: any) => {
                  const budgeted = Number(entry.amount);
                  const realized = realizedData?.get(entry.chart_account_id) || 0;
                  const diff = realized - budgeted;
                  const desvio = budgeted !== 0 ? ((realized - budgeted) / budgeted) * 100 : 0;
                  const isEditing = editValues.has(entry.id);

                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs font-medium">
                        {entry.chart_account?.code} — {entry.chart_account?.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px]",
                          entry.budget_type === "RECEITA" ? "text-green-600 border-green-300" : "text-red-600 border-red-300"
                        )}>
                          {entry.budget_type === "RECEITA" ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                          {entry.budget_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex items-center gap-1 justify-end">
                            <Input
                              className="h-7 w-24 text-xs text-right"
                              value={editValues.get(entry.id) || ""}
                              onChange={(e) => handleInlineEdit(entry.id, e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleSaveInline(entry.id)}
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSaveInline(entry.id)}>
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <span
                            className="font-mono text-xs cursor-pointer hover:underline"
                            onClick={() => handleInlineEdit(entry.id, budgeted.toString())}
                          >
                            {formatCurrency(budgeted)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className={cn("text-right font-mono text-xs", realized >= 0 ? "text-green-600" : "text-red-600")}>
                        {formatCurrency(realized)}
                      </TableCell>
                      <TableCell className={cn("text-right font-mono text-xs", diff >= 0 ? "text-green-600" : "text-red-600")}>
                        {formatCurrency(diff)}
                      </TableCell>
                      <TableCell className={cn("text-right text-xs font-medium",
                        entry.budget_type === "RECEITA"
                          ? desvio >= 0 ? "text-green-600" : "text-red-600"
                          : desvio <= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {desvio >= 0 ? "+" : ""}{desvio.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => deleteMutation.mutate(entry.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <AddBudgetEntryDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        year={year}
        month={month}
        versionLabel={versionLabel}
        chartAccounts={chartAccounts || []}
        costCenters={costCenters || []}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["fin-budget-entries"] })}
      />
    </div>
  );
}

// ── Add Budget Entry Dialog ──
function AddBudgetEntryDialog({
  open, onOpenChange, year, month, versionLabel, chartAccounts, costCenters, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  year: number;
  month: number;
  versionLabel: BudgetVersionLabel;
  chartAccounts: any[];
  costCenters: any[];
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    chart_account_id: "",
    amount: "",
    budget_type: "DESPESA",
    cost_center_id: "",
    notes: "",
  });

  const handleSave = async () => {
    if (!form.chart_account_id || !form.amount) {
      toast.error("Selecione categoria e valor");
      return;
    }
    const { error } = await supabase.from("fin_budgets").insert({
      year,
      month,
      chart_account_id: form.chart_account_id,
      amount: parseFloat(form.amount.replace(",", ".")),
      version: 1,
      version_label: versionLabel,
      budget_type: form.budget_type,
      cost_center_id: form.cost_center_id || null,
      notes: form.notes || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Entrada adicionada");
    onSuccess();
    onOpenChange(false);
    setForm({ chart_account_id: "", amount: "", budget_type: "DESPESA", cost_center_id: "", notes: "" });
  };

  // Only leaf accounts (those without children)
  const parentIds = new Set(chartAccounts.filter((a) => a.parent_id).map((a) => a.parent_id));
  const leafAccounts = chartAccounts.filter((a) => !parentIds.has(a.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Entrada de Orçamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Categoria *</Label>
            <Select value={form.chart_account_id} onValueChange={(v) => {
              const acc = chartAccounts.find((a) => a.id === v);
              setForm({
                ...form,
                chart_account_id: v,
                budget_type: acc?.nature === "RECEITA" ? "RECEITA" : "DESPESA",
              });
            }}>
              <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                {leafAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={form.budget_type} onValueChange={(v) => setForm({ ...form, budget_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEITA">Receita</SelectItem>
                  <SelectItem value="DESPESA">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Valor *</Label>
              <Input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0,00" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Centro de Custo</Label>
            <Select value={form.cost_center_id} onValueChange={(v) => setForm({ ...form, cost_center_id: v })}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {costCenters.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Observações</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
