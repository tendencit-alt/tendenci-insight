import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  TrendingUp, TrendingDown, Activity, Target, Lock, Unlock,
  Save, Play, Layers, BarChart3, Wallet, AlertTriangle, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ForecastTabProps {
  filters: FinanceiroFiltersState;
}

type ScenarioType = "conservador" | "provavel" | "agressivo";

const SCENARIO_LABELS: Record<ScenarioType, { label: string; color: string; icon: typeof Target }> = {
  conservador: { label: "Conservador", color: "text-amber-600 border-amber-300 bg-amber-50", icon: AlertTriangle },
  provavel: { label: "Provável", color: "text-blue-600 border-blue-300 bg-blue-50", icon: Target },
  agressivo: { label: "Agressivo", color: "text-green-600 border-green-300 bg-green-50", icon: Zap },
};

const ORIGIN_LABELS: Record<string, string> = {
  automatica: "Automática",
  pipeline: "Pipeline",
  recorrencia: "Recorrência",
  manual: "Manual",
  tendencia_historica: "Tendência",
};

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtCompact = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return fmt(v);
};

export function ForecastTab({ filters }: ForecastTabProps) {
  const queryClient = useQueryClient();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [scenario, setScenario] = useState<ScenarioType>("provavel");
  const [simulationOpen, setSimulationOpen] = useState(false);

  // Simulation adjustments
  const [simAdjustments, setSimAdjustments] = useState({
    revenueChange: 0,
    costChange: 0,
    expenseChange: 0,
    newHires: 0,
    hireCost: 5000,
    investmentAmount: 0,
  });

  // Fetch chart accounts for classification
  const { data: chartAccounts } = useQuery({
    queryKey: ["fin-chart-forecast"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name, nature")
        .eq("active", true);
      return data || [];
    },
  });

  // Fetch 12-month realized data (past months of current year + previous year tail)
  const { data: realizedByMonth, isLoading: loadingRealized } = useQuery({
    queryKey: ["fin-forecast-realized", currentYear],
    queryFn: async () => {
      // Get last 12 months of realized data
      const months: { year: number; month: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - 1 - i, 1);
        months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
      }

      const fromDate = `${months[0].year}-${String(months[0].month).padStart(2, "0")}-01`;
      const lastMonth = months[months.length - 1];
      const lastDay = new Date(lastMonth.year, lastMonth.month, 0).getDate();
      const toDate = `${lastMonth.year}-${String(lastMonth.month).padStart(2, "0")}-${lastDay}`;

      const { data } = await supabase
        .from("fin_ledger_entries")
        .select("chart_account_id, amount, competence_date")
        .neq("status", "CANCELADO")
        .gte("competence_date", fromDate)
        .lte("competence_date", toDate)
        .not("competence_date", "is", null);

      // Group by year-month → chart_account_id → sum
      const result = new Map<string, Map<string, number>>();
      (data || []).forEach((e: any) => {
        const d = new Date(e.competence_date);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        if (!result.has(key)) result.set(key, new Map());
        const m = result.get(key)!;
        m.set(e.chart_account_id, (m.get(e.chart_account_id) || 0) + Number(e.amount));
      });
      return result;
    },
  });

  // Fetch forecast entries
  const { data: forecastEntries, isLoading: loadingForecast } = useQuery({
    queryKey: ["fin-forecast-entries", currentYear, scenario],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_forecast_entries")
        .select("*")
        .eq("scenario", scenario)
        .gte("year", currentYear)
        .lte("year", currentYear + 1);
      return data || [];
    },
  });

  // Fetch recurring contracts for automatic forecast
  const { data: recurringContracts } = useQuery({
    queryKey: ["fin-recurring-for-forecast"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_recurring_contracts")
        .select("base_amount, entry_type, chart_account_id, periodicity, status")
        .eq("status", "active");
      return data || [];
    },
  });

  // Fetch open balance
  const { data: openingBalance } = useQuery({
    queryKey: ["fin-forecast-balance"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_bank_accounts")
        .select("opening_balance")
        .eq("active", true);
      return (data || []).reduce((s, a: any) => s + Number(a.opening_balance || 0), 0);
    },
  });

  // Build account classification
  const classifyAccount = (code: string, nature: string | null) => {
    const main = parseInt(code.split(".")[0]);
    if (main === 1) return "receita";
    if (main === 2) return "deducao";
    if (main === 3) return "despesa_op";
    if (main === 4) return "depreciacao";
    if (main === 5) return nature === "RECEITA" ? "receita_fin" : "despesa_fin";
    if (main === 6) return "capital";
    if (main === 7) return "imposto_resultado";
    return nature === "RECEITA" ? "receita" : "despesa_op";
  };

  const accountClassMap = useMemo(() => {
    const m = new Map<string, string>();
    (chartAccounts || []).forEach((a) => m.set(a.id, classifyAccount(a.code, a.nature)));
    return m;
  }, [chartAccounts]);

  // Compute rolling 12-month forecast
  const rolling12 = useMemo(() => {
    const months: {
      year: number; month: number; label: string; isRealized: boolean;
      receitas: number; deducoes: number; despesas: number; resultado: number;
    }[] = [];

    // Calculate average of last 3 realized months for trend
    const avgReceita = computeAvg("receita");
    const avgDeducao = computeAvg("deducao");
    const avgDespesa = computeAvg("despesa_op");
    const avgDepreciacao = computeAvg("depreciacao");

    // Monthly recurring amounts
    let recurringReceita = 0, recurringDespesa = 0;
    (recurringContracts || []).forEach((c: any) => {
      const monthlyAmt = periodicityToMonthly(Number(c.base_amount), c.periodicity);
      if (c.entry_type === "RECEITA") recurringReceita += monthlyAmt;
      else recurringDespesa += monthlyAmt;
    });

    for (let i = 0; i < 12; i++) {
      const d = new Date(currentYear, currentMonth - 1 + i, 1);
      const yr = d.getFullYear();
      const mo = d.getMonth() + 1;
      const key = `${yr}-${mo}`;
      const isPast = yr < currentYear || (yr === currentYear && mo < currentMonth);
      const isCurrent = yr === currentYear && mo === currentMonth;
      const isRealized = isPast;

      let receitas = 0, deducoes = 0, despesas = 0;

      if (isRealized || isCurrent) {
        // Use realized data
        const monthData = realizedByMonth?.get(key);
        if (monthData) {
          monthData.forEach((amt, accId) => {
            const cls = accountClassMap.get(accId) || "";
            if (cls === "receita") receitas += amt;
            else if (cls === "deducao") deducoes += amt;
            else if (["despesa_op", "depreciacao", "imposto_resultado"].includes(cls)) despesas += amt;
          });
        }
      } else {
        // Use forecast: trend + recurring + manual entries
        receitas = Math.max(avgReceita, recurringReceita);
        despesas = Math.max(avgDespesa, recurringDespesa);
        deducoes = avgDeducao;

        // Override with explicit forecast entries
        const monthForecasts = (forecastEntries || []).filter(
          (e: any) => e.year === yr && e.month === mo
        );
        if (monthForecasts.length > 0) {
          let fReceita = 0, fDespesa = 0, fDeducao = 0;
          monthForecasts.forEach((e: any) => {
            const cls = accountClassMap.get(e.chart_account_id) || "";
            const amt = Number(e.forecast_amount);
            if (cls === "receita") fReceita += amt;
            else if (cls === "deducao") fDeducao += amt;
            else fDespesa += amt;
          });
          if (fReceita > 0) receitas = fReceita;
          if (fDespesa > 0) despesas = fDespesa;
          if (fDeducao > 0) deducoes = fDeducao;
        }

        // Apply simulation adjustments
        receitas *= (1 + simAdjustments.revenueChange / 100);
        deducoes *= (1 + simAdjustments.revenueChange / 100);
        despesas *= (1 + simAdjustments.costChange / 100);
        despesas += simAdjustments.newHires * simAdjustments.hireCost;
      }

      const resultado = receitas - deducoes - despesas;
      months.push({
        year: yr, month: mo,
        label: `${MONTHS[mo - 1]}/${String(yr).slice(-2)}`,
        isRealized: isRealized || isCurrent,
        receitas, deducoes, despesas, resultado,
      });
    }

    return months;
  }, [realizedByMonth, forecastEntries, recurringContracts, accountClassMap, simAdjustments, currentYear, currentMonth]);

  function computeAvg(category: string): number {
    if (!realizedByMonth) return 0;
    let total = 0, count = 0;
    // Use last 3 realized months
    for (let i = 1; i <= 3; i++) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const monthData = realizedByMonth.get(key);
      if (monthData) {
        monthData.forEach((amt, accId) => {
          if (accountClassMap.get(accId) === category) total += amt;
        });
        count++;
      }
    }
    return count > 0 ? total / count : 0;
  }

  function periodicityToMonthly(amount: number, periodicity: string): number {
    switch (periodicity) {
      case "semanal": return amount * 4.33;
      case "quinzenal": return amount * 2;
      case "mensal": return amount;
      case "trimestral": return amount / 3;
      case "semestral": return amount / 6;
      case "anual": return amount / 12;
      default: return amount;
    }
  }

  // KPIs from rolling 12
  const totalReceitaAnual = rolling12.reduce((s, m) => s + m.receitas, 0);
  const totalDespesaAnual = rolling12.reduce((s, m) => s + m.deducoes + m.despesas, 0);
  const resultadoAnual = totalReceitaAnual - totalDespesaAnual;
  const margemAnual = totalReceitaAnual > 0 ? (resultadoAnual / totalReceitaAnual) * 100 : 0;

  // Saldo projetado
  let saldoAcumulado = openingBalance || 0;
  const saldoProjetado = rolling12.map((m) => {
    saldoAcumulado += m.resultado;
    return saldoAcumulado;
  });
  const saldoFinal = saldoProjetado[saldoProjetado.length - 1] || 0;

  // Runway
  const avgDespesaMensal = totalDespesaAnual / 12;
  const runway = avgDespesaMensal > 0 ? Math.floor(saldoAcumulado / avgDespesaMensal) : 999;

  // Breakeven month
  const breakevenIdx = saldoProjetado.findIndex((s) => s <= 0);

  // Generate forecast mutation
  const generateForecast = useMutation({
    mutationFn: async () => {
      const futureMonths = rolling12.filter((m) => !m.isRealized);
      if (futureMonths.length === 0) { toast.info("Nenhum mês futuro para gerar"); return; }

      // Get all leaf chart accounts
      const receitas = (chartAccounts || []).filter((a) => a.code.startsWith("1"));
      const despesas = (chartAccounts || []).filter((a) => ["2", "3"].includes(a.code.split(".")[0]));

      const entries: any[] = [];
      futureMonths.forEach((m) => {
        // Simple: create one entry per root category using trend
        if (receitas.length > 0) {
          entries.push({
            year: m.year, month: m.month,
            chart_account_id: receitas[0].id,
            forecast_amount: m.receitas,
            origin: "tendencia_historica",
            scenario,
          });
        }
        if (despesas.length > 0) {
          entries.push({
            year: m.year, month: m.month,
            chart_account_id: despesas[0].id,
            forecast_amount: m.despesas + m.deducoes,
            origin: "tendencia_historica",
            scenario,
          });
        }
      });

      // Delete existing auto entries for this scenario/period
      await supabase
        .from("fin_forecast_entries")
        .delete()
        .eq("scenario", scenario)
        .eq("origin", "tendencia_historica")
        .gte("year", currentYear);

      if (entries.length > 0) {
        const { error } = await supabase.from("fin_forecast_entries").insert(entries);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Forecast gerado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["fin-forecast-entries"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isLoading = loadingRealized || loadingForecast;

  if (isLoading) {
    return <div className="grid gap-4 md:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[400px]" />)}</div>;
  }

  const scenarioInfo = SCENARIO_LABELS[scenario];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Forecast Dinâmico
          </h2>
          <p className="text-sm text-muted-foreground">
            Rolling 12 meses — Realizado + Projeção automática
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={scenario} onValueChange={(v) => setScenario(v as ScenarioType)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(SCENARIO_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSimulationOpen(true)}>
            <Layers className="h-3.5 w-3.5" /> Simular
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => generateForecast.mutate()}>
            <Play className="h-3.5 w-3.5" /> Gerar Forecast
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <KpiCard label="Receita Anual Projetada" value={fmtCompact(totalReceitaAnual)} positive />
        <KpiCard label="Despesa Anual Projetada" value={fmtCompact(totalDespesaAnual)} positive={false} />
        <KpiCard label="Resultado Projetado" value={fmtCompact(resultadoAnual)} positive={resultadoAnual >= 0} />
        <KpiCard label="Margem Projetada" value={`${margemAnual.toFixed(1)}%`} positive={margemAnual >= 0} />
        <KpiCard label="Saldo Final Projetado" value={fmtCompact(saldoFinal)} positive={saldoFinal >= 0} />
        <KpiCard
          label="Runway"
          value={runway > 24 ? ">24 meses" : `${runway} meses`}
          positive={runway > 6}
          alert={runway <= 3}
        />
      </div>

      {/* Breakeven alert */}
      {breakevenIdx >= 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="text-sm font-medium text-destructive">
              Atenção: Saldo projetado negativo em {rolling12[breakevenIdx]?.label}
            </span>
          </CardContent>
        </Card>
      )}

      {/* Rolling 12 Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Rolling 12 Meses —
            <Badge variant="outline" className={cn("text-[10px]", scenarioInfo.color)}>
              {scenarioInfo.label}
            </Badge>
            {(simAdjustments.revenueChange !== 0 || simAdjustments.costChange !== 0 || simAdjustments.newHires > 0) && (
              <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-300">
                Simulação ativa
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] sticky left-0 bg-background z-10 min-w-[110px]">Mês</TableHead>
                {rolling12.map((m, i) => (
                  <TableHead key={i} className={cn(
                    "text-[10px] text-center min-w-[90px]",
                    m.isRealized ? "bg-muted/30" : "bg-primary/5"
                  )}>
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{m.label}</span>
                      {m.isRealized ? (
                        <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                      ) : (
                        <Unlock className="h-2.5 w-2.5 text-primary/60" />
                      )}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-[10px] text-center font-bold min-w-[100px]">TOTAL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <ForecastRow label="Receitas" data={rolling12.map((m) => m.receitas)} positive />
              <ForecastRow label="(-) Deduções" data={rolling12.map((m) => m.deducoes)} />
              <ForecastRow label="(-) Despesas" data={rolling12.map((m) => m.despesas)} />
              <ForecastRow label="= Resultado" data={rolling12.map((m) => m.resultado)} highlight />
              <ForecastRow label="Saldo Acumulado" data={saldoProjetado} isSaldo />
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Simulation Dialog */}
      <SimulationDialog
        open={simulationOpen}
        onOpenChange={setSimulationOpen}
        adjustments={simAdjustments}
        onChange={setSimAdjustments}
      />
    </div>
  );
}

