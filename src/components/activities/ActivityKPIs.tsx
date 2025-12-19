import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Activity,
  MessageSquare,
  CheckCircle,
  Users,
  TrendingUp,
  Clock,
} from "lucide-react";
import { SystemActivity } from "@/pages/ActivityCenter";
import { format, isToday, startOfHour, subHours } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActivityKPIsProps {
  activities: SystemActivity[];
}

export function ActivityKPIs({ activities }: ActivityKPIsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const todayActivities = activities.filter((a) => isToday(new Date(a.created_at)));
    
    // Atividades por hora (últimas 24h)
    const hourlyData: { hour: string; count: number }[] = [];
    for (let i = 23; i >= 0; i--) {
      const hourStart = startOfHour(subHours(now, i));
      const hourEnd = startOfHour(subHours(now, i - 1));
      const count = activities.filter((a) => {
        const actDate = new Date(a.created_at);
        return actDate >= hourStart && actDate < hourEnd;
      }).length;
      hourlyData.push({
        hour: format(hourStart, "HH:mm"),
        count,
      });
    }

    // Usuário mais ativo
    const userCounts: Record<string, { name: string; count: number }> = {};
    todayActivities.forEach((a) => {
      const userId = a.user_id || "sistema";
      const userName = a.user_name || "Sistema";
      if (!userCounts[userId]) {
        userCounts[userId] = { name: userName, count: 0 };
      }
      userCounts[userId].count++;
    });
    const topUser = Object.values(userCounts).sort((a, b) => b.count - a.count)[0];

    // Módulo mais ativo
    const moduleCounts: Record<string, number> = {};
    todayActivities.forEach((a) => {
      moduleCounts[a.module] = (moduleCounts[a.module] || 0) + 1;
    });
    const topModule = Object.entries(moduleCounts).sort((a, b) => b[1] - a[1])[0];

    // Contagens específicas
    const comments = todayActivities.filter((a) =>
      ["comment", "crm_comment"].includes(a.action_type)
    ).length;
    const tasksCompleted = todayActivities.filter((a) =>
      ["task_completed", "prospec_task_completed"].includes(a.action_type)
    ).length;

    // Atividades na última hora
    const oneHourAgo = subHours(now, 1);
    const lastHourActivities = activities.filter(
      (a) => new Date(a.created_at) >= oneHourAgo
    ).length;

    return {
      total: todayActivities.length,
      comments,
      tasksCompleted,
      lastHourActivities,
      topUser,
      topModule,
      hourlyData,
      uniqueUsers: Object.keys(userCounts).length,
    };
  }, [activities]);

  const moduleLabels: Record<string, string> = {
    prospeccao: "Prospecção",
    crm: "CRM",
    projetos: "Projetos",
    producao: "Produção",
    pedidos: "Pedidos",
    metas: "Metas",
    estoque: "Estoque",
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* Total hoje */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Hoje</p>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">atividades</p>
            </div>
            <Activity className="h-8 w-8 text-primary/50" />
          </div>
        </CardContent>
      </Card>

      {/* Última hora */}
      <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Última Hora</p>
              <p className="text-2xl font-bold">{stats.lastHourActivities}</p>
              <p className="text-xs text-muted-foreground">atividades</p>
            </div>
            <Clock className="h-8 w-8 text-green-500/50" />
          </div>
        </CardContent>
      </Card>

      {/* Comentários */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Comentários</p>
              <p className="text-2xl font-bold">{stats.comments}</p>
              <p className="text-xs text-muted-foreground">hoje</p>
            </div>
            <MessageSquare className="h-8 w-8 text-blue-500/50" />
          </div>
        </CardContent>
      </Card>

      {/* Tarefas concluídas */}
      <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Concluídas</p>
              <p className="text-2xl font-bold">{stats.tasksCompleted}</p>
              <p className="text-xs text-muted-foreground">tarefas hoje</p>
            </div>
            <CheckCircle className="h-8 w-8 text-emerald-500/50" />
          </div>
        </CardContent>
      </Card>

      {/* Usuário mais ativo */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Mais Ativo</p>
              <p className="text-lg font-bold truncate max-w-[100px]">
                {stats.topUser?.name || "-"}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.topUser?.count || 0} ações
              </p>
            </div>
            <Users className="h-8 w-8 text-purple-500/50" />
          </div>
        </CardContent>
      </Card>

      {/* Módulo mais ativo */}
      <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Top Módulo</p>
              <p className="text-lg font-bold truncate max-w-[100px]">
                {stats.topModule ? moduleLabels[stats.topModule[0]] || stats.topModule[0] : "-"}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.topModule?.[1] || 0} ações
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500/50" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
