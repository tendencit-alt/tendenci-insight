import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, TrendingUp, DollarSign, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface CRMKPIsProps {
  pipelineId: string;
  categoryFilter?: string;
}

interface ConversionMetrics {
  currentMonth: number;
  lastMonth: number;
  bestMonth: number;
  bestMonthDate: string;
}

export function CRMKPIs({ pipelineId, categoryFilter }: CRMKPIsProps) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [conversionMetrics, setConversionMetrics] = useState<ConversionMetrics>({
    currentMonth: 0,
    lastMonth: 0,
    bestMonth: 0,
    bestMonthDate: ""
  });
  const [ticketMedio, setTicketMedio] = useState(0);
  const [emNegociacao, setEmNegociacao] = useState(0);
  const [valorEmNegociacao, setValorEmNegociacao] = useState(0);

  useEffect(() => {
    if (!pipelineId) return;
    fetchMetrics();
  }, [pipelineId, categoryFilter]);

  const fetchMetrics = async () => {
    setLoading(true);
    
    // Buscar dados básicos usando RPC existente
    const { data, error } = await supabase.rpc("crm_agg", {
      p_pipeline_id: pipelineId,
    });

    if (!error && data) {
      setMetrics(data);
    }

    // Buscar stage "Em negociação"
    const { data: negociacaoStage } = await supabase
      .from("crm_stages")
      .select("id")
      .eq("pipeline_id", pipelineId)
      .ilike("name", "%negociação%")
      .single();

    // Contar deals em negociação e calcular valor total
    if (negociacaoStage) {
      let negociacaoQuery = supabase
        .from("crm_deals")
        .select("value")
        .eq("pipeline_id", pipelineId)
        .eq("stage_id", negociacaoStage.id)
        .eq("status", "aberto");
      
      // Filtrar por categoria se especificado
      if (categoryFilter && categoryFilter !== "all") {
        negociacaoQuery = negociacaoQuery.eq("categoria", categoryFilter);
      }
      
      const { data: negociacaoDeals } = await negociacaoQuery;
      
      const count = negociacaoDeals?.length || 0;
      const totalValue = negociacaoDeals?.reduce((sum, deal) => sum + (deal.value || 0), 0) || 0;
      
      setEmNegociacao(count);
      setValorEmNegociacao(totalValue);
    }

    // Buscar todos os deals do pipeline para cálculos customizados
    let allDealsQuery = supabase
      .from("crm_deals")
      .select("value, status, created_at")
      .eq("pipeline_id", pipelineId);
    
    // Filtrar por categoria se especificado
    if (categoryFilter && categoryFilter !== "all") {
      allDealsQuery = allDealsQuery.eq("categoria", categoryFilter);
    }
    
    const { data: allDeals } = await allDealsQuery;

    if (allDeals) {
      // Calcular Ticket Médio (média apenas dos negócios ganhos)
      const dealsGanhos = allDeals.filter(d => d.status === "won" && d.value && d.value > 0);
      const somaValores = dealsGanhos.reduce((acc, d) => acc + (d.value || 0), 0);
      const ticketMedioCalculado = dealsGanhos.length > 0 ? somaValores / dealsGanhos.length : 0;
      setTicketMedio(ticketMedioCalculado);

      // Calcular Taxa de Conversão por período
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Deals do mês atual
      const currentMonthDeals = allDeals.filter(d => new Date(d.created_at) >= currentMonthStart);
      const currentMonthWon = currentMonthDeals.filter(d => d.status === "won").length;
      const currentMonthConversion = currentMonthDeals.length > 0 
        ? (currentMonthWon / currentMonthDeals.length) * 100 
        : 0;

      // Deals do mês passado
      const lastMonthDeals = allDeals.filter(d => {
        const date = new Date(d.created_at);
        return date >= lastMonthStart && date <= lastMonthEnd;
      });
      const lastMonthWon = lastMonthDeals.filter(d => d.status === "won").length;
      const lastMonthConversion = lastMonthDeals.length > 0 
        ? (lastMonthWon / lastMonthDeals.length) * 100 
        : 0;

      // Calcular melhor mês histórico
      const dealsByMonth = allDeals.reduce((acc: any, deal) => {
        const date = new Date(deal.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!acc[monthKey]) {
          acc[monthKey] = { total: 0, won: 0 };
        }
        acc[monthKey].total++;
        if (deal.status === "won") {
          acc[monthKey].won++;
        }
        return acc;
      }, {});

      let bestMonth = 0;
      let bestMonthDate = "";
      Object.entries(dealsByMonth).forEach(([month, data]: [string, any]) => {
        const conversion = data.total > 0 ? (data.won / data.total) * 100 : 0;
        if (conversion > bestMonth) {
          bestMonth = conversion;
          bestMonthDate = month;
        }
      });

      setConversionMetrics({
        currentMonth: currentMonthConversion,
        lastMonth: lastMonthConversion,
        bestMonth,
        bestMonthDate
      });
    }

    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const kpis = [
    {
      icon: UserPlus,
      label: "Novos (Período)",
      value: metrics?.new_deals || 0,
      color: "text-blue-500",
      subtitle: null
    },
    {
      icon: TrendingUp,
      label: "Em Negociação",
      value: formatCurrency(valorEmNegociacao),
      color: "text-orange-500",
      subtitle: `${emNegociacao} oportunidade${emNegociacao !== 1 ? 's' : ''}`
    },
    {
      icon: TrendingUp,
      label: "Taxa de Conversão",
      value: `${conversionMetrics.currentMonth.toFixed(1)}%`,
      color: "text-green-500",
      subtitle: `Último mês: ${conversionMetrics.lastMonth.toFixed(1)}% | Melhor: ${conversionMetrics.bestMonth.toFixed(1)}% (${conversionMetrics.bestMonthDate})`
    },
    {
      icon: DollarSign,
      label: "Ticket Médio",
      value: formatCurrency(ticketMedio),
      color: "text-purple-500",
      subtitle: null
    },
    {
      icon: CheckCircle,
      label: "Ganhou",
      value: formatCurrency(metrics?.won_value || 0),
      color: "text-green-600",
      subtitle: null
    },
    {
      icon: XCircle,
      label: "Perdeu",
      value: formatCurrency(metrics?.lost_value || 0),
      color: "text-red-500",
      subtitle: null
    },
  ];

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card 
            key={i} 
            className="flex-shrink-0 animate-fade-in" 
            style={{ width: '280px', animationDelay: `${i * 100}ms` }}
          >
            <CardContent className="p-6">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {kpis.map((kpi, index) => (
        <Card 
          key={index} 
          className="flex-shrink-0 hover:shadow-md transition-all duration-300 hover:scale-105 animate-fade-in" 
          style={{ width: '280px', animationDelay: `${index * 100}ms` }}
        >
          <CardContent className="p-6">
            <div className="flex flex-col gap-3">
              <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="text-2xl font-bold">{kpi.value}</p>
              {kpi.subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{kpi.subtitle}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
