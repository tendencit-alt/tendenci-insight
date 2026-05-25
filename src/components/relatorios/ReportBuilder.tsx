import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateBrInput } from "@/components/ui/date-br-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  BarChart3, LineChart, TableIcon, LayoutGrid, Download, Save,
  Filter, Loader2,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

import { useToast } from "@/hooks/use-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart as ReLineChart, Line,
} from "recharts";

// ─── Data source definitions ───
export interface ReportDataSource {
  key: string;
  label: string;
  group: "executivo" | "analitico" | "operacional" | "auditoria";
  table: string;
  defaultMetrics: string[];
  availableGroupings: string[];
  buildQuery: (filters: ReportFilters) => any;
}

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  costCenterId?: string;
  projectId?: string;
  status?: string;
  search?: string;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const REPORT_SOURCES: ReportDataSource[] = [
  // Financeiros
  { key: "payables_due", label: "Contas a Pagar por Vencimento", group: "analitico", table: "fin_payables", defaultMetrics: ["amount", "count"], availableGroupings: ["month", "category", "supplier", "cost_center"],
    buildQuery: (f) => (supabase as any).from("fin_payables").select("id, description, amount, due_date, status, supplier_name, cost_center_id, created_at").gte("due_date", f.dateFrom).lte("due_date", f.dateTo).neq("status", "CANCELADO") },
  { key: "receivables_due", label: "Contas a Receber por Vencimento", group: "analitico", table: "fin_payables", defaultMetrics: ["amount", "count"], availableGroupings: ["month", "category", "client", "cost_center"],
    buildQuery: (f) => (supabase as any).from("fin_payables").select("id, description, amount, due_date, status, client_name, cost_center_id, created_at").gte("due_date", f.dateFrom).lte("due_date", f.dateTo).eq("type", "receivable").neq("status", "CANCELADO") },
  { key: "reconciliation_pending", label: "Conciliação Pendente", group: "analitico", table: "fin_ledger_entries", defaultMetrics: ["amount", "count"], availableGroupings: ["month", "category"],
    buildQuery: (_f: ReportFilters) => (supabase as any).from("fin_ledger_entries").select("id, description, amount, competence_date, status, reconciliation_status, created_at").neq("status", "CANCELADO").or("reconciliation_status.is.null,reconciliation_status.eq.nao_conciliado") },
  { key: "cashflow_projected", label: "Fluxo Previsto", group: "executivo", table: "fin_ledger_entries", defaultMetrics: ["amount"], availableGroupings: ["month", "category", "cost_center"],
    buildQuery: (f) => (supabase as any).from("fin_ledger_entries").select("id, description, amount, type, due_date, status, chart_account_id, cost_center_id").neq("status", "CANCELADO").gte("due_date", f.dateFrom).lte("due_date", f.dateTo) },
  { key: "cashflow_realized", label: "Fluxo Realizado", group: "executivo", table: "fin_ledger_entries", defaultMetrics: ["amount"], availableGroupings: ["month", "category", "cost_center"],
    buildQuery: (f) => (supabase as any).from("fin_ledger_entries").select("id, description, amount, type, cash_date, status, chart_account_id, cost_center_id").neq("status", "CANCELADO").not("cash_date", "is", null).gte("cash_date", f.dateFrom).lte("cash_date", f.dateTo) },
  // DRE
  { key: "dre_consolidated", label: "DRE Consolidada", group: "executivo", table: "fin_ledger_entries", defaultMetrics: ["amount"], availableGroupings: ["month", "category"],
    buildQuery: (f) => (supabase as any).from("fin_ledger_entries").select("id, description, amount, type, competence_date, chart_account_id, cost_center_id, project_id").neq("status", "CANCELADO").not("competence_date", "is", null).gte("competence_date", f.dateFrom).lte("competence_date", f.dateTo) },
  { key: "dre_cost_center", label: "DRE por Centro de Custo", group: "analitico", table: "fin_ledger_entries", defaultMetrics: ["amount"], availableGroupings: ["cost_center", "month", "category"],
    buildQuery: (f) => (supabase as any).from("fin_ledger_entries").select("id, description, amount, type, competence_date, chart_account_id, cost_center_id").neq("status", "CANCELADO").not("competence_date", "is", null).gte("competence_date", f.dateFrom).lte("competence_date", f.dateTo) },
  { key: "budget_vs_actual", label: "Orçamento vs Realizado", group: "executivo", table: "fin_budgets", defaultMetrics: ["amount"], availableGroupings: ["month", "category"],
    buildQuery: (_f: ReportFilters) => (supabase as any).from("fin_budgets").select("id, chart_account_id, amount, year, month, budget_type, version_label") },
  // Comerciais
  { key: "orders_approved", label: "Pedidos Aprovados", group: "operacional", table: "orders", defaultMetrics: ["total_amount", "count"], availableGroupings: ["month", "client", "seller"],
    buildQuery: (f) => (supabase as any).from("orders").select("id, order_number, total_amount, status, created_at, client_id, vendedor_id").eq("status", "aprovado").gte("created_at", f.dateFrom).lte("created_at", f.dateTo) },
  { key: "orders_cancelled", label: "Pedidos Cancelados", group: "operacional", table: "orders", defaultMetrics: ["total_amount", "count"], availableGroupings: ["month", "client"],
    buildQuery: (f) => (supabase as any).from("orders").select("id, order_number, total_amount, status, created_at, client_id").eq("status", "cancelado").gte("created_at", f.dateFrom).lte("created_at", f.dateTo) },
  // Auditoria
  { key: "audit_critical", label: "Alterações Críticas", group: "auditoria", table: "audit_log", defaultMetrics: ["count"], availableGroupings: ["month", "table", "user"],
    buildQuery: (f) => (supabase as any).from("audit_log").select("id, event_type, table_name, field_name, old_value, new_value, user_id, created_at").gte("created_at", f.dateFrom).lte("created_at", f.dateTo).order("created_at", { ascending: false }).limit(500) },
  { key: "manual_entries", label: "Lançamentos Manuais", group: "auditoria", table: "fin_ledger_entries", defaultMetrics: ["amount", "count"], availableGroupings: ["month", "category"],
    buildQuery: (f) => (supabase as any).from("fin_ledger_entries").select("id, description, amount, competence_date, type, created_at").neq("status", "CANCELADO").is("source_id", null).gte("created_at", f.dateFrom).lte("created_at", f.dateTo) },
  { key: "unreconciled", label: "Movimentos Sem Conciliação", group: "auditoria", table: "fin_ledger_entries", defaultMetrics: ["amount", "count"], availableGroupings: ["month"],
    buildQuery: (_f: ReportFilters) => (supabase as any).from("fin_ledger_entries").select("id, description, amount, type, cash_date, reconciliation_status, created_at").neq("status", "CANCELADO").not("cash_date", "is", null).or("reconciliation_status.is.null,reconciliation_status.eq.nao_conciliado") },
];

