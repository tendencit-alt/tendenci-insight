import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageSquare, 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRightLeft,
  Users
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface FollowupStats {
  queueSize: number;
  sentToday: number;
  sentWeek: number;
  successRate: number;
  responseRate: number;
  movedToLead: number;
  groupInvites: number;
  failedRecent: number;
}

export function FollowupMonitorKPIs() {
  const [stats, setStats] = useState<FollowupStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      // Buscar stage de Follow Up
      const { data: followupStage } = await supabase
        .from("crm_stages")
        .select("id")
        .eq("name", "Follow Up (I.A)")
        .single();

      const { data: leadStage } = await supabase
        .from("crm_stages")
        .select("id")
        .eq("name", "Lead")
        .single();

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Fila de follow-up (deals no stage com followup_enabled)
      const { count: queueSize } = await supabase
        .from("crm_deals")
        .select("*", { count: "exact", head: true })
        .eq("stage_id", followupStage?.id || "")
        .eq("followup_enabled", true)
        .eq("status", "aberto");

      // Enviados hoje
      const { count: sentToday } = await supabase
        .from("followup_logs")
        .select("*", { count: "exact", head: true })
        .eq("status", "sent")
        .gte("sent_at", todayStart);

      // Enviados na semana
      const { count: sentWeek } = await supabase
        .from("followup_logs")
        .select("*", { count: "exact", head: true })
        .eq("status", "sent")
        .gte("sent_at", weekStart);

      // Falhas recentes (últimos 7 dias)
      const { count: failedRecent } = await supabase
        .from("followup_logs")
        .select("*", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("created_at", weekStart);

      // Taxa de sucesso
      const { count: totalAttempts } = await supabase
        .from("followup_logs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekStart);

      const successRate = totalAttempts && totalAttempts > 0 
        ? Math.round(((sentWeek || 0) / totalAttempts) * 100) 
        : 0;

      // Movidos para Lead (deals que saíram do Follow Up para Lead nos últimos 7 dias)
      const { count: movedToLead } = await supabase
        .from("crm_deal_history")
        .select("*", { count: "exact", head: true })
        .eq("from_stage_id", followupStage?.id || "")
        .eq("to_stage_id", leadStage?.id || "")
        .gte("moved_at", weekStart);

      // Convites de grupo enviados
      const { count: groupInvites } = await supabase
        .from("crm_deals")
        .select("*", { count: "exact", head: true })
        .eq("group_invite_sent", true)
        .gte("group_invite_sent_at", weekStart);

      // Taxa de resposta (deals que foram movidos / deals que receberam follow-up)
      const responseRate = sentWeek && sentWeek > 0 
        ? Math.round(((movedToLead || 0) / sentWeek) * 100) 
        : 0;

      setStats({
        queueSize: queueSize || 0,
        sentToday: sentToday || 0,
        sentWeek: sentWeek || 0,
        successRate,
        responseRate,
        movedToLead: movedToLead || 0,
        groupInvites: groupInvites || 0,
        failedRecent: failedRecent || 0,
      });
    } catch (error) {
      console.error("Erro ao buscar stats de follow-up:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      label: "Na Fila",
      value: stats?.queueSize || 0,
      icon: MessageSquare,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Enviados Hoje",
      value: stats?.sentToday || 0,
      icon: Send,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Enviados (7d)",
      value: stats?.sentWeek || 0,
      icon: Send,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Taxa Sucesso",
      value: `${stats?.successRate || 0}%`,
      icon: CheckCircle,
      color: "text-teal-500",
      bgColor: "bg-teal-500/10",
    },
    {
      label: "Taxa Resposta",
      value: `${stats?.responseRate || 0}%`,
      icon: ArrowRightLeft,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Movidos p/ Lead",
      value: stats?.movedToLead || 0,
      icon: ArrowRightLeft,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
    },
    {
      label: "Convites Grupo",
      value: stats?.groupInvites || 0,
      icon: Users,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
    {
      label: "Falhas (7d)",
      value: stats?.failedRecent || 0,
      icon: AlertTriangle,
      color: stats?.failedRecent && stats.failedRecent > 0 ? "text-red-500" : "text-muted-foreground",
      bgColor: stats?.failedRecent && stats.failedRecent > 0 ? "bg-red-500/10" : "bg-muted/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-md ${kpi.bgColor}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
            <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
