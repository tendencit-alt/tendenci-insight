import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ActivityFeed } from "@/components/activities/ActivityFeed";
import { ActivityFilters } from "@/components/activities/ActivityFilters";
import { ActivityKPIs } from "@/components/activities/ActivityKPIs";
import { FollowupMonitorKPIs } from "@/components/followup-monitor/FollowupMonitorKPIs";
import { FollowupActivityFeed } from "@/components/followup-monitor/FollowupActivityFeed";
import { FollowupCharts } from "@/components/followup-monitor/FollowupCharts";
import { FollowupFailuresPanel } from "@/components/followup-monitor/FollowupFailuresPanel";
import { FollowupAuditPanel } from "@/components/followup-monitor/FollowupAuditPanel";
import { FollowupDispatchPanel } from "@/components/followup-monitor/FollowupDispatchPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, RefreshCw, Bot, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getStartOfDayBrasilAsUTC, getDaysAgoBrasilAsUTC } from "@/utils/timezone";
import { describeError } from '@/lib/errorMessage';

export interface SystemActivity {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action_type: string;
  module: string;
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  description: string;
  old_value: string | null;
  new_value: string | null;
  metadata: any;
  created_at: string;
}

export interface ActivityFiltersState {
  module: string;
  actionType: string;
  userId: string;
  period: string;
  search: string;
  startDate: Date | null;
  endDate: Date | null;
}

export default function ActivityCenter() {
  const [activities, setActivities] = useState<SystemActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ActivityFiltersState>({
    module: "all",
    actionType: "all",
    userId: "all",
    period: "all",
    search: "",
    startDate: null,
    endDate: null,
  });
  const [isRealtime, setIsRealtime] = useState(true);
  const [activeTab, setActiveTab] = useState("activities");
  const { toast } = useToast();

  // Limite dinâmico baseado no período selecionado
  const getActivityLimit = () => {
    switch (filters.period) {
      case "last_hour": return 100;
      case "today": return 300;
      case "last_7_days": return 500;
      case "last_30_days": return 1000;
      case "custom": return 1000;
      case "all": return 1000;
      default: return 1000;
    }
  };

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const limit = getActivityLimit();
      let query = supabase
        .from("system_activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      // Filtro por módulo
      if (filters.module !== "all") {
        query = query.eq("module", filters.module);
      }

      // Filtro por tipo de ação
      if (filters.actionType !== "all") {
        query = query.eq("action_type", filters.actionType);
      }

      // Filtro por usuário
      if (filters.userId !== "all") {
        query = query.eq("user_id", filters.userId);
      }

      // Filtro por período - usando timezone de Brasília para consistência
      if (filters.period === "custom" && filters.startDate && filters.endDate) {
        // Para período customizado, ajustar para timezone Brasil (UTC-3)
        const startDate = new Date(filters.startDate);
        startDate.setUTCHours(3, 0, 0, 0); // 00:00 Brasil = 03:00 UTC
        const endDate = new Date(filters.endDate);
        endDate.setUTCHours(26, 59, 59, 999); // 23:59 Brasil = 02:59 do dia seguinte UTC
        query = query.gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString());
      } else if (filters.period === "today") {
        // Usar início do dia em horário de Brasília
        const startOfDayBrasil = getStartOfDayBrasilAsUTC();
        query = query.gte("created_at", startOfDayBrasil.toISOString());
      } else if (filters.period === "last_hour") {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        query = query.gte("created_at", oneHourAgo);
      } else if (filters.period === "last_7_days") {
        const sevenDaysAgo = getDaysAgoBrasilAsUTC(7);
        query = query.gte("created_at", sevenDaysAgo.toISOString());
      } else if (filters.period === "last_30_days") {
        const thirtyDaysAgo = getDaysAgoBrasilAsUTC(30);
        query = query.gte("created_at", thirtyDaysAgo.toISOString());
      }

      // Filtro por busca
      if (filters.search) {
        query = query.or(`description.ilike.%${filters.search}%,entity_name.ilike.%${filters.search}%,user_name.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error("Erro ao buscar atividades:", error);
      toast({
        title: "Erro",
        description: describeError('Não foi possível carregar as atividades', error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Buscar atividades quando filtros mudam
  useEffect(() => {
    fetchActivities();
  }, [filters.module, filters.actionType, filters.userId, filters.period, filters.search, filters.startDate?.getTime(), filters.endDate?.getTime()]);

  // Refresh automático como fallback quando realtime está ativo
  useEffect(() => {
    if (!isRealtime) return;
    
    const interval = setInterval(() => {
      fetchActivities();
    }, 30000); // Refresh a cada 30 segundos como fallback
    
    return () => clearInterval(interval);
  }, [isRealtime, filters.module, filters.actionType, filters.userId, filters.period, filters.search]);

  // Configurar realtime
  useEffect(() => {
    if (!isRealtime) return;

    const channel = supabase
      .channel("system-activities-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "system_activities",
        },
        (payload) => {
          const newActivity = payload.new as SystemActivity;
          
          // Verificar se a atividade passa pelos filtros atuais
          let shouldAdd = true;
          
          if (filters.module !== "all" && newActivity.module !== filters.module) {
            shouldAdd = false;
          }
          if (filters.actionType !== "all" && newActivity.action_type !== filters.actionType) {
            shouldAdd = false;
          }
          if (filters.userId !== "all" && newActivity.user_id !== filters.userId) {
            shouldAdd = false;
          }
          
          if (shouldAdd) {
            setActivities((prev) => [newActivity, ...prev].slice(0, 500));
            
            // Notificação visual para nova atividade
            toast({
              title: "Nova atividade",
              description: `${newActivity.user_name || "Sistema"}: ${newActivity.description.substring(0, 50)}...`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isRealtime, filters]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Central de Atividades</h1>
              <p className="text-muted-foreground">
                Acompanhe todas as ações do sistema em tempo real
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isRealtime ? "default" : "outline"}
              size="sm"
              onClick={() => setIsRealtime(!isRealtime)}
            >
              <span className={`h-2 w-2 rounded-full mr-2 ${isRealtime ? "bg-green-500 animate-pulse" : "bg-muted"}`} />
              {isRealtime ? "Tempo Real ON" : "Tempo Real OFF"}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchActivities}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="activities" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Atividades
            </TabsTrigger>
            <TabsTrigger value="followups" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Follow-ups IA
            </TabsTrigger>
          </TabsList>

          {/* Tab: Atividades */}
          <TabsContent value="activities" className="space-y-6 mt-6">
            {/* KPIs */}
            <ActivityKPIs activities={activities} filters={filters} />

            {/* Filters */}
            <ActivityFilters filters={filters} onFiltersChange={setFilters} />

            {/* Feed */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Feed de Atividades
                  {isRealtime && (
                    <span className="text-xs bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full">
                      Atualização automática
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityFeed activities={activities} loading={loading} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Follow-ups IA */}
          <TabsContent value="followups" className="space-y-6 mt-6">
            {/* KPIs de Follow-up */}
            <FollowupMonitorKPIs />

            {/* Gráficos */}
            <FollowupCharts />

            {/* Painel de Disparo em destaque */}
            <FollowupDispatchPanel />

            {/* Grid 3 colunas para os demais componentes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Feed de Atividade */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Atividade em Tempo Real
                    {isRealtime && (
                      <span className="text-xs bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full">
                        Auto-scroll
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FollowupActivityFeed isRealtime={isRealtime} />
                </CardContent>
              </Card>

              <FollowupFailuresPanel />
              
              <FollowupAuditPanel />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
