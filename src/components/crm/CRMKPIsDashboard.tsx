import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, FileText, PresentationIcon, XCircle, CheckCircle, Users, Building2 } from "lucide-react";

interface CRMKPIsProps {
  pipelineId: string;
  refreshKey?: number;
  categoryFilter?: string;
  showPlanned?: boolean;
  dateFilter?: string;
  customDateRange?: { from: Date | undefined; to: Date | undefined };
  ownerFilter?: string;
  statusFilter?: string;
  searchQuery?: string;
}

interface SellerBreakdown {
  seller_name: string;
  count: number;
}

interface KPIData {
  contatos_captacao_arquitetos: number;
  oportunidades_crm: number;
  projetos_arquitetos: number;
  projetos_crm: number;
  em_orcamento: number;
  apresentado: number;
  perdido: number;
  conquistado: number;
  valor_total_conquistado: number;
  valor_total_em_orcamento: number;
  valor_total_perdido: number;
  contatos_arquitetos_por_vendedor: SellerBreakdown[];
  oportunidades_por_vendedor: SellerBreakdown[];
}

export function CRMKPIsDashboard({ 
  pipelineId, 
  refreshKey = 0, 
  categoryFilter = "all", 
  showPlanned = false,
  dateFilter = "all",
  customDateRange,
  ownerFilter = "all",
  statusFilter = "all",
  searchQuery = ""
}: CRMKPIsProps) {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIData>({
    contatos_captacao_arquitetos: 0,
    oportunidades_crm: 0,
    projetos_arquitetos: 0,
    projetos_crm: 0,
    em_orcamento: 0,
    apresentado: 0,
    perdido: 0,
    conquistado: 0,
    valor_total_conquistado: 0,
    valor_total_em_orcamento: 0,
    valor_total_perdido: 0,
    contatos_arquitetos_por_vendedor: [],
    oportunidades_por_vendedor: [],
  });

  useEffect(() => {
    if (pipelineId) {
      fetchKPIs();
    }
  }, [pipelineId, refreshKey, categoryFilter, showPlanned, dateFilter, customDateRange, ownerFilter, statusFilter, searchQuery]);

  // Realtime subscription for automatic KPI updates
  useEffect(() => {
    if (!pipelineId) return;

    const channel = supabase
      .channel('kpi-deals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_deals',
          filter: `pipeline_id=eq.${pipelineId}`
        },
        (payload) => {
          fetchKPIs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pipelineId, categoryFilter, showPlanned]);

  const fetchKPIs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("crm_deals")
        .select(`
          *, 
          crm_stages(name), 
          owner:profiles!crm_deals_owner_id_fkey(id, full_name, email),
          architect:architects(name),
          lead:leads(
            client:clients(name, phone, email)
          )
        `)
        .eq("pipeline_id", pipelineId);

      // Filtro de responsável
      if (ownerFilter && ownerFilter !== "all") {
        query = query.eq("owner_id", ownerFilter);
      }

      // Filtro de status
      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Filtro de categoria ou planejados
      if (showPlanned) {
        query = query.not("scheduled_call", "is", null);
      } else if (categoryFilter && categoryFilter !== "all") {
        query = query.eq("categoria", categoryFilter);
      }

      // Filtro de período
      if (dateFilter && dateFilter !== "all") {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (dateFilter) {
          case "today":
            query = query.gte("created_at", today.toISOString());
            break;
          case "yesterday":
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            query = query.gte("created_at", yesterday.toISOString()).lt("created_at", today.toISOString());
            break;
          case "last7days":
            const last7days = new Date(today);
            last7days.setDate(last7days.getDate() - 7);
            query = query.gte("created_at", last7days.toISOString());
            break;
          case "thisMonth":
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            query = query.gte("created_at", firstDayOfMonth.toISOString());
            break;
          case "last30days":
            const last30days = new Date(today);
            last30days.setDate(last30days.getDate() - 30);
            query = query.gte("created_at", last30days.toISOString());
            break;
          case "custom":
            if (customDateRange?.from) {
              const fromDate = new Date(customDateRange.from);
              fromDate.setHours(0, 0, 0, 0);
              query = query.gte("created_at", fromDate.toISOString());
            }
            if (customDateRange?.to) {
              const toDate = new Date(customDateRange.to);
              toDate.setHours(23, 59, 59, 999);
              query = query.lte("created_at", toDate.toISOString());
            }
            break;
        }
      }

      const { data: deals, error } = await query;

      if (error) throw error;

      // Aplicar filtro de busca (client-side porque envolve dados relacionados)
      let filteredDeals = deals || [];
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        filteredDeals = filteredDeals.filter(deal => {
          const title = deal.title?.toLowerCase() || "";
          const clientName = deal.lead?.client?.name?.toLowerCase() || "";
          const architectName = deal.architect?.name?.toLowerCase() || "";
          const clientPhone = deal.lead?.client?.phone?.toLowerCase() || "";
          const clientEmail = deal.lead?.client?.email?.toLowerCase() || "";
          
          return title.includes(searchLower) || 
                 clientName.includes(searchLower) || 
                 architectName.includes(searchLower) ||
                 clientPhone.includes(searchLower) ||
                 clientEmail.includes(searchLower);
        });
      }

      // Calcular breakdown por vendedor para oportunidades CRM
      const oportunidadesPorVendedor = new Map<string, number>();

      filteredDeals.forEach((deal) => {
        const sellerName = deal.owner?.full_name || deal.owner?.email || "Sem responsável";
        
        // Apenas deals abertos e com stage são oportunidades
        if (deal.stage_id && deal.status === "aberto") {
          oportunidadesPorVendedor.set(sellerName, (oportunidadesPorVendedor.get(sellerName) || 0) + 1);
        }
      });

      // Buscar contatos de captação de parceiros profissionais com breakdown por vendedor
      const { data: contatosArquitetos, error: errorArquitetos } = await supabase
        .from("tendenci_prospec_arq_logs")
        .select(`
          id, 
          architect_id, 
          enviado_por,
          profiles:enviado_por(full_name, email)
        `)
        .eq("tipo", "vendedor");

      // Calcular breakdown por vendedor para contatos de parceiros profissionais
      const contatosArquitetosPorVendedor = new Map<string, number>();
      
      contatosArquitetos?.forEach((contato: any) => {
        const sellerName = contato.profiles?.full_name || contato.profiles?.email || "Sem responsável";
        contatosArquitetosPorVendedor.set(sellerName, (contatosArquitetosPorVendedor.get(sellerName) || 0) + 1);
      });

      // Buscar projetos de parceiros profissionais
      const { data: projetosArquitetos, error: errorProjetosArq } = await supabase
        .from("architect_projects")
        .select("id, architect_id, created_by");

      const kpiData: KPIData = {
        contatos_captacao_arquitetos: contatosArquitetos?.length || 0,
        oportunidades_crm: filteredDeals.filter((d) => d.stage_id && d.status === "aberto").length || 0,
        projetos_arquitetos: projetosArquitetos?.length || 0,
        projetos_crm: filteredDeals.filter((d) => !d.architect_id && d.status === "ganho").length || 0,
        em_orcamento: filteredDeals.filter((d) => d.crm_stages?.name?.toLowerCase().includes("orçamento")).length || 0,
        apresentado: filteredDeals.filter((d) => d.crm_stages?.name?.toLowerCase().includes("apresent")).length || 0,
        perdido: filteredDeals.filter((d) => d.status === "perdido").length || 0,
        conquistado: filteredDeals.filter((d) => d.status === "ganho").length || 0,
        valor_total_conquistado: filteredDeals.filter((d) => d.status === "ganho").reduce((acc, d) => acc + (d.value || 0), 0) || 0,
        valor_total_em_orcamento: filteredDeals.filter((d) => d.crm_stages?.name?.toLowerCase().includes("orçamento")).reduce((acc, d) => acc + (d.value || 0), 0) || 0,
        valor_total_perdido: filteredDeals.filter((d) => d.status === "perdido").reduce((acc, d) => acc + (d.value || 0), 0) || 0,
        contatos_arquitetos_por_vendedor: Array.from(contatosArquitetosPorVendedor.entries())
          .map(([seller_name, count]) => ({ seller_name, count }))
          .sort((a, b) => b.count - a.count),
        oportunidades_por_vendedor: Array.from(oportunidadesPorVendedor.entries())
          .map(([seller_name, count]) => ({ seller_name, count }))
          .sort((a, b) => b.count - a.count),
      };

      setKpis(kpiData);
    } catch (error) {
      console.error("Erro ao buscar KPIs:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const kpiCards = [
    {
      title: "Contatos Captação Parceiros Profissionais",
      value: kpis.contatos_captacao_arquitetos,
      icon: Users,
      colorClass: "text-blue-500",
      bgClass: "bg-blue-500/10",
      breakdown: kpis.contatos_arquitetos_por_vendedor,
    },
    {
      title: "Oportunidades no CRM",
      value: kpis.oportunidades_crm,
      icon: Target,
      colorClass: "text-accent",
      bgClass: "bg-accent/10",
      breakdown: kpis.oportunidades_por_vendedor,
    },
    {
      title: "Projetos de Parceiros Profissionais",
      value: kpis.projetos_arquitetos,
      icon: Users,
      colorClass: "text-purple-500",
      bgClass: "bg-purple-500/10",
    },
    {
      title: "Projetos CRM (Sem Parceiro Profissional)",
      value: kpis.projetos_crm,
      icon: Building2,
      colorClass: "text-orange-500",
      bgClass: "bg-orange-500/10",
    },
    {
      title: "Em Orçamento",
      value: kpis.em_orcamento,
      subtitle: formatCurrency(kpis.valor_total_em_orcamento),
      icon: FileText,
      colorClass: "text-chart-2",
      bgClass: "bg-chart-2/10",
    },
    {
      title: "Apresentado",
      value: kpis.apresentado,
      icon: PresentationIcon,
      colorClass: "text-chart-3",
      bgClass: "bg-chart-3/10",
    },
    {
      title: "Perdido",
      value: kpis.perdido,
      subtitle: formatCurrency(kpis.valor_total_perdido),
      icon: XCircle,
      colorClass: "text-destructive",
      bgClass: "bg-destructive/10",
    },
    {
      title: "Conquistado",
      value: kpis.conquistado,
      subtitle: formatCurrency(kpis.valor_total_conquistado),
      icon: CheckCircle,
      colorClass: "text-green-600",
      bgClass: "bg-green-600/10",
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-3">
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      {kpiCards.map((kpi, index) => (
        <Card 
          key={index} 
          className="hover:shadow-md transition-all hover:scale-[1.02] border-border/50 bg-card/50 backdrop-blur-sm"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 p-3">
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <CardTitle className="text-[10px] font-medium text-muted-foreground truncate leading-tight">
                {kpi.title}
              </CardTitle>
              <div className="text-xl font-bold tabular-nums">{kpi.value}</div>
            </div>
            <div className={`p-1.5 rounded-lg ${kpi.bgClass} shrink-0`}>
              <kpi.icon className={`h-3.5 w-3.5 ${kpi.colorClass}`} />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-0.5">
            {kpi.subtitle && (
              <p className="text-[10px] font-medium text-muted-foreground truncate leading-tight">
                {kpi.subtitle}
              </p>
            )}
            {kpi.breakdown && kpi.breakdown.length > 0 && (
              <div className="space-y-0.5 mt-1 pt-1 border-t border-border/50">
                {kpi.breakdown.map((seller, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[10px]">
                    <span className="text-muted-foreground truncate flex-1 mr-1">
                      {seller.seller_name}
                    </span>
                    <span className="font-semibold text-foreground tabular-nums shrink-0">
                      {seller.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
