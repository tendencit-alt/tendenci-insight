import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useExecResultadoHoje, useExecResultadoMes, useExecReceitaPrevista,
  useExecRiscoOperacional, useExecSaudeEmpresa,
} from "@/hooks/useExecutiveDashboard";
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, Shield,
  Target, BarChart3, Clock, Package, Factory, Briefcase,
  ArrowUpRight, ArrowDownRight, Activity, Banknote, Wallet,
} from "lucide-react";

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

function KpiCard({ label, value, icon: Icon, color = "text-primary", sub }: { label: string; value: string; icon: any; color?: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl bg-muted ${color}`}><Icon className="h-5 w-5" /></div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground truncate">{label}</p>
            <p className="text-lg font-bold font-mono leading-tight">{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionTitle({ children, icon: Icon }: { children: React.ReactNode; icon: any }) {
  return (
    <h2 className="text-sm font-semibold flex items-center gap-2 mt-6 mb-3">
      <Icon className="h-4 w-4 text-primary" />{children}
    </h2>
  );
}

function LoadingGrid({ cols = 3 }: { cols?: number }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-${cols} gap-3`}>
      {Array.from({ length: cols }).map((_, i) => <Card key={i}><CardContent className="pt-4"><Skeleton className="h-14 w-full" /></CardContent></Card>)}
    </div>
  );
}

