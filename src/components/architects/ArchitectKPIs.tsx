import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Users, Briefcase, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ArchitectMetrics {
  active_count: number;
  projects_count: number;
  approved_count: number;
  approved_sum: number;
  birthdays_30d: number;
}

interface ArchitectKPIsProps {
  refreshKey: number;
}

export function ArchitectKPIs({ refreshKey }: ArchitectKPIsProps) {
  const [metrics, setMetrics] = useState<ArchitectMetrics>({
    active_count: 0,
    projects_count: 0,
    approved_count: 0,
    approved_sum: 0,
    birthdays_30d: 0
  });

  useEffect(() => {
    fetchMetrics();
  }, [refreshKey]);

  const fetchMetrics = async () => {
    const { data, error } = await supabase.rpc('architects_aggregates');
    if (!error && data) {
      const metrics = data as any;
      setMetrics({
        active_count: metrics.active_count || 0,
        projects_count: metrics.projects_count || 0,
        approved_count: metrics.approved_count || 0,
        approved_sum: metrics.approved_sum || 0,
        birthdays_30d: metrics.birthdays_30d || 0
      });
    }
  };


  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Parceiros Profissionais Ativos</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{metrics.active_count}</p>
        </Card>

        <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Projetos no Período</span>
            <Briefcase className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">{metrics.projects_count}</p>
        </Card>

        <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-pink-500">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Aniversariantes do Mês</span>
            <Gift className="w-5 h-5 text-pink-600" />
          </div>
          <p className="text-3xl font-bold text-pink-600">{metrics.birthdays_30d}</p>
      </Card>
    </div>
  );
}
