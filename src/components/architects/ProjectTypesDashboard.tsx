import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, TrendingUp, DollarSign, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProjectStats {
  tipo: string;
  quantidade: number;
  valor_total: number;
  ticket_medio: number;
}

interface ArchitectRanking {
  architect_id: string;
  architect_name: string;
  quantidade_projetos: number;
  valor_total: number;
  ticket_medio: number;
}

export function ProjectTypesDashboard() {
  const [stats, setStats] = useState<ProjectStats[]>([]);
  const [ranking, setRanking] = useState<ArchitectRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: statsData, error: statsError } = await supabase.rpc("get_project_stats_by_type");
      if (statsError) throw statsError;
      setStats(statsData || []);

      const { data: rankingData, error: rankingError } = await supabase.rpc("get_architect_ranking_by_type");
      if (rankingError) throw rankingError;
      setRanking(rankingData || []);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "planejado":
        return "Planejado";
      case "mobiliario_solto":
        return "Mobiliário Solto";
      default:
        return "Não especificado";
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">📊 Dashboard de Projetos por Tipo</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.tipo} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {getTipoLabel(stat.tipo)}
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Quantidade</span>
                    <Badge variant="secondary">{stat.quantidade}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Valor Total</span>
                    <span className="text-sm font-bold text-green-600">
                      R$ {stat.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Ticket Médio</span>
                    <span className="text-sm font-semibold">
                      R$ {stat.ticket_medio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Ranking de Parceiros Profissionais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ranking.slice(0, 10).map((arch, index) => (
              <div
                key={arch.architect_id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold">{arch.architect_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {arch.quantidade_projetos} projeto{arch.quantidade_projetos !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">
                    R$ {arch.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ticket: R$ {arch.ticket_medio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
