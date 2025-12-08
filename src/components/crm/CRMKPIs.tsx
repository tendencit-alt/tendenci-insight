import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, TrendingUp, DollarSign, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface CRMKPIsProps {
  pipelineId: string;
  categoryFilter?: string;
  ownerFilter?: string;
  dateFilter?: string;
  customDateRange?: { from: Date | undefined; to: Date | undefined };
}

interface ConversionMetrics {
  currentMonth: number;
  lastMonth: number;
  bestMonth: number;
  bestMonthDate: string;
}

export function CRMKPIs({ 
  pipelineId, 
  categoryFilter, 
  ownerFilter, 
  dateFilter, 
  customDateRange 
}: CRMKPIsProps) {
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
  }, [pipelineId, categoryFilter, ownerFilter, dateFilter, customDateRange]);

  // Calcular datas baseado no dateFilter
  const getDateRange = () => {
    if (dateFilter === "custom" && customDateRange) {
      return {
        from: customDateRange.from?.toISOString() || null,
        to: customDateRange.to?.toISOString() || null
      };
    }

    const now = new Date();
    let startDate: Date | null = null;
    
    switch(dateFilter) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "yesterday":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        break;
      case "last7days":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "thisMonth":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "last30days":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        return { from: null, to: null };
    }
    
    return {
      from: startDate?.toISOString() || null,
      to: dateFilter === "yesterday" 
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        : null
    };
  };

  const fetchMetrics = async () => {
    setLoading(true);
    
    const dateRange = getDateRange();
    
    // Buscar dados básicos usando RPC atualizada com todos os parâmetros
    const { data, error } = await supabase.rpc("crm_agg", {
      p_pipeline_id: pipelineId,
      p_category: categoryFilter && categoryFilter !== "all" ? categoryFilter : null,
      p_owner_id: ownerFilter && ownerFilter !== "all" ? ownerFilter : null,
      p_date_from: dateRange.from,
      p_date_to: dateRange.to,
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
      
      // Filtrar por responsável
      if (ownerFilter && ownerFilter !== "all") {
        negociacaoQuery = negociacaoQuery.eq("owner_id", ownerFilter);
      }

      // Filtrar por data
      if (dateRange.from) {
        negociacaoQuery = negociacaoQuery.gte("created_at", dateRange.from);
      }
      if (dateRange.to) {
        negociacaoQuery = negociacaoQuery.lte("created_at", dateRange.to);
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

    // Filtrar por responsável
    if (ownerFilter && ownerFilter !== "all") {
      allDealsQuery = allDealsQuery.eq("owner_id", ownerFilter);
    }

    // Filtrar por data
    if (dateRange.from) {
      allDealsQuery = allDealsQuery.gte("created_at", dateRange.from);
    }
    if (dateRange.to) {
      allDealsQuery = allDealsQuery.lte("created_at", dateRange.to);
    }
    
    const { data: allDeals } = await allDealsQuery;

    if (allDeals) {
      // Calcular Ticket Médio (média apenas dos negócios ganhos no período)
      const dealsGanhos = allDeals.filter(d => d.status === "won" && d.value && d.value > 0);
      const somaValores = dealsGanhos.reduce((acc, d) => acc + (d.value || 0), 0);
      const ticketMedioCalculado = dealsGanhos.length > 0 ? somaValores / dealsGanhos.length : 0;
      setTicketMedio(ticketMedioCalculado);

      // Calcular Taxa de Conversão do período filtrado (não do mês atual fixo)
      const totalDeals = allDeals.length;
      const wonDeals = allDeals.filter(d => d.status === "won").length;
      const periodConversion = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;

      // Para comparação, buscar período anterior equivalente
      let previousPeriodConversion = 0;
      let bestMonth = 0;
      let bestMonthDate = "";

      // Calcular melhor período histórico por mês
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

      Object.entries(dealsByMonth).forEach(([month, data]: [string, any]) => {
        const conversion = data.total > 0 ? (data.won / data.total) * 100 : 0;
        if (conversion > bestMonth) {
          bestMonth = conversion;
          bestMonthDate = month;
        }
      });

      setConversionMetrics({
        currentMonth: periodConversion,
        lastMonth: previousPeriodConversion,
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

  // Get period label for KPIs
  const getPeriodLabel = () => {
    switch (dateFilter) {
      case "today": return "Hoje";
      case "yesterday": return "Ontem";
      case "last7days": return "7 dias";
      case "thisMonth": return "Este mês";
      case "last30days": return "30 dias";
      case "custom": return "Período";
      default: return "Total";
    }
  };

  const periodLabel = getPeriodLabel();

  const kpis = [
    {
      icon: UserPlus,
      label: `Novos (${periodLabel})`,
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
      label: `Conversão (${periodLabel})`,
      value: `${conversionMetrics.currentMonth.toFixed(1)}%`,
      color: "text-green-500",
      subtitle: conversionMetrics.bestMonth > 0 ? `Melhor: ${conversionMetrics.bestMonth.toFixed(1)}% (${conversionMetrics.bestMonthDate})` : null
    },
    {
      icon: DollarSign,
      label: `Ticket Médio (${periodLabel})`,
      value: formatCurrency(ticketMedio),
      color: "text-purple-500",
      subtitle: null
    },
    {
      icon: CheckCircle,
      label: `Ganhou (${periodLabel})`,
      value: formatCurrency(metrics?.won_value || 0),
      color: "text-green-600",
      subtitle: `${metrics?.won_count || 0} negócios`
    },
    {
      icon: XCircle,
      label: `Perdeu (${periodLabel})`,
      value: formatCurrency(metrics?.lost_value || 0),
      color: "text-red-500",
      subtitle: `${metrics?.lost_count || 0} negócios`
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card 
            key={i} 
            className="animate-fade-in" 
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <CardContent className="p-4">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
      {kpis.map((kpi, index) => (
        <Card 
          key={index} 
          className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] animate-fade-in" 
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <CardContent className="p-2.5">
            <div className="flex flex-col gap-1">
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              <p className="text-[10px] font-medium text-muted-foreground">{kpi.label}</p>
              <p className="text-lg font-bold tracking-tight">{kpi.value}</p>
              {kpi.subtitle && (
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{kpi.subtitle}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
