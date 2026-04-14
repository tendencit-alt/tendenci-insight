import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";

import {
  TrendingUp, TrendingDown, DollarSign, BarChart3,
  AlertTriangle, ChevronDown, ChevronUp, Calculator,
  Target, Landmark, Clock, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  useScenarioForecast,
  useCostImpactSimulator,
  useLoanSimulator,
  useRevenueTargetCalc,
  type ScenarioType,
} from "@/hooks/useScenarioForecast";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Tab = "forecast" | "scenarios" | "simulators";

const SCENARIO_COLORS: Record<ScenarioType, string> = {
  conservador: "text-amber-500",
  realista: "text-primary",
  agressivo: "text-emerald-500",
};

const SCENARIO_LABELS: Record<ScenarioType, string> = {
  conservador: "Conservador",
  realista: "Realista",
  agressivo: "Agressivo",
};

export function ScenarioForecastWidget() {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("forecast");
  const { data, isLoading } = useScenarioForecast();

  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-5 w-48" />
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { monthForecast, cashProjections, scenarios, delayImpact } = data;

  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Cenários & Forecast</span>
            <Badge variant="outline" className="text-[10px] h-4 px-1.5">Engine</Badge>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Month Result Preview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <MiniCard
            icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
            label="Resultado Previsto"
            value={fmt(monthForecast.projectedResult)}
            isNegative={monthForecast.projectedResult < 0}
          />
          <MiniCard
            icon={<Target className="h-3.5 w-3.5 text-primary" />}
            label="Margem Prevista"
            value={`${monthForecast.projectedMargin.toFixed(1)}%`}
            isNegative={monthForecast.projectedMargin < 10}
          />
          <MiniCard
            icon={<Clock className="h-3.5 w-3.5 text-amber-500" />}
            label={`Dia ${monthForecast.dayOfMonth}/${monthForecast.daysInMonth}`}
            value={`${Math.round((monthForecast.dayOfMonth / monthForecast.daysInMonth) * 100)}%`}
          />
          <MiniCard
            icon={<AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
            label="Atrasos Clientes"
            value={`${delayImpact.overdueCount} títulos`}
            subtitle={fmt(delayImpact.overdueAmount)}
            isNegative={delayImpact.overdueCount > 0}
          />
        </div>

        {/* Cash Projections */}
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {cashProjections.map(cp => (
            <div key={cp.days} className={`rounded-lg border p-2 text-center ${cp.isNegative ? "border-destructive/40 bg-destructive/5" : "border-border/50"}`}>
              <p className="text-[10px] text-muted-foreground">{cp.label}</p>
              <p className={`text-xs font-bold font-mono ${cp.isNegative ? "text-destructive" : "text-foreground"}`}>{cp.formatted}</p>
            </div>
          ))}
        </div>

        {expanded && (
          <div className="mt-3 space-y-3 animate-in fade-in-0 duration-200">
            {/* Tabs */}
            <div className="flex gap-1 border-b border-border/50 pb-1">
              {([
                { key: "forecast" as Tab, label: "Forecast", icon: TrendingUp },
                { key: "scenarios" as Tab, label: "Cenários", icon: BarChart3 },
                { key: "simulators" as Tab, label: "Simuladores", icon: Calculator },
              ]).map(t => (
                <Button
                  key={t.key}
                  variant={tab === t.key ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-[11px] gap-1"
                  onClick={() => setTab(t.key)}
                >
                  <t.icon className="h-3 w-3" />
                  {t.label}
                </Button>
              ))}
            </div>

            {tab === "forecast" && <ForecastTab data={data} />}
            {tab === "scenarios" && <ScenariosTab scenarios={scenarios} />}
            {tab === "simulators" && <SimulatorsTab data={data} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniCard({ icon, label, value, subtitle, isNegative }: { icon: React.ReactNode; label: string; value: string; subtitle?: string; isNegative?: boolean }) {
  return (
    <div className="rounded-lg border border-border/50 p-2">
      <div className="flex items-center gap-1 mb-1">{icon}<span className="text-[10px] text-muted-foreground truncate">{label}</span></div>
      <p className={`text-xs font-bold font-mono ${isNegative ? "text-destructive" : "text-foreground"}`}>{value}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground font-mono">{subtitle}</p>}
    </div>
  );
}

function ForecastTab({ data }: { data: ReturnType<typeof useScenarioForecast>["data"] }) {
  if (!data) return null;
  const { monthForecast: mf, delayImpact: di } = data;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <DetailRow label="Receita Realizada" value={fmt(mf.revenueRealized)} />
        <DetailRow label="Despesa Realizada" value={fmt(mf.expenseRealized)} negative />
        <DetailRow label="Receitas Pendentes" value={fmt(mf.revenuePending)} />
        <DetailRow label="Despesas Pendentes" value={fmt(mf.expensePending)} negative />
      </div>
      {di.overdueCount > 0 && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2">
          <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Impacto Atrasos Clientes
          </p>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <DetailRow label="Caixa 7d Ajustado" value={fmt(di.adjustedCash7d)} negative={di.adjustedCash7d < 0} />
            <DetailRow label="Caixa 30d Ajustado" value={fmt(di.adjustedCash30d)} negative={di.adjustedCash30d < 0} />
          </div>
        </div>
      )}
    </div>
  );
}

function ScenariosTab({ scenarios }: { scenarios: ReturnType<typeof useScenarioForecast>["data"] extends infer T ? T extends { scenarios: infer S } ? S : never : never }) {
  return (
    <div className="space-y-2">
      {scenarios.map(s => (
        <div key={s.type} className="rounded-lg border border-border/50 p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-semibold ${SCENARIO_COLORS[s.type]}`}>{SCENARIO_LABELS[s.type]}</span>
            <Badge variant="outline" className="text-[10px] h-4">{(s.factor * 100).toFixed(0)}%</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground">Receita</p>
              <p className="text-xs font-mono font-medium">{fmt(s.projectedRevenue)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Resultado</p>
              <p className={`text-xs font-mono font-medium ${s.projectedResult < 0 ? "text-destructive" : ""}`}>{fmt(s.projectedResult)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Margem</p>
              <p className={`text-xs font-mono font-medium ${s.projectedMargin < 10 ? "text-amber-500" : ""}`}>{s.projectedMargin.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SimulatorsTab({ data }: { data: ReturnType<typeof useScenarioForecast>["data"] }) {
  const [simTab, setSimTab] = useState<"costs" | "loan" | "revenue">("costs");

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {([
          { key: "costs" as const, label: "Custos", icon: TrendingDown },
          { key: "loan" as const, label: "Empréstimo", icon: Landmark },
          { key: "revenue" as const, label: "Faturamento", icon: DollarSign },
        ]).map(t => (
          <Button key={t.key} variant={simTab === t.key ? "secondary" : "ghost"} size="sm" className="h-6 text-[10px] gap-1" onClick={() => setSimTab(t.key)}>
            <t.icon className="h-3 w-3" />{t.label}
          </Button>
        ))}
      </div>
      {simTab === "costs" && <CostSimulator data={data} />}
      {simTab === "loan" && <LoanSimulatorPanel />}
      {simTab === "revenue" && <RevenueSimulator data={data} />}
    </div>
  );
}

function CostSimulator({ data }: { data: any }) {
  const sim = useCostImpactSimulator();
  const mf = data?.monthForecast;
  if (!mf) return null;

  const variableCosts = mf.expenseRealized * 0.4; // estimate
  const result = sim.simulate(mf.revenueRealized, mf.expenseRealized, variableCosts);

  const sliders = [
    { label: "Comissão", value: sim.commissionDelta, setter: sim.setCommissionDelta },
    { label: "Frete", value: sim.freightDelta, setter: sim.setFreightDelta },
    { label: "Matéria-prima", value: sim.materialDelta, setter: sim.setMaterialDelta },
    { label: "Variáveis", value: sim.variableDelta, setter: sim.setVariableDelta },
  ];

  return (
    <div className="space-y-2">
      {sliders.map(s => (
        <div key={s.label} className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-20 shrink-0">{s.label}</span>
          <Slider value={[s.value]} onValueChange={([v]) => s.setter(v)} min={-30} max={50} step={1} className="flex-1" />
          <span className={`text-[10px] font-mono w-10 text-right ${s.value > 0 ? "text-destructive" : s.value < 0 ? "text-emerald-500" : "text-muted-foreground"}`}>
            {s.value > 0 ? "+" : ""}{s.value}%
          </span>
        </div>
      ))}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/50">
        <SimResultBox label="Margem" current={result.currentMargin} simulated={result.simulatedMargin} />
        <SimResultBox label="EBITDA" current={result.currentEbitda} simulated={result.simulatedEbitda} />
        <SimResultBox label="Resultado" current={result.currentResult} simulated={result.simulatedResult} />
      </div>
    </div>
  );
}

function LoanSimulatorPanel() {
  const loan = useLoanSimulator();
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Valor (R$)</label>
          <Input type="number" value={loan.principal || ""} onChange={e => loan.setPrincipal(Number(e.target.value))} className="h-7 text-xs" placeholder="100.000" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Taxa a.a. (%)</label>
          <Input type="number" value={loan.annualRate || ""} onChange={e => loan.setAnnualRate(Number(e.target.value))} className="h-7 text-xs" placeholder="18" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Prazo (meses)</label>
          <Input type="number" value={loan.termMonths || ""} onChange={e => loan.setTermMonths(Number(e.target.value))} className="h-7 text-xs" placeholder="24" />
        </div>
      </div>
      {loan.principal > 0 && (
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/50">
          <DetailRow label="Juros/mês" value={fmt(loan.result.monthlyInterest)} negative />
          <DetailRow label="Parcela/mês" value={fmt(loan.result.monthlyCashImpact)} negative />
          <DetailRow label="Impacto Anual" value={fmt(loan.result.annualResultImpact)} negative />
        </div>
      )}
    </div>
  );
}

function RevenueSimulator({ data }: { data: any }) {
  const calc = useRevenueTargetCalc();
  const mf = data?.monthForecast;
  if (!mf) return null;

  const margin = mf.projectedMargin > 0 ? mf.projectedMargin : 30;
  const result = calc.calculate(mf.revenueRealized, mf.expenseRealized, margin);

  return (
    <div className="space-y-2">
      <div>
        <label className="text-[10px] text-muted-foreground">Meta de Lucro Desejado (R$)</label>
        <Input type="number" value={calc.targetProfit || ""} onChange={e => calc.setTargetProfit(Number(e.target.value))} className="h-7 text-xs" placeholder="50.000" />
      </div>
      {calc.targetProfit > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-border/50">
          <DetailRow label="Faturamento Necessário" value={fmt(result.requiredRevenue)} />
          <DetailRow label="Faturamento Atual" value={fmt(result.currentRevenue)} />
          <DetailRow label="Gap" value={fmt(result.gap)} negative={result.gap > 0} />
          <Badge variant={result.feasible ? "default" : "destructive"} className="text-[10px]">
            {result.feasible ? "Meta alcançável" : "Meta desafiadora"}
          </Badge>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-xs font-mono font-medium ${negative ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}

function SimResultBox({ label, current, simulated }: { label: string; current: number; simulated: number }) {
  const delta = simulated - current;
  const isPositive = delta >= 0;
  return (
    <div className="text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-xs font-mono font-bold ${simulated < 0 ? "text-destructive" : ""}`}>{fmt(simulated)}</p>
      <p className={`text-[10px] font-mono flex items-center justify-center gap-0.5 ${isPositive ? "text-emerald-500" : "text-destructive"}`}>
        {isPositive ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
        {fmt(Math.abs(delta))}
      </p>
    </div>
  );
}
