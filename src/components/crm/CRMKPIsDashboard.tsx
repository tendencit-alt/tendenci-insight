import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { PhoneCall, Target, FileText, PresentationIcon, XCircle, CheckCircle } from "lucide-react";

interface CRMKPIsProps {
  pipelineId: string;
  refreshKey?: number;
  categoryFilter?: string;
  showPlanned?: boolean;
}

interface KPIData {
  contatos_feitos: number;
  projetos_captados: number;
  em_orcamento: number;
  apresentado: number;
  perdido: number;
  conquistado: number;
  valor_total_conquistado: number;
  valor_total_em_orcamento: number;
  valor_total_perdido: number;
}

export function CRMKPIsDashboard({ pipelineId, refreshKey = 0, categoryFilter = "all", showPlanned = false }: CRMKPIsProps) {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIData>({
    contatos_feitos: 0,
    projetos_captados: 0,
    em_orcamento: 0,
    apresentado: 0,
    perdido: 0,
    conquistado: 0,
    valor_total_conquistado: 0,
    valor_total_em_orcamento: 0,
    valor_total_perdido: 0,
  });

  useEffect(() => {
    if (pipelineId) {
      fetchKPIs();
    }
  }, [pipelineId, refreshKey, categoryFilter, showPlanned]);

  const fetchKPIs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("crm_deals")
        .select("*, crm_stages(name)")
        .eq("pipeline_id", pipelineId);

      if (showPlanned) {
        query = query.not("scheduled_call", "is", null);
      } else if (categoryFilter && categoryFilter !== "all") {
        query = query.eq("categoria", categoryFilter);
      }

      const { data: deals, error } = await query;

      if (error) throw error;

      const kpiData: KPIData = {
        contatos_feitos: deals?.length || 0,
        projetos_captados: deals?.filter((d) => d.stage_id && d.status === "aberto").length || 0,
        em_orcamento: deals?.filter((d) => d.crm_stages?.name?.toLowerCase().includes("orçamento")).length || 0,
        apresentado: deals?.filter((d) => d.crm_stages?.name?.toLowerCase().includes("apresent")).length || 0,
        perdido: deals?.filter((d) => d.status === "lost").length || 0,
        conquistado: deals?.filter((d) => d.status === "won").length || 0,
        valor_total_conquistado: deals?.filter((d) => d.status === "won").reduce((acc, d) => acc + (d.value || 0), 0) || 0,
        valor_total_em_orcamento: deals?.filter((d) => d.crm_stages?.name?.toLowerCase().includes("orçamento")).reduce((acc, d) => acc + (d.value || 0), 0) || 0,
        valor_total_perdido: deals?.filter((d) => d.status === "lost").reduce((acc, d) => acc + (d.value || 0), 0) || 0,
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
      title: "Contatos Feitos",
      value: kpis.contatos_feitos,
      icon: PhoneCall,
      colorClass: "text-primary",
      bgClass: "bg-primary/10",
    },
    {
      title: "Projetos Captados",
      value: kpis.projetos_captados,
      icon: Target,
      colorClass: "text-accent",
      bgClass: "bg-accent/10",
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
      colorClass: "text-chart-1",
      bgClass: "bg-chart-1/10",
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      {kpiCards.map((kpi, index) => (
        <Card 
          key={index} 
          className="hover:shadow-md transition-all hover:scale-[1.02] border-border/50 bg-card/50 backdrop-blur-sm"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <CardTitle className="text-xs font-medium text-muted-foreground truncate">
                {kpi.title}
              </CardTitle>
              <div className="text-2xl font-bold tabular-nums">{kpi.value}</div>
            </div>
            <div className={`p-2 rounded-lg ${kpi.bgClass} shrink-0`}>
              <kpi.icon className={`h-4 w-4 ${kpi.colorClass}`} />
            </div>
          </CardHeader>
          {kpi.subtitle && (
            <CardContent className="p-4 pt-0">
              <p className="text-xs font-medium text-muted-foreground truncate">
                {kpi.subtitle}
              </p>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
