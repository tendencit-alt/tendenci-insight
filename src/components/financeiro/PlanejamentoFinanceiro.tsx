import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { TrafficLight } from "./TrafficLight";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Target, Plus, Pencil, Trash2, Loader2, TrendingUp,
  BarChart3, Wallet, AlertTriangle, CheckCircle, ShieldAlert, Gauge,
  Calendar, Users, ShoppingCart, FolderOpen, Building2, ArrowUpDown,
} from "lucide-react";
import { getDaysInMonth, getDate } from "date-fns";
import { cn } from "@/lib/utils";

interface PlanejamentoFinanceiroProps {
  filters: FinanceiroFiltersState;
}

interface FinancialGoal {
  id: string;
  year: number;
  month: number;
  goal_type: string;
  metric_key: string;
  target_amount: number;
  target_type: string;
  period_type: string;
  cost_center_id: string | null;
  project_id: string | null;
  client_id: string | null;
  vendedor_id: string | null;
  order_id: string | null;
  notes: string | null;
}

const DRE_METRICS = [
  { key: "receitas", label: "Receitas" },
  { key: "despesas_sobre_vendas", label: "Despesas sobre Vendas" },
  { key: "receita_liquida", label: "Receita Líquida" },
  { key: "margem_contribuicao", label: "Margem de Contribuição" },
  { key: "despesas_operacionais", label: "Despesas Operacionais" },
  { key: "resultado_operacional_ebitda", label: "EBITDA" },
  { key: "resultado_antes_impostos", label: "Resultado Antes dos Impostos" },
  { key: "resultado_liquido", label: "Resultado Líquido" },
];

const CASHFLOW_METRICS = [
  { key: "entradas_operacionais", label: "Entradas Operacionais" },
  { key: "saidas_operacionais", label: "Saídas Operacionais" },
  { key: "geracao_operacional", label: "Geração Operacional de Caixa" },
  { key: "resultado_financeiro_caixa", label: "Resultado Financeiro Caixa" },
  { key: "movimentacoes_capital", label: "Movimentações Capital" },
  { key: "investimentos", label: "Investimentos" },
  { key: "saldo_final", label: "Saldo Final Caixa" },
];

const INDICATOR_METRICS = [
  { key: "margem_contribuicao_pct", label: "Margem Contribuição %", unit: "%" },
  { key: "margem_ebitda_pct", label: "Margem EBITDA %", unit: "%" },
  { key: "resultado_liquido_pct", label: "Resultado Líquido %", unit: "%" },
  { key: "burn_rate", label: "Burn Rate Mensal", unit: "R$" },
  { key: "runway", label: "Runway (meses)", unit: "meses" },
  { key: "saldo_minimo_caixa", label: "Saldo Mínimo Caixa", unit: "R$" },
  { key: "ponto_equilibrio", label: "Ponto de Equilíbrio Mensal", unit: "R$" },
];

const VENDEDOR_METRICS = [
  { key: "receita_vendedor", label: "Receita Meta" },
  { key: "margem_vendedor", label: "Margem Meta" },
  { key: "ticket_medio_vendedor", label: "Ticket Médio Meta" },
  { key: "taxa_conversao_vendedor", label: "Taxa Conversão Meta", unit: "%" },
];

const PEDIDO_METRICS = [
  { key: "margem_minima_pedido", label: "Margem Mínima Aceitável", unit: "%" },
  { key: "ticket_medio_minimo", label: "Ticket Médio Mínimo" },
  { key: "prazo_max_execucao", label: "Prazo Máximo Execução", unit: "dias" },
  { key: "prazo_max_recebimento", label: "Prazo Máximo Recebimento", unit: "dias" },
];

const PROJETO_METRICS = [
  { key: "custo_maximo_projeto", label: "Custo Máximo Permitido" },
  { key: "prazo_execucao_projeto", label: "Prazo Execução", unit: "dias" },
  { key: "margem_minima_projeto", label: "Margem Mínima Projeto", unit: "%" },
];

const CC_METRICS = [
  { key: "limite_mensal_cc", label: "Limite Mensal" },
  { key: "limite_percentual_receita_cc", label: "Limite % Receita", unit: "%" },
  { key: "limite_anual_cc", label: "Limite Anual" },
];

const TARGET_TYPES = [
  { value: "absoluto", label: "Absoluto" },
  { value: "percentual", label: "Percentual" },
  { value: "acumulado", label: "Acumulado" },
  { value: "progressivo", label: "Progressivo" },
  { value: "limite_min", label: "Limite Mínimo" },
  { value: "limite_max", label: "Limite Máximo" },
];

const _MONTHS = [
  { value: 1, label: "Jan" }, { value: 2, label: "Fev" }, { value: 3, label: "Mar" },
  { value: 4, label: "Abr" }, { value: 5, label: "Mai" }, { value: 6, label: "Jun" },
  { value: 7, label: "Jul" }, { value: 8, label: "Ago" }, { value: 9, label: "Set" },
  { value: 10, label: "Out" }, { value: 11, label: "Nov" }, { value: 12, label: "Dez" },
];