const VIZ_OPTIONS = [
  { key: "tabela", label: "Tabela", icon: TableIcon },
  { key: "barras", label: "Barras", icon: BarChart3 },
  { key: "linha", label: "Linha", icon: LineChart },
  { key: "cards", label: "Cards KPI", icon: LayoutGrid },
];

interface Props {
  initialSource?: string;
  initialGroup?: string;
}

export function ReportBuilder({ initialSource, initialGroup }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const now = new Date();

  const [selectedSource, setSelectedSource] = useState(initialSource || "");
  const [visualization, setVisualization] = useState("tabela");
  const [grouping, setGrouping] = useState("");
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: format(startOfMonth(subMonths(now, 2)), "yyyy-MM-dd"),
    dateTo: format(endOfMonth(now), "yyyy-MM-dd"),
  });
  const [saveDialog, setSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDesc, setSaveDesc] = useState("");
  const [savePublic, setSavePublic] = useState(false);

  const source = REPORT_SOURCES.find((s) => s.key === selectedSource);
  const filteredSources = initialGroup
    ? REPORT_SOURCES.filter((s) => s.group === initialGroup)
    : REPORT_SOURCES;

  // Fetch report data
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ["report-builder", selectedSource, filters],
    queryFn: async () => {
      if (!source) return [];
      const { data, error } = await source.buildQuery(filters);
      if (error) throw error;
      return data || [];
    },
    enabled: !!source,
  });

  // Grouped/aggregated data
  const processedData = useMemo(() => {
    if (!reportData || !reportData.length) return { rows: [], chartData: [], totals: { count: 0, amount: 0 } };

    let amount = 0;
    reportData.forEach((r: any) => { amount += Math.abs(Number(r.amount || r.total_amount || 0)); });

    // Group data
    const grouped = new Map<string, { label: string; count: number; amount: number }>();
    reportData.forEach((r: any) => {
      let key = "total";
      if (grouping === "month") {
        const d = r.competence_date || r.cash_date || r.due_date || r.created_at;
        key = d ? format(new Date(d), "yyyy-MM") : "sem-data";
      } else if (grouping === "category") {
        key = r.chart_account_id || "sem-categoria";
      } else if (grouping === "cost_center") {
        key = r.cost_center_id || "sem-cc";
      } else if (grouping === "table") {
        key = r.table_name || "desconhecido";
      }

      const existing = grouped.get(key) || { label: key, count: 0, amount: 0 };
      existing.count++;
      existing.amount += Math.abs(Number(r.amount || r.total_amount || 0));
      grouped.set(key, existing);
    });

    const chartData = Array.from(grouped.values()).sort((a, b) => a.label.localeCompare(b.label));

    return { rows: reportData, chartData, totals: { count: reportData.length, amount } };
  }, [reportData, grouping]);

  // Save report
  const saveMut = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("fin_saved_reports").insert({
        name: saveName,
        description: saveDesc,
        report_group: source?.group || "executivo",
        data_source: selectedSource,
        filters: filters as any,
        metrics: source?.defaultMetrics || [],
        grouping_field: grouping || null,
        visualization,
        is_public: savePublic,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "KPI salvo com sucesso" });
      setSaveDialog(false);
      setSaveName("");
      setSaveDesc("");
      qc.invalidateQueries({ queryKey: ["saved-reports"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Export CSV
  const exportCSV = () => {
    if (!reportData?.length) return;
    const keys = Object.keys(reportData[0]);
    const csv = [keys.join(","), ...reportData.map((r: any) => keys.map((k) => `"${r[k] ?? ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${selectedSource}_${format(now, "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" /> Configuração do KPI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* Source */}
            <div className="space-y-1">
              <Label className="text-xs">Fonte de Dados</Label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredSources.map((s) => (
                    <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Period */}
            <div className="space-y-1">
              <Label className="text-xs">Data Início</Label>
              <DateBrInput className="h-9 text-xs" value={filters.dateFrom} onChange={(iso) => setFilters({ ...filters, dateFrom: iso })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data Fim</Label>
              <DateBrInput className="h-9 text-xs" value={filters.dateTo} onChange={(iso) => setFilters({ ...filters, dateTo: iso })} />
            </div>

            {/* Grouping */}
            <div className="space-y-1">
              <Label className="text-xs">Agrupamento</Label>
              <Select value={grouping} onValueChange={setGrouping}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">Nenhum</SelectItem>
                  {source?.availableGroupings.map((g) => (
                    <SelectItem key={g} value={g} className="text-xs">
                      {{ month: "Mês", category: "Categoria", cost_center: "Centro Custo", project: "Projeto", client: "Cliente", supplier: "Fornecedor", seller: "Vendedor", table: "Tabela", user: "Usuário" }[g] || g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Visualization */}
            <div className="space-y-1">
              <Label className="text-xs">Visualização</Label>
              <div className="flex gap-1">
                {VIZ_OPTIONS.map((v) => (
                  <Button
                    key={v.key}
                    size="sm"
                    variant={visualization === v.key ? "default" : "outline"}
                    className="h-9 px-2"
                    onClick={() => setVisualization(v.key)}
                    title={v.label}
                  >
                    <v.icon className="h-3.5 w-3.5" />
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <Button size="sm" onClick={() => refetch()} disabled={!source}>
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Gerar KPI
            </Button>
            <Button size="sm" variant="outline" onClick={exportCSV} disabled={!reportData?.length}>
              <Download className="h-3.5 w-3.5 mr-1" /> CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSaveDialog(true)} disabled={!source}>
              <Save className="h-3.5 w-3.5 mr-1" /> Salvar Visão
            </Button>
            {processedData.totals.count > 0 && (
              <div className="ml-auto flex gap-2">
                <Badge variant="outline" className="text-xs">{processedData.totals.count} registros</Badge>
                <Badge variant="secondary" className="text-xs font-mono">{fmt(processedData.totals.amount)}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {!source ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Selecione uma fonte de dados para gerar o relatório</CardContent></Card>
      ) : isLoading ? (
        <Skeleton className="h-[300px]" />
      ) : !reportData?.length ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Nenhum dado encontrado para os filtros selecionados</CardContent></Card>
      ) : (
        <>
          {/* Chart */}
          {(visualization === "barras" || visualization === "linha") && grouping && processedData.chartData.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={280}>
                  {visualization === "barras" ? (
                    <BarChart data={processedData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="label" className="text-xs" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <ReLineChart data={processedData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    </ReLineChart>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Cards KPI */}
          {visualization === "cards" && grouping && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {processedData.chartData.slice(0, 12).map((d, i) => (
                <Card key={i}>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground truncate">{d.label}</p>
                    <p className="text-xl font-bold font-mono mt-1">{fmt(d.amount)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{d.count} registros</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Table */}
          {(visualization === "tabela" || !grouping) && (
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {grouping ? (
                          <>
                            <TableHead className="text-xs">Agrupamento</TableHead>
                            <TableHead className="text-xs text-right">Qtd</TableHead>
                            <TableHead className="text-xs text-right">Valor</TableHead>
                          </>
                        ) : (
                          Object.keys(reportData[0] || {}).slice(0, 6).map((k) => (
                            <TableHead key={k} className="text-xs">{k}</TableHead>
                          ))
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grouping ? (
                        processedData.chartData.map((d, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs">{d.label}</TableCell>
                            <TableCell className="text-xs text-right font-mono">{d.count}</TableCell>
                            <TableCell className="text-xs text-right font-mono">{fmt(d.amount)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        reportData.slice(0, 100).map((row: any, i: number) => (
                          <TableRow key={i}>
                            {Object.keys(row).slice(0, 6).map((k) => (
                              <TableCell key={k} className="text-xs font-mono truncate max-w-[200px]">
                                {typeof row[k] === "number" ? row[k].toLocaleString("pt-BR") : String(row[k] ?? "—")}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Save Dialog */}
      <Dialog open={saveDialog} onOpenChange={setSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar KPI</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome</Label>
              <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Ex: Contas a Pagar - Mensal" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Textarea value={saveDesc} onChange={(e) => setSaveDesc(e.target.value)} placeholder="Descrição opcional..." />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="public" checked={savePublic} onCheckedChange={(v) => setSavePublic(!!v)} />
              <Label htmlFor="public" className="text-xs">Público (visível para todos do tenant)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialog(false)}>Cancelar</Button>
            <Button onClick={() => saveMut.mutate()} disabled={!saveName.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
