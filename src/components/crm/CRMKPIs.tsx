import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, MessageSquare, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface CRMKPIsProps {
  pipelineId: string;
}

export function CRMKPIs({ pipelineId }: CRMKPIsProps) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    if (!pipelineId) return;
    fetchMetrics();
  }, [pipelineId]);

  const fetchMetrics = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("crm_agg", {
      p_pipeline_id: pipelineId,
    });

    if (!error && data) {
      setMetrics(data);
    }
    setLoading(false);
  };

  const kpis = [
    {
      icon: UserPlus,
      label: "Novos (Período)",
      value: metrics?.new_deals || 0,
      color: "text-blue-500",
    },
    {
      icon: MessageSquare,
      label: "Aguardando Resposta",
      value: 0,
      color: "text-yellow-500",
    },
    {
      icon: TrendingUp,
      label: "Win Rate",
      value: `${metrics?.win_rate || 0}%`,
      color: "text-green-500",
    },
    {
      icon: Clock,
      label: "Tempo médio no Estágio",
      value: `${metrics?.avg_stage_time || 0}h`,
      color: "text-purple-500",
    },
    {
      icon: CheckCircle,
      label: "Ganhou",
      value: `R$ ${metrics?.won_value || 0}`,
      color: "text-green-600",
    },
    {
      icon: XCircle,
      label: "Perdeu",
      value: `R$ ${metrics?.lost_value || 0}`,
      color: "text-red-500",
    },
  ];

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="flex-shrink-0" style={{ width: '280px' }}>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {kpis.map((kpi, index) => (
        <Card key={index} className="flex-shrink-0 hover:shadow-md transition-shadow" style={{ width: '280px' }}>
          <CardContent className="p-6">
            <div className="flex flex-col gap-3">
              <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
