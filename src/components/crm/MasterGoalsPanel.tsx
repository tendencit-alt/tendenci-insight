import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Target, TrendingUp, TrendingDown, Users, AlertTriangle, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, ReferenceLine, ResponsiveContainer } from "recharts";

interface SellerGoalData {
  id: string;
  vendedor_id: string;
  vendedor_nome: string;
  valor_meta: number;
  valor_vendido: number;
  percentual: number;
}

interface CompanyGoalData {
  id: string;
  valor_meta_total: number;
  data_inicio: string;
  data_fim: string;
  valor_vendido: number;
  percentual: number;
}

interface DailyEvolution {
  date: string;
  label: string;
  vendido: number;
  acumulado: number;
  metaEsperada: number;
}

interface PerformanceAlert {
  vendedor_nome: string;
  percentualAtingido: number;
  percentualEsperado: number;
  desvio: number;
  nivel: "critico" | "alto" | "medio";
  valorFaltante: number;
}

export function MasterGoalsPanel() {
  const [companyGoal, setCompanyGoal] = useState<CompanyGoalData | null>(null);
  const [sellerGoals, setSellerGoals] = useState<SellerGoalData[]>([]);
  const [dailyEvolution, setDailyEvolution] = useState<DailyEvolution[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoalsData();
    
    // Realtime subscription para deals ganhos
    const channel = supabase
      .channel('goals-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'crm_deals',
        filter: 'status=eq.won'
      }, () => {
        fetchGoalsData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchGoalsData = async () => {
    try {
      const now = new Date();
      
      // Buscar meta da empresa ativa
      const { data: companyData, error: companyError } = await supabase
        .from("tendenci_company_goals")
        .select(`
          id,
          valor_meta_total,
          data_inicio,
          data_fim
        `)
        .eq("status", "ativa")
        .lte("data_inicio", now.toISOString())
        .gte("data_fim", now.toISOString())
        .maybeSingle();

      if (companyError) throw companyError;

      let companyGoalData: CompanyGoalData | null = null;

      if (companyData) {
        // Buscar deals ganhos no período diretamente do crm_deals
        const { data: wonDeals, error: wonDealsError } = await supabase
          .from("crm_deals")
          .select("value, owner_id, updated_at")
          .eq("status", "won")
          .gte("updated_at", companyData.data_inicio)
          .lte("updated_at", companyData.data_fim);

        if (wonDealsError) throw wonDealsError;

        // Calcular total vendido real
        const totalVendido = wonDeals?.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0) || 0;
        const percentualTotal = companyData.valor_meta_total > 0 
          ? (totalVendido / companyData.valor_meta_total) * 100 
          : 0;

        companyGoalData = {
          id: companyData.id,
          valor_meta_total: Number(companyData.valor_meta_total) || 0,
          data_inicio: companyData.data_inicio,
          data_fim: companyData.data_fim,
          valor_vendido: totalVendido,
          percentual: percentualTotal,
        };
        setCompanyGoal(companyGoalData);

        // Buscar evolução diária de vendas
        await fetchDailyEvolution(companyData.data_inicio, companyData.data_fim, companyData.valor_meta_total);

        // Buscar metas individuais dos vendedores
        const { data: sellerData, error: sellerError } = await supabase
          .from("tendenci_seller_goals")
          .select(`
            id,
            vendedor_id,
            valor_meta,
            profiles!tendenci_seller_goals_vendedor_id_fkey (
              full_name
            )
          `)
          .eq("status", "ativa")
          .lte("data_inicio", now.toISOString())
          .gte("data_fim", now.toISOString());

        if (sellerError) throw sellerError;

        if (sellerData) {
          // Calcular vendas por vendedor a partir dos deals reais
          const salesByOwner: Record<string, number> = {};
          wonDeals?.forEach((deal) => {
            if (deal.owner_id) {
              salesByOwner[deal.owner_id] = (salesByOwner[deal.owner_id] || 0) + (Number(deal.value) || 0);
            }
          });

          const mappedSellers: SellerGoalData[] = sellerData.map((seller: any) => {
            const valorVendido = salesByOwner[seller.vendedor_id] || 0;
            const percentual = seller.valor_meta > 0 ? (valorVendido / seller.valor_meta) * 100 : 0;
            
            return {
              id: seller.id,
              vendedor_id: seller.vendedor_id,
              vendedor_nome: seller.profiles?.full_name || "Vendedor",
              valor_meta: Number(seller.valor_meta) || 0,
              valor_vendido: valorVendido,
              percentual: percentual,
            };
          });
        setSellerGoals(mappedSellers);

        // Calcular alertas de performance
        calculateAlerts(mappedSellers, companyGoalData.data_inicio, companyGoalData.data_fim);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar metas:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyEvolution = async (dataInicio: string, dataFim: string, metaTotal: number) => {
    try {
      const inicio = new Date(dataInicio);
      const fim = new Date(dataFim);
      const hoje = new Date();

      // Buscar deals ganhos no período
      const { data: dealsData, error } = await supabase
        .from("crm_deals")
        .select("value, updated_at")
        .eq("status", "won")
        .gte("updated_at", inicio.toISOString())
        .lte("updated_at", hoje.toISOString())
        .order("updated_at", { ascending: true });

      if (error) throw error;

      // Dias totais e média diária ideal
      const diasTotais = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const mediaDiariaIdeal = metaTotal / diasTotais;

      // Agrupar vendas por dia
      const salesByDay: Record<string, number> = {};
      dealsData?.forEach((deal) => {
        const date = new Date(deal.updated_at).toISOString().split("T")[0];
        salesByDay[date] = (salesByDay[date] || 0) + (Number(deal.value) || 0);
      });

      // Gerar dados de evolução
      const evolution: DailyEvolution[] = [];
      let acumulado = 0;
      let diaCount = 0;

      const current = new Date(inicio);
      while (current <= hoje && current <= fim) {
        diaCount++;
        const dateStr = current.toISOString().split("T")[0];
        const vendidoDia = salesByDay[dateStr] || 0;
        acumulado += vendidoDia;

        evolution.push({
          date: dateStr,
          label: current.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          vendido: vendidoDia,
          acumulado,
          metaEsperada: mediaDiariaIdeal * diaCount,
        });

        current.setDate(current.getDate() + 1);
      }

      setDailyEvolution(evolution);
    } catch (error) {
      console.error("Erro ao buscar evolução diária:", error);
    }
  };

  const calculateAlerts = (sellers: SellerGoalData[], dataInicio: string, dataFim: string) => {
    const newAlerts: PerformanceAlert[] = [];
    const hoje = new Date();
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);

    const diasTotais = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const diasPassados = Math.max(1, Math.ceil((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
    const percentualTempoPassado = (diasPassados / diasTotais) * 100;

    sellers.forEach((seller) => {
      const percentualEsperado = percentualTempoPassado;
      const desvio = seller.percentual - percentualEsperado;
      const valorFaltante = seller.valor_meta - seller.valor_vendido;

      // Definir nível de alerta
      let nivel: "critico" | "alto" | "medio" | null = null;
      
      if (seller.percentual < percentualEsperado * 0.25) {
        nivel = "critico";
      } else if (seller.percentual < percentualEsperado * 0.5) {
        nivel = "alto";
      } else if (seller.percentual < percentualEsperado * 0.8) {
        nivel = "medio";
      }

      if (nivel) {
        newAlerts.push({
          vendedor_nome: seller.vendedor_nome,
          percentualAtingido: seller.percentual,
          percentualEsperado,
          desvio,
          nivel,
          valorFaltante,
        });
      }
    });

    // Ordenar por gravidade
    newAlerts.sort((a, b) => {
      const order = { critico: 0, alto: 1, medio: 2 };
      return order[a.nivel] - order[b.nivel];
    });

    setAlerts(newAlerts);
  };

  // Cálculos de esperado e realista
  const calculateExpectedAndRealistic = (
    valorMeta: number,
    valorVendido: number,
    dataInicio: string,
    dataFim: string
  ) => {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    const hoje = new Date();

    const diasTotais = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const diasPassados = Math.max(1, Math.ceil((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
    
    const mediaDiariaIdeal = valorMeta / diasTotais;
    const esperadoHoje = mediaDiariaIdeal * diasPassados;
    
    const mediaDiariaAtual = valorVendido / diasPassados;
    const realistaMes = mediaDiariaAtual * diasTotais;
    
    const isAboveExpected = valorVendido >= esperadoHoje;
    
    return {
      esperadoHoje,
      realistaMes,
      isAboveExpected,
      diasPassados,
      diasTotais,
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getMonthName = () => {
    return new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

  const getAlertColor = (nivel: string) => {
    switch (nivel) {
      case "critico": return "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400";
      case "alto": return "bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400";
      case "medio": return "bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400";
      default: return "";
    }
  };

  const getAlertBadge = (nivel: string) => {
    switch (nivel) {
      case "critico": return <Badge variant="destructive">Crítico</Badge>;
      case "alto": return <Badge className="bg-orange-500 hover:bg-orange-600">Alto</Badge>;
      case "medio": return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">Médio</Badge>;
      default: return null;
    }
  };

  const chartConfig = {
    acumulado: {
      label: "Vendido Acumulado",
      color: "hsl(var(--primary))",
    },
    metaEsperada: {
      label: "Meta Esperada",
      color: "hsl(var(--muted-foreground))",
    },
  } satisfies ChartConfig;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!companyGoal) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Target className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhuma meta configurada para este mês</p>
        </CardContent>
      </Card>
    );
  }

  const companyCalc = calculateExpectedAndRealistic(
    companyGoal.valor_meta_total,
    companyGoal.valor_vendido,
    companyGoal.data_inicio,
    companyGoal.data_fim
  );

  return (
    <div className="space-y-4">
      {/* Alertas de Performance */}
      {alerts.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Alertas de Performance ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`rounded-lg border p-3 ${getAlertColor(alert.nivel)}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{alert.vendedor_nome}</span>
                  {getAlertBadge(alert.nivel)}
                </div>
                <p className="text-xs opacity-80">
                  Atingiu {alert.percentualAtingido.toFixed(1)}% da meta, esperado era {alert.percentualEsperado.toFixed(1)}% ({alert.desvio.toFixed(1)}% de desvio)
                </p>
                <p className="text-xs font-medium mt-1">
                  Falta {formatCurrency(alert.valorFaltante)} para bater a meta
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Card Meta da Empresa */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Meta da Empresa - {getMonthName()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Meta Total e Progresso */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Meta Total</span>
              <span className="font-semibold">{formatCurrency(companyGoal.valor_meta_total)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Atingido</span>
              <span className="font-semibold">
                {formatCurrency(companyGoal.valor_vendido)} ({companyGoal.percentual.toFixed(1)}%)
              </span>
            </div>
            <Progress value={companyGoal.percentual} className="h-2" />
          </div>

          {/* Esperado vs Realista */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">
                Esperado Hoje (dia {companyCalc.diasPassados}/{companyCalc.diasTotais})
              </p>
              <p className="text-base font-semibold">{formatCurrency(companyCalc.esperadoHoje)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground mb-1">Realista Mês</p>
                {companyCalc.isAboveExpected ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
              <p className={`text-base font-semibold ${companyCalc.isAboveExpected ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(companyCalc.realistaMes)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Evolução Diária */}
      {dailyEvolution.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Evolução Diária de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <AreaChart data={dailyEvolution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 10 }} 
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 10 }} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  width={40}
                />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      formatter={(value, name) => [
                        formatCurrency(Number(value)),
                        name === "acumulado" ? "Vendido" : "Meta Esperada"
                      ]}
                    />
                  } 
                />
                <ReferenceLine
                  y={companyGoal.valor_meta_total}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="3 3"
                  label={{ value: "Meta", position: "right", fontSize: 10 }}
                />
                <Area
                  type="monotone"
                  dataKey="metaEsperada"
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                  fill="none"
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="acumulado"
                  stroke="hsl(var(--primary))"
                  fill="url(#colorAcumulado)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-primary rounded" />
                <span>Vendido Acumulado</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-muted-foreground rounded border-dashed" style={{ borderTop: "1px dashed" }} />
                <span>Meta Esperada</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card Composição por Vendedores */}
      {sellerGoals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Composição da Meta (por Vendedor)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sellerGoals.map((seller) => {
              const sellerCalc = calculateExpectedAndRealistic(
                seller.valor_meta,
                seller.valor_vendido,
                companyGoal.data_inicio,
                companyGoal.data_fim
              );

              return (
                <div key={seller.id} className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{seller.vendedor_nome}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Meta: {formatCurrency(seller.valor_meta)}
                      </span>
                      <span className={`text-xs font-semibold ${sellerCalc.isAboveExpected ? "text-green-600" : "text-red-600"}`}>
                        {seller.percentual.toFixed(1)}%
                      </span>
                      {sellerCalc.isAboveExpected ? (
                        <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                      )}
                    </div>
                  </div>
                  <Progress value={seller.percentual} className="h-1.5 mb-1" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Atingido: {formatCurrency(seller.valor_vendido)}</span>
                    <span>Esperado: {formatCurrency(sellerCalc.esperadoHoje)}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
