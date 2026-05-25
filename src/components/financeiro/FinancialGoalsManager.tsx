import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Target, Loader2 } from "lucide-react";

interface FinancialGoal {
  id: string;
  year: number;
  month: number;
  goal_type: string;
  metric_key: string;
  target_amount: number;
  target_type: string;
  cost_center_id: string | null;
  project_id: string | null;
  client_id: string | null;
  vendedor_id: string | null;
  order_id: string | null;
  notes: string | null;
}

const ALL_METRICS: Record<string, { key: string; label: string }[]> = {
  dre: [
    { key: "receita_liquida", label: "Receita Líquida" },
    { key: "margem_contribuicao", label: "Margem de Contribuição" },
    { key: "resultado_operacional_ebitda", label: "EBITDA" },
    { key: "resultado_antes_impostos", label: "Resultado Antes dos Impostos" },
    { key: "resultado_liquido", label: "Resultado Líquido" },
  ],
  cashflow: [
    { key: "geracao_operacional", label: "Geração Operacional de Caixa" },
    { key: "variacao_liquida", label: "Variação Líquida de Caixa" },
    { key: "saldo_final", label: "Saldo Final de Caixa" },
  ],
  vendedor: [
    { key: "receita_vendedor", label: "Receita Meta" },
    { key: "margem_vendedor", label: "Margem Meta" },
    { key: "ticket_medio_vendedor", label: "Ticket Médio" },
    { key: "taxa_conversao_vendedor", label: "Taxa Conversão %" },
  ],
  pedido: [
    { key: "margem_minima_pedido", label: "Margem Mínima %" },
    { key: "ticket_medio_minimo", label: "Ticket Médio Mínimo" },
  ],
  projeto: [
    { key: "custo_maximo_projeto", label: "Custo Máximo" },
    { key: "margem_minima_projeto", label: "Margem Mínima %" },
  ],
  centro_custo: [
    { key: "limite_mensal_cc", label: "Limite Mensal" },
    { key: "limite_anual_cc", label: "Limite Anual" },
  ],
};

const TARGET_TYPES = [
  { value: "absoluto", label: "Absoluto" },
  { value: "percentual", label: "Percentual" },
  { value: "acumulado", label: "Acumulado" },
  { value: "progressivo", label: "Progressivo" },
  { value: "limite_min", label: "Limite Mínimo" },
  { value: "limite_max", label: "Limite Máximo" },
];

