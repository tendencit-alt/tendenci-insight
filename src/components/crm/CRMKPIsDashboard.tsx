import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { PhoneCall, Target, FileText, PresentationIcon, XCircle, CheckCircle } from "lucide-react";

interface CRMKPIsProps {
  pipelineId: string;
  refreshKey?: number;
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

export function CRMKPIsDashboard({ pipelineId, refreshKey = 0 }: CRMKPIsProps) {
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
  }, [pipelineId, refreshKey]);

  const fetchKPIs = async () => {
    setLoading(true);
    try {
      const { data: deals, error } = await supabase
        .from("crm_deals")
        .select("*, crm_stages(name)")
        .eq("pipeline_id", pipelineId);

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
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Projetos Captados",
      value: kpis.projetos_captados,
      icon: Target,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Em Orçamento",
      value: kpis.em_orcamento,
      subtitle: formatCurrency(kpis.valor_total_em_orcamento),
      icon: FileText,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Apresentado",
      value: kpis.apresentado,
      icon: PresentationIcon,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
    },
    {
      title: "Perdido",
      value: kpis.perdido,
      subtitle: formatCurrency(kpis.valor_total_perdido),
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Conquistado",
      value: kpis.conquistado,
      subtitle: formatCurrency(kpis.valor_total_conquistado),
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {kpiCards.map((kpi, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
            <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
            {kpi.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{kpi.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
