import { Card } from "@/components/ui/card";
import { Users, TrendingUp, Calendar, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function ProspeccaoOverview() {
  // Buscar KPIs
  const { data: kpis } = useQuery({
    queryKey: ["prospeccao-kpis"],
    queryFn: async () => {
      const { data: architects, error } = await supabase
        .from("architects")
        .select("id, status_funil, data_ultimo_contato, active")
        .eq("active", true);

      if (error) throw error;

      const total = architects?.length || 0;
      const emProspeccao = architects?.filter(a => 
        ['contato_iniciado', 'em_conversa', 'interessado'].includes(a.status_funil)
      ).length || 0;
      const ativados = architects?.filter(a => a.status_funil === 'parceiro_ativo').length || 0;
      const interessados = architects?.filter(a => a.status_funil === 'interessado').length || 0;
      
      // Arquitetos sem contato há +30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const semContato = architects?.filter(a => 
        !a.data_ultimo_contato || new Date(a.data_ultimo_contato) < thirtyDaysAgo
      ).length || 0;

      return {
        total,
        emProspeccao,
        ativados,
        interessados,
        semContato,
        reunioesAgendadas: 0, // TODO: buscar da tabela de agendamentos
      };
    },
  });

  const stats = [
    {
      label: "Arquitetos em Prospecção",
      value: kpis?.emProspeccao || 0,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Arquitetos Ativados",
      value: kpis?.ativados || 0,
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Arquitetos Interessados",
      value: kpis?.interessados || 0,
      icon: TrendingUp,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      label: "Reuniões Agendadas",
      value: kpis?.reunioesAgendadas || 0,
      icon: Calendar,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Sem Contato +30 dias",
      value: kpis?.semContato || 0,
      icon: AlertCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Gráficos Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Prospecção ao Longo do Tempo</h3>
          <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
            <div className="text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Gráfico em desenvolvimento</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Performance por Campanha</h3>
          <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
            <div className="text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Gráfico em desenvolvimento</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Arquitetos */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Arquitetos com Mais Projetos</h3>
        <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
          <div className="text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Tabela em desenvolvimento</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