export default function ExecutiveCenter() {
  const { data: hoje, isLoading: lHoje } = useExecResultadoHoje();
  const { data: mes, isLoading: lMes } = useExecResultadoMes();
  const { data: receita, isLoading: lReceita } = useExecReceitaPrevista();
  const { data: risco, isLoading: lRisco } = useExecRiscoOperacional();
  const { data: saude, isLoading: lSaude } = useExecSaudeEmpresa();

  const metaPct = mes && mes.metaReceita > 0 ? (mes.faturamentoMes / mes.metaReceita) * 100 : 0;
  const forecastPct = mes && mes.forecastReceita > 0 ? (mes.faturamentoMes / mes.forecastReceita) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Executive Command Center</h1>
            <p className="text-xs text-muted-foreground">Cockpit executivo consolidado — {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
        </div>

        {/* GRUPO 1 — Resultado Hoje */}
        <SectionTitle icon={DollarSign}>Resultado Hoje</SectionTitle>
        {lHoje ? <LoadingGrid cols={6} /> : hoje && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="Faturamento Hoje" value={fmt(hoje.faturamentoHoje)} icon={ArrowUpRight} color="text-green-500" />
            <KpiCard label="Despesas Hoje" value={fmt(hoje.despesasHoje)} icon={ArrowDownRight} color="text-destructive" />
            <KpiCard label="Resultado Hoje" value={fmt(hoje.resultadoHoje)} icon={DollarSign} color={hoje.resultadoHoje >= 0 ? "text-green-500" : "text-destructive"} />
            <KpiCard label="Saldo Caixa" value={fmt(hoje.saldoCaixa)} icon={Wallet} color="text-blue-500" />
            <KpiCard label="Recebimentos Previstos" value={fmt(hoje.recebimentosPrevistos)} icon={TrendingUp} color="text-emerald-500" />
            <KpiCard label="Pagamentos Previstos" value={fmt(hoje.pagamentosPrevistos)} icon={TrendingDown} color="text-amber-500" />
          </div>
        )}

        {/* GRUPO 2 — Resultado Mês */}
        <SectionTitle icon={BarChart3}>Resultado do Mês</SectionTitle>
        {lMes ? <LoadingGrid cols={5} /> : mes && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <KpiCard label="Faturamento Acumulado" value={fmt(mes.faturamentoMes)} icon={TrendingUp} color="text-green-500" />
              <KpiCard label="Custos Acumulados" value={fmt(mes.custosMes)} icon={TrendingDown} color="text-destructive" />
              <KpiCard label="Margem Contribuição" value={`${mes.margemContribuicao.toFixed(1)}%`} icon={Target} color={mes.margemContribuicao >= 30 ? "text-green-500" : "text-amber-500"} />
              <KpiCard label="Lucro Acumulado" value={fmt(mes.lucroMes)} icon={DollarSign} color={mes.lucroMes >= 0 ? "text-green-500" : "text-destructive"} />
              <KpiCard label="Meta Receita" value={fmt(mes.metaReceita)} icon={Target} color="text-primary" sub={mes.metaReceita > 0 ? `${metaPct.toFixed(0)}% atingido` : "Sem meta"} />
            </div>
            {/* Comparativo Meta vs Forecast vs Realizado */}
            {(mes.metaReceita > 0 || mes.forecastReceita > 0) && (
              <Card className="mt-3">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Meta vs Forecast vs Realizado</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-20 text-muted-foreground">Meta</span>
                    <Progress value={Math.min(metaPct, 100)} className="flex-1 h-3" />
                    <span className="font-mono text-xs w-16 text-right">{metaPct.toFixed(0)}%</span>
                    <span className="font-mono text-xs w-28 text-right">{fmt(mes.metaReceita)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-20 text-muted-foreground">Forecast</span>
                    <Progress value={Math.min(forecastPct, 100)} className="flex-1 h-3" />
                    <span className="font-mono text-xs w-16 text-right">{forecastPct.toFixed(0)}%</span>
                    <span className="font-mono text-xs w-28 text-right">{fmt(mes.forecastReceita)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-20 text-muted-foreground font-medium">Realizado</span>
                    <div className="flex-1 h-3 rounded bg-primary/20"><div className="h-full rounded bg-primary" style={{ width: "100%" }} /></div>
                    <span className="font-mono text-xs w-16 text-right font-bold">100%</span>
                    <span className="font-mono text-xs w-28 text-right font-bold">{fmt(mes.faturamentoMes)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* GRUPO 3 — Receita Prevista */}
        <SectionTitle icon={TrendingUp}>Receita Prevista (CRM + Forecast)</SectionTitle>
        {lReceita ? <LoadingGrid cols={5} /> : receita && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard label="Pipeline Bruto" value={fmt(receita.pipelineBruto)} icon={Banknote} color="text-blue-500" />
            <KpiCard label="Pipeline Ponderado" value={fmt(receita.pipelinePonderado)} icon={Target} color="text-indigo-500" />
            <KpiCard label="Receita Prevista (Mês)" value={fmt(receita.receitaPrevistaMes)} icon={TrendingUp} color="text-green-500" />
            <KpiCard label="Receita Prevista (Trimestre)" value={fmt(receita.receitaPrevistaTrimestre)} icon={BarChart3} color="text-emerald-500" />
            <KpiCard label="Taxa Conversão" value={`${receita.taxaConversao.toFixed(1)}%`} icon={Target} color={receita.taxaConversao >= 20 ? "text-green-500" : "text-amber-500"} />
          </div>
        )}

        {/* GRUPO 4 — Risco Operacional */}
        <SectionTitle icon={AlertTriangle}>Risco Operacional</SectionTitle>
        {lRisco ? <LoadingGrid cols={4} /> : risco && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Ordens Atrasadas" value={String(risco.ordensAtrasadas)} icon={Factory} color={risco.ordensAtrasadas > 0 ? "text-destructive" : "text-green-500"} />
            <KpiCard label="Projetos c/ Desvio Prazo" value={String(risco.projetosDesvio)} icon={Briefcase} color={risco.projetosDesvio > 0 ? "text-amber-500" : "text-green-500"} />
            <KpiCard label="Compras Urgentes" value={String(risco.comprasUrgentes)} icon={Clock} color={risco.comprasUrgentes > 0 ? "text-amber-500" : "text-green-500"} />
            <KpiCard label="Ruptura Estoque" value={String(risco.rupturaEstoque)} icon={Package} color={risco.rupturaEstoque > 0 ? "text-destructive" : "text-green-500"} />
          </div>
        )}

        {/* GRUPO 6 — Saúde Empresa */}
        <SectionTitle icon={Shield}>Saúde da Empresa</SectionTitle>
        {lSaude ? <LoadingGrid cols={5} /> : saude && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard label="Saldo Atual" value={fmt(saude.saldoAtual)} icon={Wallet} color="text-blue-500" />
            <KpiCard label="Burn Rate Mensal" value={fmt(saude.burnRate)} icon={TrendingDown} color="text-amber-500" />
            <KpiCard label="Caixa Projetado 30d" value={fmt(saude.caixaProjetado30)} icon={BarChart3} color={saude.caixaProjetado30 >= 0 ? "text-green-500" : "text-destructive"} />
            <KpiCard label="Caixa Projetado 90d" value={fmt(saude.caixaProjetado90)} icon={BarChart3} color={saude.caixaProjetado90 >= 0 ? "text-green-500" : "text-destructive"} />
            <KpiCard label="Margem Líquida Projetada" value={`${saude.margemLiquidaProjetada.toFixed(1)}%`} icon={Target} color={saude.margemLiquidaProjetada >= 10 ? "text-green-500" : "text-amber-500"} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