const MONTHS = [
  { value: 1, label: "Janeiro" }, { value: 2, label: "Fevereiro" }, { value: 3, label: "Março" },
  { value: 4, label: "Abril" }, { value: 5, label: "Maio" }, { value: 6, label: "Junho" },
  { value: 7, label: "Julho" }, { value: 8, label: "Agosto" }, { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" }, { value: 11, label: "Novembro" }, { value: 12, label: "Dezembro" },
];

const GOAL_TYPES = [
  { value: "dre", label: "DRE" },
  { value: "cashflow", label: "Fluxo de Caixa" },
  { value: "vendedor", label: "Vendedor" },
  { value: "pedido", label: "Pedido" },
  { value: "projeto", label: "Projeto" },
  { value: "centro_custo", label: "Centro de Custo" },
];

export function FinancialGoalsManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState<string>("all");
  
  const [form, setForm] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    goal_type: "dre",
    metric_key: "",
    target_amount: "",
    target_type: "absoluto",
    cost_center_id: "",
    project_id: "",
    client_id: "",
    vendedor_id: "",
    order_id: "",
    notes: "",
  });

  const { data: goals, isLoading } = useQuery({
    queryKey: ["fin-financial-goals", filterYear, filterType],
    queryFn: async () => {
      let query = supabase
        .from("fin_financial_goals")
        .select("*")
        .eq("year", filterYear)
        .order("month")
        .order("goal_type")
        .order("metric_key");
      if (filterType !== "all") query = query.eq("goal_type", filterType);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as FinancialGoal[];
    },
  });

  const { activeTenantId: _goalsTenant } = useActiveTenant();
  const { data: costCenters } = useQuery({
    queryKey: ["fin-cost-centers", _goalsTenant],
    enabled: !!_goalsTenant,
    queryFn: async () => {
      const { data } = await supabase.from("fin_cost_centers").select("id, name").eq("tenant_id", _goalsTenant!).eq("active", true).order("name");
      return data || [];
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["fin-projects", _goalsTenant],
    enabled: !!_goalsTenant,
    queryFn: async () => {
      const { data } = await supabase.from("fin_projects").select("id, name").eq("tenant_id", _goalsTenant!).eq("status", "ativo").order("name");
      return data || [];
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["fin-clients-goals"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name").limit(500);
      return data || [];
    },
  });

  const { data: vendedores } = useQuery({
    queryKey: ["fin-vendedores-goals"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name").order("full_name");
      return data || [];
    },
  });

  const handleOpenDialog = (goal?: FinancialGoal) => {
    if (goal) {
      setSelectedGoal(goal);
      setForm({
        year: goal.year, month: goal.month, goal_type: goal.goal_type,
        metric_key: goal.metric_key, target_amount: goal.target_amount.toString(),
        target_type: goal.target_type || "absoluto",
        cost_center_id: goal.cost_center_id || "", project_id: goal.project_id || "",
        client_id: goal.client_id || "", vendedor_id: goal.vendedor_id || "",
        order_id: goal.order_id || "", notes: goal.notes || "",
      });
    } else {
      setSelectedGoal(null);
      setForm({
        year: filterYear, month: new Date().getMonth() + 1, goal_type: "dre",
        metric_key: "", target_amount: "", target_type: "absoluto",
        cost_center_id: "", project_id: "", client_id: "", vendedor_id: "",
        order_id: "", notes: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.metric_key || !form.target_amount) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        year: form.year, month: form.month, goal_type: form.goal_type,
        metric_key: form.metric_key,
        target_amount: parseFloat(form.target_amount.replace(",", ".")),
        target_type: form.target_type,
        cost_center_id: form.cost_center_id || null,
        project_id: form.project_id || null,
        client_id: form.client_id || null,
        vendedor_id: form.vendedor_id || null,
        order_id: form.order_id || null,
        notes: form.notes || null,
      };

      if (selectedGoal) {
        const { error } = await supabase.from("fin_financial_goals").update(payload).eq("id", selectedGoal.id);
        if (error) throw error;
        toast.success("Meta atualizada com sucesso!");
      } else {
        const { error } = await supabase.from("fin_financial_goals").insert(payload);
        if (error) throw error;
        toast.success("Meta criada com sucesso!");
      }
      queryClient.invalidateQueries({ queryKey: ["fin-financial-goals"] });
      setDialogOpen(false);
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (goal: FinancialGoal) => {
    if (!confirm("Tem certeza que deseja excluir esta meta?")) return;
    try {
      const { error } = await supabase.from("fin_financial_goals").delete().eq("id", goal.id);
      if (error) throw error;
      toast.success("Meta excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["fin-financial-goals"] });
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  const formatCurrency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getMetricLabel = (goalType: string, metricKey: string) => {
    const metrics = ALL_METRICS[goalType] || [];
    return metrics.find((m) => m.key === metricKey)?.label || metricKey;
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      dre: "bg-purple-600", cashflow: "bg-cyan-600", vendedor: "bg-blue-600",
      pedido: "bg-orange-600", projeto: "bg-green-600", centro_custo: "bg-pink-600",
    };
    return <Badge className={colors[type] || "bg-muted"}>{GOAL_TYPES.find((t) => t.value === type)?.label || type}</Badge>;
  };

  const currentMetrics = ALL_METRICS[form.goal_type] || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />Metas Financeiras
        </CardTitle>
        <div className="flex items-center gap-4">
          <Select value={filterYear.toString()} onValueChange={(v) => setFilterYear(parseInt(v))}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map((year) => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {GOAL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />Nova Meta
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Métrica</TableHead>
                <TableHead className="text-right">Meta</TableHead>
                <TableHead>Tipo Meta</TableHead>
                <TableHead>Dimensão</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {goals?.map((goal) => {
                const dimParts: string[] = [];
                if (goal.cost_center_id) dimParts.push(`CC: ${costCenters?.find((c) => c.id === goal.cost_center_id)?.name || "?"}`);
                if (goal.vendedor_id) dimParts.push(`Vend: ${vendedores?.find((v) => v.id === goal.vendedor_id)?.full_name || "?"}`);
                if (goal.client_id) dimParts.push(`Cli: ${clients?.find((c) => c.id === goal.client_id)?.name || "?"}`);
                if (goal.project_id) dimParts.push(`Proj: ${projects?.find((p) => p.id === goal.project_id)?.name || "?"}`);
                
                return (
                  <TableRow key={goal.id}>
                    <TableCell className="font-medium">{MONTHS.find((m) => m.value === goal.month)?.label}</TableCell>
                    <TableCell>{getTypeBadge(goal.goal_type)}</TableCell>
                    <TableCell>{getMetricLabel(goal.goal_type, goal.metric_key)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(goal.target_amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {TARGET_TYPES.find((t) => t.value === goal.target_type)?.label || goal.target_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {dimParts.length > 0 ? dimParts.join(" | ") : "Global"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(goal)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(goal)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!goals || goals.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma meta cadastrada para {filterYear}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedGoal ? "Editar Meta" : "Nova Meta Financeira"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ano *</Label>
                <Select value={form.year.toString()} onValueChange={(v) => setForm({ ...form, year: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map((year) => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mês *</Label>
                <Select value={form.month.toString()} onValueChange={(v) => setForm({ ...form, month: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.goal_type} onValueChange={(v) => setForm({ ...form, goal_type: v, metric_key: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GOAL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Métrica *</Label>
                <Select value={form.metric_key} onValueChange={(v) => setForm({ ...form, metric_key: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {currentMetrics.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor da Meta *</Label>
                <Input value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Meta</Label>
                <Select value={form.target_type} onValueChange={(v) => setForm({ ...form, target_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TARGET_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Centro de Custo</Label>
                <Select value={form.cost_center_id} onValueChange={(v) => setForm({ ...form, cost_center_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {costCenters?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Projeto</Label>
                <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {projects?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {clients?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vendedor</Label>
                <Select value={form.vendedor_id} onValueChange={(v) => setForm({ ...form, vendedor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {vendedores?.map((v) => <SelectItem key={v.id} value={v.id}>{v.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observações sobre a meta..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedGoal ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