// ── KPI Card ──
function KpiCard({ label, value, positive, alert }: {
  label: string; value: string; positive?: boolean; alert?: boolean;
}) {
  return (
    <Card className={cn(alert && "border-destructive/50")}>
      <CardContent className="pt-3 pb-3">
        <p className="text-[10px] text-muted-foreground truncate">{label}</p>
        <p className={cn(
          "text-lg font-bold font-mono",
          alert ? "text-destructive" : positive ? "text-green-600" : "text-red-600"
        )}>{value}</p>
      </CardContent>
    </Card>
  );
}

// ── Forecast Row ──
function ForecastRow({ label, data, positive, highlight, isSaldo }: {
  label: string; data: number[]; positive?: boolean; highlight?: boolean; isSaldo?: boolean;
}) {
  const total = data.reduce((s, v) => s + v, 0);
  const displayTotal = isSaldo ? data[data.length - 1] : total;

  return (
    <TableRow className={cn(highlight && "bg-muted/30 font-semibold")}>
      <TableCell className="text-[11px] font-medium sticky left-0 bg-background z-10 whitespace-nowrap">
        {label}
      </TableCell>
      {data.map((v, i) => (
        <TableCell key={i} className={cn(
          "text-right text-[10px] font-mono",
          highlight && (v >= 0 ? "text-green-600" : "text-red-600"),
          isSaldo && (v >= 0 ? "text-blue-600" : "text-red-600"),
          positive && "text-green-600",
          !positive && !highlight && !isSaldo && "text-red-600",
        )}>
          {fmtCompact(v)}
        </TableCell>
      ))}
      <TableCell className={cn(
        "text-right text-[11px] font-mono font-bold",
        displayTotal >= 0 ? "text-green-600" : "text-red-600"
      )}>
        {fmtCompact(displayTotal)}
      </TableCell>
    </TableRow>
  );
}

