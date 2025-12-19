import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Clock, ChevronDown, TrendingUp, TrendingDown, Trophy, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DealDetailSheet } from "./DealDetailSheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { getDaysUntilDue as getTaskDueStatus, formatBrasilShort } from "@/utils/taskTimezone";

interface CRMTasksPanelProps {
  pipelineId: string;
  categoryFilter?: string;
  ownerFilter?: string;
  searchQuery?: string;
  dateFilter?: string;
  customDateRange?: { from: Date | undefined; to: Date | undefined };
}

interface CompletedStats {
  thisMonth: number;
  lastMonth: number;
  bestMonth: { count: number; month: string };
  loading: boolean;
}

interface DealsStats {
  thisMonth: number;
  lastMonth: number;
  bestMonth: { count: number; month: string };
  loading: boolean;
}

export function CRMTasksPanel({ 
  pipelineId, 
  categoryFilter, 
  ownerFilter, 
  searchQuery, 
  dateFilter, 
  customDateRange 
}: CRMTasksPanelProps) {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<any | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [openCards, setOpenCards] = useState({
    todas: false,
    diarias: false,
    futuras: false,
  });
  const [completedStats, setCompletedStats] = useState<CompletedStats>({
    thisMonth: 0,
    lastMonth: 0,
    bestMonth: { count: 0, month: '' },
    loading: true
  });
  const [dealsStats, setDealsStats] = useState<DealsStats>({
    thisMonth: 0,
    lastMonth: 0,
    bestMonth: { count: 0, month: '' },
    loading: true
  });

  useEffect(() => {
    fetchTasks();
    fetchCompletedStats();
    fetchDealsStats();

    // Realtime subscription com debounce
    let debounceTimeout: NodeJS.Timeout;
    const channel = supabase
      .channel("crm-tasks-panel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crm_tasks",
        },
        () => {
          clearTimeout(debounceTimeout);
          debounceTimeout = setTimeout(() => {
            fetchTasks();
            fetchCompletedStats();
          }, 500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crm_deals",
        },
        () => {
          clearTimeout(debounceTimeout);
          debounceTimeout = setTimeout(() => {
            fetchDealsStats();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimeout);
      supabase.removeChannel(channel);
    };
  }, [pipelineId, categoryFilter, ownerFilter, searchQuery]);

  const fetchCompletedStats = async () => {
    setCompletedStats(prev => ({ ...prev, loading: true }));
    
    const now = new Date();
    const currentDay = now.getDate();
    
    // Este mês: do dia 1 até hoje
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Mês anterior proporcional: do dia 1 até o mesmo dia do mês anterior
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    // Pegar o mesmo dia do mês anterior (ou último dia se o mês anterior for mais curto)
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    const proportionalDay = Math.min(currentDay, lastDayOfLastMonth);
    const endOfLastMonthProportional = new Date(now.getFullYear(), now.getMonth() - 1, proportionalDay, 23, 59, 59);

    // Buscar deal_ids filtrados por categoria (tarefas não têm categoria direta)
    let dealsQuery = supabase
      .from("crm_deals")
      .select("id")
      .eq("pipeline_id", pipelineId);
    
    if (categoryFilter && categoryFilter !== "all") {
      dealsQuery = dealsQuery.eq("categoria", categoryFilter);
    }
    
    const { data: filteredDeals } = await dealsQuery;
    const dealIds = filteredDeals?.map(d => d.id) || [];

    if (dealIds.length === 0) {
      setCompletedStats({
        thisMonth: 0,
        lastMonth: 0,
        bestMonth: { count: 0, month: '' },
        loading: false
      });
      return;
    }

    // Buscar tarefas concluídas deste mês (até hoje) - filtradas por deals da categoria
    const { data: thisMonthData } = await supabase
      .from("crm_tasks")
      .select("id", { count: "exact" })
      .eq("status", "done")
      .in("deal_id", dealIds)
      .gte("updated_at", startOfThisMonth.toISOString())
      .lte("updated_at", now.toISOString());

    // Buscar tarefas concluídas do mês passado (período proporcional) - filtradas por deals da categoria
    const { data: lastMonthData } = await supabase
      .from("crm_tasks")
      .select("id", { count: "exact" })
      .eq("status", "done")
      .in("deal_id", dealIds)
      .gte("updated_at", startOfLastMonth.toISOString())
      .lte("updated_at", endOfLastMonthProportional.toISOString());

    // Buscar todas as tarefas concluídas para calcular o melhor mês - filtradas por deals da categoria
    const { data: allCompletedTasks } = await supabase
      .from("crm_tasks")
      .select("updated_at")
      .eq("status", "done")
      .in("deal_id", dealIds);

    // Calcular melhor mês
    const monthCounts: { [key: string]: number } = {};
    allCompletedTasks?.forEach(task => {
      const date = new Date(task.updated_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    });

    let bestMonthKey = '';
    let bestMonthCount = 0;
    Object.entries(monthCounts).forEach(([month, count]) => {
      if (count > bestMonthCount) {
        bestMonthCount = count;
        bestMonthKey = month;
      }
    });

    // Formatar nome do melhor mês
    let bestMonthName = '';
    if (bestMonthKey) {
      const [year, month] = bestMonthKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      bestMonthName = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    }

    setCompletedStats({
      thisMonth: thisMonthData?.length || 0,
      lastMonth: lastMonthData?.length || 0,
      bestMonth: { count: bestMonthCount, month: bestMonthName },
      loading: false
    });
  };

  const fetchDealsStats = async () => {
    setDealsStats(prev => ({ ...prev, loading: true }));
    
    const now = new Date();
    const currentDay = now.getDate();
    
    // Este mês: do dia 1 até hoje
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Mês anterior proporcional: do dia 1 até o mesmo dia do mês anterior
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    const proportionalDay = Math.min(currentDay, lastDayOfLastMonth);
    const endOfLastMonthProportional = new Date(now.getFullYear(), now.getMonth() - 1, proportionalDay, 23, 59, 59);

    // Buscar deals criados neste mês (até hoje) - com filtro de categoria
    let thisMonthQuery = supabase
      .from("crm_deals")
      .select("id", { count: "exact" })
      .eq("pipeline_id", pipelineId)
      .gte("created_at", startOfThisMonth.toISOString())
      .lte("created_at", now.toISOString());
    
    if (categoryFilter && categoryFilter !== "all") {
      thisMonthQuery = thisMonthQuery.eq("categoria", categoryFilter);
    }
    
    const { data: thisMonthData } = await thisMonthQuery;

    // Buscar deals criados do mês passado (período proporcional) - com filtro de categoria
    let lastMonthQuery = supabase
      .from("crm_deals")
      .select("id", { count: "exact" })
      .eq("pipeline_id", pipelineId)
      .gte("created_at", startOfLastMonth.toISOString())
      .lte("created_at", endOfLastMonthProportional.toISOString());
    
    if (categoryFilter && categoryFilter !== "all") {
      lastMonthQuery = lastMonthQuery.eq("categoria", categoryFilter);
    }
    
    const { data: lastMonthData } = await lastMonthQuery;

    // Buscar todos os deals para calcular o melhor mês - com filtro de categoria
    let allDealsQuery = supabase
      .from("crm_deals")
      .select("created_at")
      .eq("pipeline_id", pipelineId);
    
    if (categoryFilter && categoryFilter !== "all") {
      allDealsQuery = allDealsQuery.eq("categoria", categoryFilter);
    }
    
    const { data: allDeals } = await allDealsQuery;

    // Calcular melhor mês
    const monthCounts: { [key: string]: number } = {};
    allDeals?.forEach(deal => {
      const date = new Date(deal.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    });

    let bestMonthKey = '';
    let bestMonthCount = 0;
    Object.entries(monthCounts).forEach(([month, count]) => {
      if (count > bestMonthCount) {
        bestMonthCount = count;
        bestMonthKey = month;
      }
    });

    // Formatar nome do melhor mês
    let bestMonthName = '';
    if (bestMonthKey) {
      const [year, month] = bestMonthKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      bestMonthName = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    }

    setDealsStats({
      thisMonth: thisMonthData?.length || 0,
      lastMonth: lastMonthData?.length || 0,
      bestMonth: { count: bestMonthCount, month: bestMonthName },
      loading: false
    });
  };

  const fetchTasks = async () => {
    setLoading(true);

    // Buscar tarefas de deals do pipeline atual com todos os filtros
    let dealsQuery = supabase
      .from("crm_deals")
      .select("id, categoria, owner_id, title, created_at, lead:leads(client:clients(name))")
      .eq("pipeline_id", pipelineId)
      .eq("status", "aberto");
    
    // Filtrar por categoria se especificado
    if (categoryFilter && categoryFilter !== "all") {
      dealsQuery = dealsQuery.eq("categoria", categoryFilter);
    }

    // Filtrar por responsável
    if (ownerFilter && ownerFilter !== "all") {
      dealsQuery = dealsQuery.eq("owner_id", ownerFilter);
    }

    // Filtrar por busca (título do deal apenas - busca por cliente será feita no frontend)
    if (searchQuery && searchQuery.trim()) {
      dealsQuery = dealsQuery.ilike("title", `%${searchQuery}%`);
    }

    
    const { data: deals } = await dealsQuery;

    if (!deals || deals.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }

    // Filtro adicional no frontend para busca por nome de cliente (não suportado em nested queries)
    let filteredDeals = deals;
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredDeals = deals.filter(d => 
        d.title?.toLowerCase().includes(query) ||
        d.lead?.client?.name?.toLowerCase().includes(query)
      );
    }

    if (filteredDeals.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const dealIds = filteredDeals.map((d) => d.id);

    // Buscar todas as tarefas abertas
    const { data, error } = await supabase
      .from("crm_tasks")
      .select(`
        *,
        deal:crm_deals(
          title,
          categoria,
          stage_id,
          lead:leads(
            client:clients(name)
          )
        )
      `)
      .in("deal_id", dealIds)
      .in("status", ["open", "pendente"])
      .order("due_at", { ascending: true });

    if (error) {
      console.error("Erro ao buscar tarefas:", error);
      setLoading(false);
      return;
    }

    setTasks(data || []);
    setLoading(false);
  };

  // Usar utilitário centralizado para status de vencimento
  const getDaysUntilDue = (dueAt: string) => {
    const info = getTaskDueStatus(dueAt);
    return { 
      text: info.text, 
      variant: info.variant, 
      icon: info.isOverdue ? "⚠️" : "📅" 
    };
  };

  const handleMarkDone = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const task = tasks.find(t => t.id === taskId);
    
    const { error } = await supabase
      .from("crm_tasks")
      .update({ status: "done" })
      .eq("id", taskId);

    if (!error && task) {
      // Log no histórico do deal
      await supabase.from("crm_deal_history").insert({
        deal_id: task.deal_id,
        action_type: "task_completed",
        description: `Tarefa concluída: ${task.title}`,
        to_stage_id: task.deal?.stage_id,
        moved_by: profile?.id || null,
      });
      
      fetchTasks();
    }
  };

  const handleOpenDeal = async (dealId: string) => {
    const { data, error } = await supabase
      .from("crm_deals")
      .select(`
        *,
        stage:crm_stages(*),
        pipeline:crm_pipelines(*),
        owner:profiles(*),
        lead:leads(
          *,
          client:clients(*)
        ),
        architect:architects(*)
      `)
      .eq("id", dealId)
      .single();

    if (!error && data) {
      setSelectedDeal(data);
      setIsSheetOpen(true);
    }
  };

  // Filtrar tarefas por categoria
  const allTasks = tasks;
  const todayTasks = tasks.filter(task => {
    const dueDate = new Date(task.due_at);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    return dueDate >= startOfDay && dueDate <= endOfDay;
  });
  const futureTasks = tasks.filter(task => {
    const dueDate = new Date(task.due_at);
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    return dueDate > endOfDay;
  });

  const TaskCard = ({ task }: { task: any }) => {
    const dueInfo = getDaysUntilDue(task.due_at);
    const dueDate = new Date(task.due_at);
    const clientName = task.deal?.lead?.client?.name || "Sem cliente";
    const isOverdue = new Date(task.due_at) < new Date();

    return (
      <div
        className={`p-3 border rounded-lg space-y-2 transition-colors cursor-pointer hover:shadow-sm ${
          isOverdue 
            ? "border-destructive/40 bg-destructive/5 hover:bg-destructive/10" 
            : "border-border bg-card hover:bg-muted/50"
        }`}
        onClick={() => handleOpenDeal(task.deal_id)}
      >
        <div className="flex items-start gap-2">
          <Checkbox
            checked={false}
            onClick={(e) => handleMarkDone(task.id, e)}
            className="mt-0.5 flex-shrink-0"
          />
          <div className="flex-1 min-w-0 space-y-1">
            <p className="font-semibold text-sm line-clamp-2">{task.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {task.deal?.title} • {clientName}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={dueInfo.variant} className="text-xs flex-shrink-0 h-5 px-1.5">
                {dueInfo.icon} {dueInfo.text}
              </Badge>
              {task.tipo_tarefa === "automatizada" && (
                <Badge variant="outline" className="text-xs flex-shrink-0 h-5 px-1.5">
                  🤖 Auto
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {dueDate.toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const variation = completedStats.lastMonth > 0 
    ? ((completedStats.thisMonth - completedStats.lastMonth) / completedStats.lastMonth) * 100 
    : completedStats.thisMonth > 0 ? 100 : 0;
  
  const isNewRecord = completedStats.thisMonth > 0 && completedStats.thisMonth >= completedStats.bestMonth.count;

  const dealsVariation = dealsStats.lastMonth > 0 
    ? ((dealsStats.thisMonth - dealsStats.lastMonth) / dealsStats.lastMonth) * 100 
    : dealsStats.thisMonth > 0 ? 100 : 0;
  
  const isDealsNewRecord = dealsStats.thisMonth > 0 && dealsStats.thisMonth >= dealsStats.bestMonth.count;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">Tarefas Pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">
          Tarefas {categoryFilter && categoryFilter !== "all" && <span className="text-primary">- {categoryFilter}</span>}
        </h2>
        
        {/* Métricas Comparativas de Tarefas Concluídas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Este Mês */}
          <Card className="border-primary/20">
            <CardContent className="pt-4">
              {completedStats.loading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">
                    Concluídas Este Mês (até dia {new Date().getDate()})
                  </p>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">{completedStats.thisMonth}</span>
                    {completedStats.lastMonth > 0 && (
                      <div className={`flex items-center text-xs ${variation >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {variation > 0 ? (
                          <TrendingUp className="h-3 w-3 mr-0.5" />
                        ) : variation < 0 ? (
                          <TrendingDown className="h-3 w-3 mr-0.5" />
                        ) : (
                          <Minus className="h-3 w-3 mr-0.5" />
                        )}
                        {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
                      </div>
                    )}
                  </div>
                  {isNewRecord && (
                    <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-xs">
                      <Trophy className="h-3 w-3 mr-1" />
                      Novo Recorde!
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mês Anterior */}
          <Card>
            <CardContent className="pt-4">
              {completedStats.loading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">
                    Mês Anterior (até dia {Math.min(new Date().getDate(), new Date(new Date().getFullYear(), new Date().getMonth(), 0).getDate())})
                  </p>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-muted-foreground" />
                    <span className="text-2xl font-bold">{completedStats.lastMonth}</span>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">
                    {new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Melhor Mês */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-4">
              {completedStats.loading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Melhor Mês Histórico</p>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    <span className="text-2xl font-bold">{completedStats.bestMonth.count}</span>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">
                    {completedStats.bestMonth.month || 'Sem dados'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Métricas Comparativas de Novos Negócios */}
        <h3 className="text-lg font-semibold mt-6">
          Novos Negócios {categoryFilter && categoryFilter !== "all" && <span className="text-primary">- {categoryFilter}</span>}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Este Mês */}
          <Card className="border-blue-500/20">
            <CardContent className="pt-4">
              {dealsStats.loading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">
                    Novos Este Mês (até dia {new Date().getDate()})
                  </p>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <span className="text-2xl font-bold">{dealsStats.thisMonth}</span>
                    {dealsStats.lastMonth > 0 && (
                      <div className={`flex items-center text-xs ${dealsVariation >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {dealsVariation > 0 ? (
                          <TrendingUp className="h-3 w-3 mr-0.5" />
                        ) : dealsVariation < 0 ? (
                          <TrendingDown className="h-3 w-3 mr-0.5" />
                        ) : (
                          <Minus className="h-3 w-3 mr-0.5" />
                        )}
                        {dealsVariation > 0 ? '+' : ''}{dealsVariation.toFixed(1)}%
                      </div>
                    )}
                  </div>
                  {isDealsNewRecord && (
                    <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 text-xs">
                      <Trophy className="h-3 w-3 mr-1" />
                      Novo Recorde!
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mês Anterior */}
          <Card>
            <CardContent className="pt-4">
              {dealsStats.loading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">
                    Mês Anterior (até dia {Math.min(new Date().getDate(), new Date(new Date().getFullYear(), new Date().getMonth(), 0).getDate())})
                  </p>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span className="text-2xl font-bold">{dealsStats.lastMonth}</span>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">
                    {new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Melhor Mês */}
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="pt-4">
              {dealsStats.loading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Melhor Mês Histórico</p>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-blue-500" />
                    <span className="text-2xl font-bold">{dealsStats.bestMonth.count}</span>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">
                    {dealsStats.bestMonth.month || 'Sem dados'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* TODAS */}
          <Collapsible open={openCards.todas} onOpenChange={(open) => setOpenCards(prev => ({ ...prev, todas: open }))}>
            <Card className="flex flex-col">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span>📋</span>
                    <span>TODAS</span>
                    <Badge variant="secondary" className="ml-auto text-sm">
                      {allTasks.length}
                    </Badge>
                    <ChevronDown className={`h-4 w-4 transition-transform ${openCards.todas ? "" : "-rotate-90"}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
                  {allTasks.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground text-sm">
                      Nenhuma tarefa
                    </p>
                  ) : (
                    allTasks.map((task) => <TaskCard key={task.id} task={task} />)
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* DIÁRIAS */}
          <Collapsible open={openCards.diarias} onOpenChange={(open) => setOpenCards(prev => ({ ...prev, diarias: open }))}>
            <Card className="flex flex-col">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span>📅</span>
                    <span>DIÁRIAS</span>
                    <Badge variant="default" className="ml-auto text-sm">
                      {todayTasks.length}
                    </Badge>
                    <ChevronDown className={`h-4 w-4 transition-transform ${openCards.diarias ? "" : "-rotate-90"}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
                  {todayTasks.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground text-sm">
                      Nenhuma tarefa para hoje
                    </p>
                  ) : (
                    todayTasks.map((task) => <TaskCard key={task.id} task={task} />)
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* FUTURAS */}
          <Collapsible open={openCards.futuras} onOpenChange={(open) => setOpenCards(prev => ({ ...prev, futuras: open }))}>
            <Card className="flex flex-col">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span>🔮</span>
                    <span>FUTURAS</span>
                    <Badge variant="secondary" className="ml-auto text-sm">
                      {futureTasks.length}
                    </Badge>
                    <ChevronDown className={`h-4 w-4 transition-transform ${openCards.futuras ? "" : "-rotate-90"}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
                  {futureTasks.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground text-sm">
                      Nenhuma tarefa futura
                    </p>
                  ) : (
                    futureTasks.map((task) => <TaskCard key={task.id} task={task} />)
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>

      {selectedDeal && (
        <DealDetailSheet
          deal={selectedDeal}
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          onSuccess={() => {
            fetchTasks();
            setIsSheetOpen(false);
          }}
        />
      )}
    </>
  );
}