const MONTHS_FULL = [
  { value: 1, label: "Janeiro" }, { value: 2, label: "Fevereiro" }, { value: 3, label: "Março" },
  { value: 4, label: "Abril" }, { value: 5, label: "Maio" }, { value: 6, label: "Junho" },
  { value: 7, label: "Julho" }, { value: 8, label: "Agosto" }, { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" }, { value: 11, label: "Novembro" }, { value: 12, label: "Dezembro" },
];

const GOAL_TYPE_TABS = [
  { value: "dre", label: "Meta DRE", icon: BarChart3 },
  { value: "cashflow", label: "Meta Fluxo", icon: Wallet },
  { value: "indicator", label: "Indicadores", icon: Gauge },
  { value: "vendedor", label: "Vendedor", icon: Users },
  { value: "pedido", label: "Pedido", icon: ShoppingCart },
  { value: "projeto", label: "Projeto", icon: FolderOpen },
  { value: "centro_custo", label: "Centro Custo", icon: Building2 },
  { value: "forecast", label: "Forecast", icon: ArrowUpDown },
];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function getAlertColor(pct: number) {
  if (pct >= 100) return "green";
  if (pct >= 85) return "yellow";
  return "red";
}

function getAlertBadge(pct: number) {
  const color = getAlertColor(pct);
  if (color === "green") return <Badge className="bg-green-600 text-white text-[10px]">✓ Atingida</Badge>;
  if (color === "yellow") return <Badge className="bg-yellow-500 text-white text-[10px]">⚠ Próximo</Badge>;
  return <Badge className="bg-red-600 text-white text-[10px]">✗ Abaixo</Badge>;
}

function getMetricsForType(goalType: string) {
  switch (goalType) {
    case "dre": return DRE_METRICS;
    case "cashflow": return CASHFLOW_METRICS;
    case "indicator": return INDICATOR_METRICS;
    case "vendedor": return VENDEDOR_METRICS;
    case "pedido": return PEDIDO_METRICS;
    case "projeto": return PROJETO_METRICS;
    case "centro_custo": return CC_METRICS;
    default: return DRE_METRICS;
  }
}

// ============ HOOK: Realized DRE & Cashflow data ============
function useRealizedData(filters: FinanceiroFiltersState, year: number, month: number) {
  return useQuery({
    queryKey: ["planning-realized", year, month, filters.costCenterId, filters.projectId, filters.clientId, filters.vendedorId, filters.orderId],
    queryFn: async () => {
      const dateFrom = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = getDaysInMonth(new Date(year, month - 1));
      const dateTo = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

      const { data: chartAccounts } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name, nature")
        .eq("active", true);

      const classifyAccount = (code: string, nature: string | null) => {
        const main = parseFloat(code.split(".")[0]);
        const sub = code.includes(".") ? parseFloat(code.split(".")[1]) : 0;
        if (main === 1) return "receita";
        if (main === 2 && sub === 1) return "impostos_venda";
        if (main === 2 && sub === 2) return "taxas_venda";
        if (main === 2 && sub === 3) return "custos_diretos";
        if (main === 2 && sub === 4) return "comissoes";
        if (main === 2 && sub === 5) return "antecipacao";
        if (main === 2) return "impostos_venda";
        if (main === 3) return "despesa_op";
        if (main === 4) return "depreciacao";
        if (main === 5 && nature === "RECEITA") return "receita_fin";
        if (main === 5 && nature === "DESPESA") return "despesa_fin";
        if (main === 5) return "resultado_fin";
        if (main === 6 && sub === 1) return "capital_entrada";
        if (main === 6 && sub === 2) return "capital_saida";
        if (main === 6) return "capital_entrada";
        if (main === 7) return "impostos_resultado";
        if (main === 8) return "investimentos";
        return nature === "RECEITA" ? "receita" : "despesa_op";
      };

      const accountMap = new Map(
        chartAccounts?.map((a) => [a.id, { ...a, cat: classifyAccount(a.code, a.nature) }]) || []
      );

      // DRE (competence)
      let dreQ = supabase
        .from("fin_ledger_entries")
        .select("chart_account_id, amount, status")
        .neq("status", "CANCELADO")
        .gte("competence_date", dateFrom)
        .lte("competence_date", dateTo)
        .not("competence_date", "is", null);
      if (filters.costCenterId) dreQ = dreQ.eq("cost_center_id", filters.costCenterId);
      if (filters.projectId) dreQ = dreQ.eq("project_id", filters.projectId);
      if (filters.clientId) dreQ = dreQ.eq("client_id", filters.clientId);
      if (filters.vendedorId) dreQ = dreQ.eq("vendedor_id", filters.vendedorId);
      if (filters.orderId) dreQ = dreQ.eq("order_id", filters.orderId);
      const { data: dreEntries } = await dreQ;

      // Cashflow (cash_date)
      let cashQ = supabase
        .from("fin_ledger_entries")
        .select("chart_account_id, amount, status")
        .neq("status", "CANCELADO")
        .gte("cash_date", dateFrom)
        .lte("cash_date", dateTo)
        .not("cash_date", "is", null);
      if (filters.costCenterId) cashQ = cashQ.eq("cost_center_id", filters.costCenterId);
      if (filters.projectId) cashQ = cashQ.eq("project_id", filters.projectId);
      if (filters.clientId) cashQ = cashQ.eq("client_id", filters.clientId);
      if (filters.vendedorId) cashQ = cashQ.eq("vendedor_id", filters.vendedorId);
      if (filters.orderId) cashQ = cashQ.eq("order_id", filters.orderId);
      if (filters.bankAccountId) cashQ = cashQ.eq("bank_account_id", filters.bankAccountId);
      const { data: cashEntries } = await cashQ;

      // Opening balance
      let balQ = supabase.from("fin_bank_accounts").select("opening_balance").eq("active", true);
      if (filters.bankAccountId) balQ = balQ.eq("id", filters.bankAccountId);
      const { data: bankAccounts } = await balQ;
      const openingBalance = bankAccounts?.reduce((s, a) => s + Number(a.opening_balance || 0), 0) || 0;

      // Aggregate DRE
      let receitas = 0, impostosVenda = 0, taxasVenda = 0, custosDiretos = 0;
      let comissoes = 0, antecipacao = 0, despesaOp = 0, depreciacao = 0;
      let receitaFin = 0, despesaFin = 0, impostosRes = 0;

      dreEntries?.forEach((e) => {
        const acc = accountMap.get(e.chart_account_id || "");
        if (!acc) return;
        const amt = Number(e.amount);
        const c = acc.cat;
        if (c === "receita") receitas += amt;
        else if (c === "impostos_venda") impostosVenda += amt;
        else if (c === "taxas_venda") taxasVenda += amt;
        else if (c === "custos_diretos") custosDiretos += amt;
        else if (c === "comissoes") comissoes += amt;
        else if (c === "antecipacao") antecipacao += amt;
        else if (c === "despesa_op") despesaOp += amt;
        else if (c === "depreciacao") depreciacao += amt;
        else if (c === "receita_fin") receitaFin += amt;
        else if (c === "despesa_fin") despesaFin += amt;
        else if (c === "impostos_resultado") impostosRes += amt;
      });

      const despesasSobreVendas = impostosVenda + taxasVenda + custosDiretos + comissoes + antecipacao;
      const receitaLiquida = receitas - despesasSobreVendas;
      const margemContribuicao = receitaLiquida - custosDiretos - comissoes;
      const ebitda = margemContribuicao - despesaOp;
      const resultadoFinanceiro = receitaFin - despesaFin;
      const rai = ebitda - depreciacao + resultadoFinanceiro;
      const resultadoLiquido = rai - impostosRes;

      // Aggregate Cashflow
      let entOp = 0, saiVenda = 0, saiEstrutura = 0, recFin = 0, despFin2 = 0;
      let capEnt = 0, capSai = 0, invest = 0;

      cashEntries?.forEach((e) => {
        const acc = accountMap.get(e.chart_account_id || "");
        if (!acc) return;
        const amt = Number(e.amount);
        const c = acc.cat;
        if (c === "receita") entOp += amt;
        else if (["impostos_venda", "taxas_venda", "custos_diretos", "comissoes", "antecipacao"].includes(c)) saiVenda += amt;
        else if (c === "despesa_op") saiEstrutura += amt;
        else if (c === "receita_fin") recFin += amt;
        else if (c === "despesa_fin") despFin2 += amt;
        else if (c === "capital_entrada") capEnt += amt;
        else if (c === "capital_saida") capSai += amt;
        else if (c === "investimentos") invest += amt;
      });

      const geracaoOp = entOp - saiVenda - saiEstrutura;
      const resFin = recFin - despFin2;
      const variacaoLiquida = geracaoOp + resFin + capEnt - capSai - invest;
      const saldoFinal = openingBalance + variacaoLiquida;

      // Calculate indicators
      const margemContPct = receitas > 0 ? (margemContribuicao / receitas) * 100 : 0;
      const margemEbitdaPct = receitas > 0 ? (ebitda / receitas) * 100 : 0;
      const resLiqPct = receitas > 0 ? (resultadoLiquido / receitas) * 100 : 0;
      const burnRate = Math.abs(saiVenda + saiEstrutura + despFin2 + invest);
      const runway = burnRate > 0 ? saldoFinal / burnRate : 999;
      const peq = margemContPct > 0 ? Math.abs(despesaOp) / (margemContPct / 100) : 0;

      // Day-based projection
      const today = new Date();
      const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
      const diasCorridos = isCurrentMonth ? getDate(today) : lastDay;
      const diasTotais = lastDay;
      const pctMes = diasCorridos / diasTotais;

      return {
        dre: {
          receitas, despesas_sobre_vendas: despesasSobreVendas, receita_liquida: receitaLiquida,
          margem_contribuicao: margemContribuicao, despesas_operacionais: despesaOp,
          resultado_operacional_ebitda: ebitda, resultado_antes_impostos: rai,
          resultado_liquido: resultadoLiquido,
        },
        cashflow: {
          entradas_operacionais: entOp, saidas_operacionais: saiVenda + saiEstrutura,
          geracao_operacional: geracaoOp, resultado_financeiro_caixa: resFin,
          movimentacoes_capital: capEnt - capSai, investimentos: invest, saldo_final: saldoFinal,
        },
        indicators: {
          margem_contribuicao_pct: margemContPct, margem_ebitda_pct: margemEbitdaPct,
          resultado_liquido_pct: resLiqPct, burn_rate: burnRate, runway,
          saldo_minimo_caixa: saldoFinal, ponto_equilibrio: peq,
        },
        projections: {
          pctMes, diasCorridos, diasTotais,
          ebitdaProjetado: pctMes > 0 ? ebitda / pctMes : 0,
          resLiqProjetado: pctMes > 0 ? resultadoLiquido / pctMes : 0,
          saldoProjetado30: saldoFinal + (variacaoLiquida > 0 ? variacaoLiquida : 0),
          saldoProjetado90: saldoFinal + (variacaoLiquida > 0 ? variacaoLiquida * 3 : variacaoLiquida * 3),
          runwayEstimado: burnRate > 0 ? saldoFinal / burnRate : 999,
        },
      };
    },
  });
}

// ============ MAIN COMPONENT ============
export function PlanejamentoFinanceiro({ filters }: PlanejamentoFinanceiroProps) {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState("dre");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [executiveMode, setExecutiveMode] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    goal_type: "dre" as string,
    metric_key: "",
    target_amount: "",
    target_type: "absoluto",
    period_type: "monthly",
    cost_center_id: "",
    project_id: "",
    client_id: "",
    vendedor_id: "",
    order_id: "",
    notes: "",
  });

  const realized = useRealizedData(filters, filterYear, filterMonth);

  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ["fin-planning-goals", filterYear, filterMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fin_financial_goals")
        .select("*")
        .eq("year", filterYear)
        .eq("month", filterMonth)
        .order("goal_type")
        .order("metric_key");
      if (error) throw error;
      return (data || []) as FinancialGoal[];
    },
  });

  const { data: _allYearGoals } = useQuery({
    queryKey: ["fin-planning-goals-year", filterYear],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_financial_goals")
        .select("*")
        .eq("year", filterYear)
        .order("month")
        .order("metric_key");
      return (data || []) as FinancialGoal[];
    },
  });

  // Forecasts
  const { data: forecasts } = useQuery({
    queryKey: ["fin-forecasts", filterYear, filterMonth],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_forecasts")
        .select("*")
        .eq("year", filterYear)
        .eq("month", filterMonth);
      return data || [];
    },
  });

  const { activeTenantId: _planningTenant } = useActiveTenant();
  const { data: costCenters } = useQuery({
    queryKey: ["fin-cost-centers-planning", _planningTenant],
    enabled: !!_planningTenant,
    queryFn: async () => {
      const { data } = await supabase.from("fin_cost_centers").select("id, name").eq("tenant_id", _planningTenant!).eq("active", true).order("name");
      return data || [];
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["fin-projects-planning", _planningTenant],
    enabled: !!_planningTenant,
    queryFn: async () => {
      const { data } = await supabase.from("fin_projects").select("id, name").eq("tenant_id", _planningTenant!).eq("status", "ativo").order("name");
      return data || [];
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["fin-clients-planning"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name").limit(500);
      return data || [];
    },
  });

  const { data: vendedores } = useQuery({
    queryKey: ["fin-vendedores-planning"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name").order("full_name");
      return data || [];
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["fin-orders-planning"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("id, order_number").order("order_number", { ascending: false }).limit(200);
      return data || [];
    },
  });

  const { data: companySettings } = useQuery({
    queryKey: ["company-settings-safety"],
    queryFn: async () => {
      const { data } = await supabase.from("company_settings").select("min_safety_balance").limit(1).maybeSingle();
      return data;
    },
  });

  const minSafetyBalance = Number(companySettings?.min_safety_balance || 0);

  // Goal maps
  const dreGoals = new Map<string, number>();
  const cashGoals = new Map<string, number>();
  const indicatorGoals = new Map<string, number>();
  const vendedorGoals = new Map<string, number>();
  const pedidoGoals = new Map<string, number>();
  const projetoGoals = new Map<string, number>();
  const ccGoals = new Map<string, number>();
  
  goals?.forEach((g) => {
    const map = g.goal_type === "dre" ? dreGoals
      : g.goal_type === "cashflow" ? cashGoals
      : g.goal_type === "indicator" ? indicatorGoals
      : g.goal_type === "vendedor" ? vendedorGoals
      : g.goal_type === "pedido" ? pedidoGoals
      : g.goal_type === "projeto" ? projetoGoals
      : g.goal_type === "centro_custo" ? ccGoals
      : dreGoals;
    map.set(g.metric_key, g.target_amount);
  });

  const handleOpenDialog = (goalType: string, goal?: FinancialGoal) => {
    if (goal) {
      setSelectedGoal(goal);
      setForm({
        year: goal.year, month: goal.month, goal_type: goal.goal_type,
        metric_key: goal.metric_key, target_amount: goal.target_amount.toString(),
        target_type: goal.target_type || "absoluto",
        period_type: goal.period_type || "monthly",
        cost_center_id: goal.cost_center_id || "", project_id: goal.project_id || "",
        client_id: goal.client_id || "", vendedor_id: goal.vendedor_id || "",
        order_id: goal.order_id || "", notes: goal.notes || "",
      });
    } else {
      setSelectedGoal(null);
      setForm({
        year: filterYear, month: filterMonth, goal_type: goalType,
        metric_key: "", target_amount: "", target_type: "absoluto",
        period_type: "monthly", cost_center_id: "", project_id: "",
        client_id: "", vendedor_id: "", order_id: "", notes: "",
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
        period_type: form.period_type,
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
        toast.success("Meta atualizada!");
      } else {
        const { error } = await supabase.from("fin_financial_goals").insert(payload);
        if (error) throw error;
        toast.success("Meta criada!");
      }
      queryClient.invalidateQueries({ queryKey: ["fin-planning-goals"] });
      queryClient.invalidateQueries({ queryKey: ["fin-planning-goals-year"] });
      queryClient.invalidateQueries({ queryKey: ["fin-forecasts"] });
      setDialogOpen(false);
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta meta?")) return;
    const { error } = await supabase.from("fin_financial_goals").delete().eq("id", id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Meta excluída!");
    queryClient.invalidateQueries({ queryKey: ["fin-planning-goals"] });
    queryClient.invalidateQueries({ queryKey: ["fin-planning-goals-year"] });
  };

  const currentMetrics = getMetricsForType(form.goal_type);
  const rd = realized.data;

  // ============ ALERTS ============
  const alerts: { type: "red" | "yellow" | "green"; message: string }[] = [];
  if (rd) {
    const dreM = rd.dre;
    const dreTarget = (key: string) => dreGoals.get(key) || 0;
    const checkDre = (key: string, val: number, label: string) => {
      const t = dreTarget(key);
      if (t > 0) {
        const p = (val / t) * 100;
        if (p < 60) alerts.push({ type: "red", message: `${label}: ${formatPercent(p)} da meta` });
        else if (p < 85) alerts.push({ type: "yellow", message: `${label}: ${formatPercent(p)} da meta` });
      }
    };
    checkDre("receitas", dreM.receitas, "Receita");
    checkDre("margem_contribuicao", dreM.margem_contribuicao, "Margem Contribuição");
    checkDre("resultado_operacional_ebitda", dreM.resultado_operacional_ebitda, "EBITDA");
    if (dreM.resultado_operacional_ebitda < 0) alerts.push({ type: "red", message: "EBITDA negativo" });
    if (rd.indicators.burn_rate > 0 && rd.indicators.runway < 3) alerts.push({ type: "red", message: `Runway inferior a 3 meses (${rd.indicators.runway.toFixed(1)}m)` });
    if (minSafetyBalance > 0 && rd.cashflow.saldo_final < minSafetyBalance) alerts.push({ type: "red", message: `Saldo caixa (${formatCurrency(rd.cashflow.saldo_final)}) abaixo do mínimo (${formatCurrency(minSafetyBalance)})` });
    if (dreM.margem_contribuicao < 0) alerts.push({ type: "red", message: "Margem de contribuição negativa" });
  }

  // Forecast data map
  const forecastMap = new Map<string, number>();
  forecasts?.forEach((f: any) => forecastMap.set(f.metric_key, Number(f.forecast_amount)));

  // ============ RENDER ============
  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Select value={filterYear.toString()} onValueChange={(v) => setFilterYear(parseInt(v))}>
            <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterMonth.toString()} onValueChange={(v) => setFilterMonth(parseInt(v))}>
            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS_FULL.map((m) => (
                <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch checked={executiveMode} onCheckedChange={setExecutiveMode} />
            <span className="text-xs text-muted-foreground">Executivo</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((a, i) => (
            <div key={i} className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
              a.type === "red" && "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300",
              a.type === "yellow" && "border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300",
            )}>
              {a.type === "red" ? <ShieldAlert className="h-4 w-4 flex-shrink-0" /> : <AlertTriangle className="h-4 w-4 flex-shrink-0" />}
              {a.message}
            </div>
          ))}
        </div>
      )}

      {/* Executive Summary Dashboard */}
      {executiveMode && rd && (
        <ExecutiveSummary
          dre={rd.dre}
          cashflow={rd.cashflow}
          indicators={rd.indicators}
          projections={rd.projections}
          dreGoals={dreGoals}
          cashGoals={cashGoals}
          indicatorGoals={indicatorGoals}
          forecastMap={forecastMap}
          minSafetyBalance={minSafetyBalance}
        />
      )}

      {/* Sub-tabs */}
      {!executiveMode && (
        <Tabs value={subTab} onValueChange={setSubTab}>
          <div className="overflow-x-auto">
            <TabsList className="inline-flex h-auto gap-1 bg-muted/50 p-1">
              {GOAL_TYPE_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs px-3 py-1.5">
                  <tab.icon className="h-3.5 w-3.5" />{tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* DRE */}
          <TabsContent value="dre" className="space-y-4 mt-4">
            <MetaTable
              title="Meta DRE (Competência)"
              goalType="dre"
              metrics={DRE_METRICS}
              realized={rd?.dre || {}}
              projections={rd?.projections}
              goalsMap={dreGoals}
              forecastMap={forecastMap}
              goalsList={goals?.filter((g) => g.goal_type === "dre") || []}
              onAdd={() => handleOpenDialog("dre")}
              onEdit={(g) => handleOpenDialog("dre", g)}
              onDelete={handleDelete}
              isLoading={goalsLoading || realized.isLoading}
              isCurrency
            />
          </TabsContent>

          {/* Cashflow */}
          <TabsContent value="cashflow" className="space-y-4 mt-4">
            <MetaTable
              title="Meta Fluxo de Caixa (Realizado)"
              goalType="cashflow"
              metrics={CASHFLOW_METRICS}
              realized={rd?.cashflow || {}}
              projections={rd?.projections}
              goalsMap={cashGoals}
              forecastMap={forecastMap}
              goalsList={goals?.filter((g) => g.goal_type === "cashflow") || []}
              onAdd={() => handleOpenDialog("cashflow")}
              onEdit={(g) => handleOpenDialog("cashflow", g)}
              onDelete={handleDelete}
              isLoading={goalsLoading || realized.isLoading}
              isCurrency
            />
          </TabsContent>

          {/* Indicators */}
          <TabsContent value="indicator" className="space-y-4 mt-4">
            <MetaTable
              title="Meta Indicadores Executivos"
              goalType="indicator"
              metrics={INDICATOR_METRICS}
              realized={rd?.indicators || {}}
              goalsMap={indicatorGoals}
              forecastMap={forecastMap}
              goalsList={goals?.filter((g) => g.goal_type === "indicator") || []}
              onAdd={() => handleOpenDialog("indicator")}
              onEdit={(g) => handleOpenDialog("indicator", g)}
              onDelete={handleDelete}
              isLoading={goalsLoading || realized.isLoading}
              isCurrency={false}
            />
          </TabsContent>

          {/* Vendedor */}
          <TabsContent value="vendedor" className="space-y-4 mt-4">
            <MetaTable
              title="Meta por Vendedor"
              goalType="vendedor"
              metrics={VENDEDOR_METRICS}
              realized={{}}
              goalsMap={vendedorGoals}
              forecastMap={forecastMap}
              goalsList={goals?.filter((g) => g.goal_type === "vendedor") || []}
              onAdd={() => handleOpenDialog("vendedor")}
              onEdit={(g) => handleOpenDialog("vendedor", g)}
              onDelete={handleDelete}
              isLoading={goalsLoading}
              isCurrency
              dimensionLabel="vendedor"
              dimensionOptions={vendedores?.map((v) => ({ id: v.id, name: v.full_name || "" })) || []}
              goalsList2={goals?.filter((g) => g.goal_type === "vendedor") || []}
            />
          </TabsContent>

          {/* Pedido */}
          <TabsContent value="pedido" className="space-y-4 mt-4">
            <MetaTable
              title="Meta por Pedido"
              goalType="pedido"
              metrics={PEDIDO_METRICS}
              realized={{}}
              goalsMap={pedidoGoals}
              forecastMap={forecastMap}
              goalsList={goals?.filter((g) => g.goal_type === "pedido") || []}
              onAdd={() => handleOpenDialog("pedido")}
              onEdit={(g) => handleOpenDialog("pedido", g)}
              onDelete={handleDelete}
              isLoading={goalsLoading}
              isCurrency={false}
            />
          </TabsContent>

          {/* Projeto */}
          <TabsContent value="projeto" className="space-y-4 mt-4">
            <MetaTable
              title="Meta por Projeto Financeiro"
              goalType="projeto"
              metrics={PROJETO_METRICS}
              realized={{}}
              goalsMap={projetoGoals}
              forecastMap={forecastMap}
              goalsList={goals?.filter((g) => g.goal_type === "projeto") || []}
              onAdd={() => handleOpenDialog("projeto")}
              onEdit={(g) => handleOpenDialog("projeto", g)}
              onDelete={handleDelete}
              isLoading={goalsLoading}
              isCurrency={false}
            />
          </TabsContent>

          {/* Centro de Custo */}
          <TabsContent value="centro_custo" className="space-y-4 mt-4">
            <MetaTable
              title="Meta por Centro de Custo"
              goalType="centro_custo"
              metrics={CC_METRICS}
              realized={{}}
              goalsMap={ccGoals}
              forecastMap={forecastMap}
              goalsList={goals?.filter((g) => g.goal_type === "centro_custo") || []}
              onAdd={() => handleOpenDialog("centro_custo")}
              onEdit={(g) => handleOpenDialog("centro_custo", g)}
              onDelete={handleDelete}
              isLoading={goalsLoading}
              isCurrency
            />
          </TabsContent>

          {/* Forecast */}
          <TabsContent value="forecast" className="space-y-4 mt-4">
            <ForecastPanel
              year={filterYear}
              month={filterMonth}
              dre={rd?.dre || {}}
              cashflow={rd?.cashflow || {}}
              projections={rd?.projections}
              dreGoals={dreGoals}
              cashGoals={cashGoals}
              forecastMap={forecastMap}
              isLoading={realized.isLoading}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Goal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedGoal ? "Editar Meta" : "Nova Meta"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Ano</Label>
                <Select value={form.year.toString()} onValueChange={(v) => setForm({ ...form, year: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mês</Label>
                <Select value={form.month.toString()} onValueChange={(v) => setForm({ ...form, month: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS_FULL.map((m) => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Período</Label>
                <Select value={form.period_type} onValueChange={(v) => setForm({ ...form, period_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={form.goal_type} onValueChange={(v) => setForm({ ...form, goal_type: v, metric_key: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dre">DRE</SelectItem>
                    <SelectItem value="cashflow">Fluxo de Caixa</SelectItem>
                    <SelectItem value="indicator">Indicador</SelectItem>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                    <SelectItem value="pedido">Pedido</SelectItem>
                    <SelectItem value="projeto">Projeto</SelectItem>
                    <SelectItem value="centro_custo">Centro de Custo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Métrica</Label>
                <Select value={form.metric_key} onValueChange={(v) => setForm({ ...form, metric_key: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {currentMetrics.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Valor da Meta</Label>
                <Input value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} placeholder="0,00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de Meta</Label>
                <Select value={form.target_type} onValueChange={(v) => setForm({ ...form, target_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TARGET_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dimensional filters */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Centro de Custo</Label>
                <Select value={form.cost_center_id} onValueChange={(v) => setForm({ ...form, cost_center_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {costCenters?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Projeto</Label>
                <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {projects?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Cliente</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {clients?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Vendedor</Label>
                <Select value={form.vendedor_id} onValueChange={(v) => setForm({ ...form, vendedor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {vendedores?.map((v) => <SelectItem key={v.id} value={v.id}>{v.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Pedido</Label>
              <Select value={form.order_id} onValueChange={(v) => setForm({ ...form, order_id: v })}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {orders?.map((o) => <SelectItem key={o.id} value={o.id}>#{o.order_number}</SelectItem>)}
                </SelectContent>
              </Select>
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
    </div>
  );
}

// ============ META TABLE COMPONENT ============
interface MetaTableProps {
  title: string;
  goalType: string;
  metrics: { key: string; label: string; unit?: string }[];
  realized: Record<string, number>;
  projections?: any;
  goalsMap: Map<string, number>;
  forecastMap: Map<string, number>;
  goalsList: FinancialGoal[];
  onAdd: () => void;
  onEdit: (g: FinancialGoal) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
  isCurrency: boolean;
  dimensionLabel?: string;
  dimensionOptions?: { id: string; name: string }[];
  goalsList2?: FinancialGoal[];
}

function MetaTable({ title, metrics, realized, projections, goalsMap, forecastMap, goalsList, onAdd, onEdit, onDelete, isLoading, isCurrency }: MetaTableProps) {
  const fmt = (v: number, key?: string) => {
    if (!isCurrency) {
      const m = metrics.find((x) => x.key === key);
      if (m?.unit === "%") return formatPercent(v);
      if (m?.unit === "meses") return `${v.toFixed(1)} meses`;
      if (m?.unit === "dias") return `${v.toFixed(0)} dias`;
    }
    return formatCurrency(v);
  };

  if (isLoading) return <Skeleton className="h-[300px]" />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />{title}
        </CardTitle>
        <Button size="sm" onClick={onAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />Nova Meta
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Métrica</TableHead>
              <TableHead className="text-right">Meta</TableHead>
              <TableHead className="text-right">Realizado</TableHead>
              <TableHead className="text-right">Forecast</TableHead>
              <TableHead className="text-right">Gap</TableHead>
              <TableHead className="text-right">% Atingido</TableHead>
              {projections && <TableHead className="text-right">Projeção Mês</TableHead>}
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.map((metric) => {
              const target = goalsMap.get(metric.key) || 0;
              const actual = realized[metric.key] || 0;
              const forecast = forecastMap.get(metric.key) || 0;
              const diff = actual - target;
              const pct = target !== 0 ? (actual / target) * 100 : 0;
              const goal = goalsList.find((g) => g.metric_key === metric.key);

              // Project end of month
              let projected = actual;
              if (projections && projections.pctMes > 0 && isCurrency) {
                projected = actual / projections.pctMes;
              }

              return (
                <TableRow key={metric.key}>
                  <TableCell className="font-medium text-sm">{metric.label}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {target > 0 ? fmt(target, metric.key) : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className={cn("text-right font-mono text-sm", actual >= 0 ? "text-green-600" : "text-red-600")}>
                    {actual !== 0 ? fmt(actual, metric.key) : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className={cn("text-right font-mono text-xs", forecast > 0 ? "text-blue-600" : "text-muted-foreground")}>
                    {forecast > 0 ? fmt(forecast, metric.key) : "—"}
                  </TableCell>
                  <TableCell className={cn("text-right font-mono text-xs", diff >= 0 ? "text-green-600" : "text-red-600")}>
                    {target > 0 ? fmt(diff, metric.key) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {target > 0 ? <TrafficLight actual={actual} target={target} size="sm" /> : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  {projections && (
                    <TableCell className={cn("text-right font-mono text-xs", projected >= 0 ? "text-blue-600" : "text-red-600")}>
                      {target > 0 ? fmt(projected, metric.key) : "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-center">
                    {target > 0 ? getAlertBadge(pct) : <span className="text-xs text-muted-foreground">Sem meta</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {goal ? (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(goal)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(goal.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onAdd}>
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {/* Existing goals not in standard metrics (dimensional goals) */}
            {goalsList.filter((g) => !metrics.find((m) => m.key === g.metric_key)).map((goal) => (
              <TableRow key={goal.id} className="bg-muted/20">
                <TableCell className="text-sm">{goal.metric_key}</TableCell>
                <TableCell className="text-right font-mono text-sm">{fmt(goal.target_amount)}</TableCell>
                <TableCell colSpan={projections ? 6 : 5} className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Badge variant="outline" className="text-[10px]">{goal.target_type}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(goal)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(goal.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {/* Projection lines */}
            {projections && isCurrency && (
              <TableRow className="bg-muted/30">
                <TableCell colSpan={projections ? 9 : 8} className="text-xs text-muted-foreground py-1.5">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  Evolução mês: {formatPercent(projections.pctMes * 100)} ({projections.diasCorridos}/{projections.diasTotais} dias)
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ============ FORECAST PANEL ============
interface ForecastPanelProps {
  year: number;
  month: number;
  dre: Record<string, number>;
  cashflow: Record<string, number>;
  projections?: any;
  dreGoals: Map<string, number>;
  cashGoals: Map<string, number>;
  forecastMap: Map<string, number>;
  isLoading: boolean;
}

function ForecastPanel({ year, month, dre, cashflow, projections, dreGoals, cashGoals, forecastMap, isLoading }: ForecastPanelProps) {
  if (isLoading) return <Skeleton className="h-[400px]" />;

  const pctMes = projections?.pctMes || 0;
  const allMetrics = [
    ...DRE_METRICS.map((m) => ({ ...m, group: "DRE", actual: dre[m.key] || 0, target: dreGoals.get(m.key) || 0 })),
    ...CASHFLOW_METRICS.map((m) => ({ ...m, group: "Fluxo", actual: cashflow[m.key] || 0, target: cashGoals.get(m.key) || 0 })),
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4" />
          Forecast Dinâmico — {MONTHS_FULL.find((m) => m.value === month)?.label} {year}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Projeção automática baseada no realizado ({projections?.diasCorridos || 0}/{projections?.diasTotais || 0} dias = {formatPercent((pctMes || 0) * 100)})
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grupo</TableHead>
              <TableHead>Métrica</TableHead>
              <TableHead className="text-right">Realizado</TableHead>
              <TableHead className="text-right">Forecast (Projeção)</TableHead>
              <TableHead className="text-right">Meta</TableHead>
              <TableHead className="text-right">Gap da Meta</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allMetrics.map((m) => {
              const forecastVal = forecastMap.get(m.key) || (pctMes > 0 ? m.actual / pctMes : 0);
              const gap = m.target > 0 ? forecastVal - m.target : 0;
              const pct = m.target > 0 ? (forecastVal / m.target) * 100 : 0;

              return (
                <TableRow key={m.key}>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{m.group}</Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{m.label}</TableCell>
                  <TableCell className={cn("text-right font-mono text-sm", m.actual >= 0 ? "text-green-600" : "text-red-600")}>
                    {formatCurrency(m.actual)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-blue-600">
                    {formatCurrency(forecastVal)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {m.target > 0 ? formatCurrency(m.target) : "—"}
                  </TableCell>
                  <TableCell className={cn("text-right font-mono text-xs", gap >= 0 ? "text-green-600" : "text-red-600")}>
                    {m.target > 0 ? formatCurrency(gap) : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {m.target > 0 ? getAlertBadge(pct) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ============ EXECUTIVE SUMMARY ============
interface ExecutiveSummaryProps {
  dre: Record<string, number>;
  cashflow: Record<string, number>;
  indicators: Record<string, number>;
  projections: any;
  dreGoals: Map<string, number>;
  cashGoals: Map<string, number>;
  indicatorGoals: Map<string, number>;
  forecastMap: Map<string, number>;
  minSafetyBalance: number;
}

function ExecutiveSummary({ dre, cashflow, projections, dreGoals, cashGoals, minSafetyBalance }: ExecutiveSummaryProps) {
  const pctMes = projections?.pctMes || 0;
  
  const kpiCards = [
    { label: "Receita", actual: dre.receitas, target: dreGoals.get("receitas") || 0, forecast: pctMes > 0 ? dre.receitas / pctMes : 0, icon: TrendingUp },
    { label: "Margem Contribuição", actual: dre.margem_contribuicao, target: dreGoals.get("margem_contribuicao") || 0, forecast: pctMes > 0 ? dre.margem_contribuicao / pctMes : 0, icon: BarChart3 },
    { label: "EBITDA", actual: dre.resultado_operacional_ebitda, target: dreGoals.get("resultado_operacional_ebitda") || 0, forecast: pctMes > 0 ? dre.resultado_operacional_ebitda / pctMes : 0, icon: Target },
    { label: "Resultado Líquido", actual: dre.resultado_liquido, target: dreGoals.get("resultado_liquido") || 0, forecast: pctMes > 0 ? dre.resultado_liquido / pctMes : 0, icon: CheckCircle },
    { label: "Geração Caixa", actual: cashflow.geracao_operacional, target: cashGoals.get("geracao_operacional") || 0, forecast: pctMes > 0 ? cashflow.geracao_operacional / pctMes : 0, icon: Wallet },
    { label: "Saldo Caixa", actual: cashflow.saldo_final, target: minSafetyBalance || cashGoals.get("saldo_final") || 0, forecast: cashflow.saldo_final, icon: ShieldAlert },
  ];

  const projectionCards = [
    { label: "EBITDA Projetado (Mês)", value: projections.ebitdaProjetado },
    { label: "Resultado Líquido Projetado", value: projections.resLiqProjetado },
    { label: "Saldo Projetado 30d", value: projections.saldoProjetado30 },
    { label: "Saldo Projetado 90d", value: projections.saldoProjetado90 },
    { label: "Runway Estimado", value: projections.runwayEstimado, unit: "meses" },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards with Meta + Forecast */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((kpi, i) => {
          const pct = kpi.target > 0 ? (kpi.actual / kpi.target) * 100 : 0;
          const color = kpi.target > 0 ? getAlertColor(pct) : "green";
          return (
            <Card key={i} className={cn(
              "relative overflow-hidden",
              color === "red" && "border-red-300 dark:border-red-800",
              color === "yellow" && "border-yellow-300 dark:border-yellow-800",
              color === "green" && "border-green-300 dark:border-green-800",
            )}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">{kpi.label}</span>
                  <kpi.icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className={cn("text-lg font-bold font-mono", kpi.actual >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatCurrency(kpi.actual)}
                </div>
                {kpi.target > 0 && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">Meta: {formatCurrency(kpi.target)}</span>
                    <TrafficLight actual={kpi.actual} target={kpi.target} size="sm" />
                  </div>
                )}
                {kpi.forecast > 0 && kpi.forecast !== kpi.actual && (
                  <div className="text-[10px] text-blue-600 mt-0.5">
                    Forecast: {formatCurrency(kpi.forecast)}
                  </div>
                )}
                {kpi.target > 0 && (
                  <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        color === "green" && "bg-green-500",
                        color === "yellow" && "bg-yellow-500",
                        color === "red" && "bg-red-500",
                      )}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Projections */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {projectionCards.map((p, i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{p.label}</span>
              <div className={cn(
                "text-base font-bold font-mono mt-0.5",
                p.unit ? "text-foreground" : p.value >= 0 ? "text-blue-600" : "text-red-600"
              )}>
                {p.unit === "meses" ? `${p.value.toFixed(1)} meses` : formatCurrency(p.value)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Side-by-side DRE vs Meta vs Forecast */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 bg-purple-50 dark:bg-purple-950/20 rounded-t-lg">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-600" />DRE: Realizado vs Meta vs Forecast
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Linha</TableHead>
                  <TableHead className="text-xs text-right">Realizado</TableHead>
                  <TableHead className="text-xs text-right">Meta</TableHead>
                  <TableHead className="text-xs text-right">Forecast</TableHead>
                  <TableHead className="text-xs text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DRE_METRICS.map((m) => {
                  const actual = dre[m.key] || 0;
                  const target = dreGoals.get(m.key) || 0;
                  const forecast = pctMes > 0 ? actual / pctMes : 0;
                  return (
                    <TableRow key={m.key}>
                      <TableCell className="text-xs font-medium">{m.label}</TableCell>
                      <TableCell className={cn("text-right font-mono text-xs", actual >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(actual)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">{target > 0 ? formatCurrency(target) : "—"}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-blue-600">{formatCurrency(forecast)}</TableCell>
                      <TableCell className="text-right">{target > 0 ? <TrafficLight actual={actual} target={target} size="sm" /> : <span className="text-[10px] text-muted-foreground">—</span>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 bg-cyan-50 dark:bg-cyan-950/20 rounded-t-lg">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="h-4 w-4 text-cyan-600" />Fluxo Caixa: Realizado vs Meta vs Forecast
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Linha</TableHead>
                  <TableHead className="text-xs text-right">Realizado</TableHead>
                  <TableHead className="text-xs text-right">Meta</TableHead>
                  <TableHead className="text-xs text-right">Forecast</TableHead>
                  <TableHead className="text-xs text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CASHFLOW_METRICS.map((m) => {
                  const actual = cashflow[m.key] || 0;
                  const target = cashGoals.get(m.key) || 0;
                  const forecast = pctMes > 0 ? actual / pctMes : 0;
                  return (
                    <TableRow key={m.key}>
                      <TableCell className="text-xs font-medium">{m.label}</TableCell>
                      <TableCell className={cn("text-right font-mono text-xs", actual >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(actual)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">{target > 0 ? formatCurrency(target) : "—"}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-blue-600">{formatCurrency(forecast)}</TableCell>
                      <TableCell className="text-right">{target > 0 ? <TrafficLight actual={actual} target={target} size="sm" /> : <span className="text-[10px] text-muted-foreground">—</span>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