// ── Simulation Dialog ──
function SimulationDialog({ open, onOpenChange, adjustments, onChange }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  adjustments: any;
  onChange: (a: any) => void;
}) {
  const reset = () => onChange({
    revenueChange: 0, costChange: 0, expenseChange: 0,
    newHires: 0, hireCost: 5000, investmentAmount: 0,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" /> Simulação de Cenário
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <SimSlider
            label="Variação Receita"
            value={adjustments.revenueChange}
            onChange={(v) => onChange({ ...adjustments, revenueChange: v })}
            min={-50} max={100}
            unit="%"
            colorPositive
          />
          <SimSlider
            label="Variação Custos / Despesas"
            value={adjustments.costChange}
            onChange={(v) => onChange({ ...adjustments, costChange: v })}
            min={-30} max={100}
            unit="%"
          />
          <Separator />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Novas Contratações</Label>
              <Input
                type="number" min={0}
                value={adjustments.newHires}
                onChange={(e) => onChange({ ...adjustments, newHires: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label className="text-xs">Custo/funcionário (R$)</Label>
              <Input
                type="number" min={0}
                value={adjustments.hireCost}
                onChange={(e) => onChange({ ...adjustments, hireCost: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Novo Investimento Mensal (R$)</Label>
            <Input
              type="number" min={0}
              value={adjustments.investmentAmount}
              onChange={(e) => onChange({ ...adjustments, investmentAmount: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={reset}>Resetar</Button>
          <Button onClick={() => onOpenChange(false)}>Aplicar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SimSlider({ label, value, onChange, min, max, unit, colorPositive }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; unit: string; colorPositive?: boolean;
}) {
  const color = colorPositive
    ? value >= 0 ? "text-green-600" : "text-red-600"
    : value <= 0 ? "text-green-600" : "text-red-600";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className={cn("text-sm font-mono font-medium", color)}>
          {value >= 0 ? "+" : ""}{value}{unit}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min} max={max} step={1}
      />
    </div>
  );
}
