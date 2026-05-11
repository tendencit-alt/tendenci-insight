import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Clock, AlertTriangle, Calendar, Bot, User, CheckCircle, TrendingUp, TrendingDown, Minus, Trophy, RefreshCw, Archive, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ArchitectProspeccaoSheet } from "./ArchitectProspeccaoSheet";
import { usePermissions } from "@/hooks/usePermissions";
import { getDaysUntilDue as getTaskDueStatus, formatBrasilShort, isTodayBrasil, isFutureDayBrasil } from "@/utils/taskTimezone";

interface ArchitectTasksPanelProps {
  filters?: any;
}

interface Task {
  id: string;
  tipo_tarefa: string;
  data_agendamento: string;
  observacoes: string | null;
  status: string;
  architect_id: string;
  architect: {
    id: string;
    name: string;
    company: string | null;
    phone: string | null;
  } | null;
  vendedor: {
    full_name: string | null;
  } | null;
}

interface CompletedStats {
  thisMonth: number;
  lastMonth: number;
  bestMonth: { count: number; month: string };
  loading: boolean;
}

export function ArchitectTasksPanel({ filters }: ArchitectTasksPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [failedTasks, setFailedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArchitectId, setSelectedArchitectId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [openCards, setOpenCards] = useState({
    problemas: false,
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
  const { isMaster } = usePermissions();

  const fetchTasks = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase
        .from("tendenci_prospec_arq_agendamentos")
        .select(`
          id,
          tipo_tarefa,
          data_agendamento,
          observacoes,
          status,
          architect_id,
          architect:architects(id, name, company, phone),
          vendedor:profiles!tendenci_prospec_arq_agendamentos_vendedor_id_fkey(full_name)
        `)
        .eq("status", "pendente")
        .order("data_agendamento", { ascending: true });

      // CORREÇÃO: Vendedores veem apenas suas tarefas; MASTER vê todas
      if (!isMaster && user?.id) {
        // Vendedor comum: vê apenas suas próprias tarefas
        query = query.eq("vendedor_id", user.id);
      } else if (filters?.vendedor && filters.vendedor !== "todos") {
        // MASTER pode filtrar por vendedor específico
        query = query.eq("vendedor_id", filters.vendedor);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Client-side search filter to include architect name/company
      let filteredData = (data as Task[]) || [];
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter(task => 
          task.architect?.name?.toLowerCase().includes(searchLower) ||
          task.architect?.company?.toLowerCase().includes(searchLower) ||
          task.observacoes?.toLowerCase().includes(searchLower)
        );
      }
      
      setTasks(filteredData);
    } catch (error) {
      console.error("Error fetching architect tasks:", error);
    } finally {
      setLoading(false);
    }
  }, [filters?.vendedor, filters?.search, isMaster]);

  const fetchFailedTasks = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase
        .from("tendenci_prospec_arq_agendamentos")
        .select(`
          id,
          tipo_tarefa,
          data_agendamento,
          observacoes,
          status,
          architect_id,
          archived_at,
          architect:architects(id, name, company, phone),
          vendedor:profiles!tendenci_prospec_arq_agendamentos_vendedor_id_fkey(full_name)
        `)
        .eq("status", "falha")
        .order("data_agendamento", { ascending: true });

      if (!isMaster && user?.id) {
        query = query.eq("vendedor_id", user.id);
      } else if (filters?.vendedor && filters.vendedor !== "todos") {
        query = query.eq("vendedor_id", filters.vendedor);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Filtrar tarefas não arquivadas no frontend (compatível se coluna não existe)
      let filteredData = ((data as any[]) || []).filter(task => !task.archived_at);
      
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter(task => 
          task.architect?.name?.toLowerCase().includes(searchLower) ||
          task.architect?.company?.toLowerCase().includes(searchLower) ||
          task.observacoes?.toLowerCase().includes(searchLower)
        );
      }
      
      setFailedTasks(filteredData as Task[]);
    } catch (error) {
      console.error("Error fetching failed architect tasks:", error);
    }
  }, [filters?.vendedor, filters?.search, isMaster]);

  const fetchCompletedStats = useCallback(async () => {
    setCompletedStats(prev => ({ ...prev, loading: true }));
    
    const now = new Date();
    const currentDay = now.getDate();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Este mês: do dia 1 até hoje
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Mês anterior proporcional
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    const proportionalDay = Math.min(currentDay, lastDayOfLastMonth);
    const endOfLastMonthProportional = new Date(now.getFullYear(), now.getMonth() - 1, proportionalDay, 23, 59, 59);

    // Buscar tarefas concluídas deste mês (até hoje)
    let thisMonthQuery = supabase
      .from("tendenci_prospec_arq_agendamentos")
      .select("id", { count: "exact" })
      .eq("status", "concluida")
      .gte("updated_at", startOfThisMonth.toISOString())
      .lte("updated_at", now.toISOString());
    
    // Filtrar por vendedor se não for master
    if (!isMaster && user?.id) {
      thisMonthQuery = thisMonthQuery.eq("vendedor_id", user.id);
    } else if (filters?.vendedor && filters.vendedor !== "todos") {
      thisMonthQuery = thisMonthQuery.eq("vendedor_id", filters.vendedor);
    }

    const { data: thisMonthData } = await thisMonthQuery;

    // Buscar tarefas concluídas do mês passado (período proporcional)
    let lastMonthQuery = supabase
      .from("tendenci_prospec_arq_agendamentos")
      .select("id", { count: "exact" })
      .eq("status", "concluida")
      .gte("updated_at", startOfLastMonth.toISOString())
      .lte("updated_at", endOfLastMonthProportional.toISOString());
    
    if (!isMaster && user?.id) {
      lastMonthQuery = lastMonthQuery.eq("vendedor_id", user.id);
    } else if (filters?.vendedor && filters.vendedor !== "todos") {
      lastMonthQuery = lastMonthQuery.eq("vendedor_id", filters.vendedor);
    }

    const { data: lastMonthData } = await lastMonthQuery;

    // Buscar todas as tarefas concluídas para calcular o melhor mês
    let allQuery = supabase
      .from("tendenci_prospec_arq_agendamentos")
      .select("updated_at")
      .eq("status", "concluida");
    
    if (!isMaster && user?.id) {
      allQuery = allQuery.eq("vendedor_id", user.id);
    } else if (filters?.vendedor && filters.vendedor !== "todos") {
      allQuery = allQuery.eq("vendedor_id", filters.vendedor);
    }

    const { data: allCompletedTasks } = await allQuery;

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
  }, [filters?.vendedor, isMaster]);

  useEffect(() => {
    fetchTasks();
    fetchFailedTasks();
    fetchCompletedStats();

    // Realtime subscription
    const channel = supabase
      .channel("architect-tasks-panel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tendenci_prospec_arq_agendamentos",
        },
        () => {
          setTimeout(() => {
            fetchTasks();
            fetchFailedTasks();
            fetchCompletedStats();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTasks, fetchFailedTasks, fetchCompletedStats]);

  // Usar utilitário centralizado para status de vencimento
  const getDaysUntilDue = (dueDate: string) => {
    const info = getTaskDueStatus(dueDate);
    
    // Mapear para ícones Lucide
    let icon = Calendar;
    if (info.isOverdue) icon = AlertTriangle;
    else if (info.text === "Hoje") icon = Clock;
    
    return {
      text: info.text,
      variant: info.variant as "destructive" | "default" | "secondary" | "outline",
      icon,
    };
  };

  const handleMarkDone = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("tendenci_prospec_arq_agendamentos")
        .update({ status: "concluida" })
        .eq("id", taskId);

      if (error) throw error;
      toast.success("Tarefa concluída!");
      fetchTasks();
    } catch (error) {
      console.error("Error completing task:", error);
      toast.error("Erro ao concluir tarefa");
    }
  };

  const handleRetryTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("tendenci_prospec_arq_agendamentos")
        .update({ 
          status: "pendente", 
          retry_count: 0,
          updated_at: new Date().toISOString()
        })
        .eq("id", taskId);

      if (error) throw error;
      toast.success("Tarefa agendada para reprocessamento");
      fetchFailedTasks();
    } catch (error) {
      console.error("Error retrying task:", error);
      toast.error("Erro ao reagendar tarefa");
    }
  };

  const handleArchiveTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("tendenci_prospec_arq_agendamentos")
        .update({ 
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", taskId);

      if (error) throw error;
      toast.success("Tarefa arquivada");
      fetchFailedTasks();
    } catch (error) {
      console.error("Error archiving task:", error);
      toast.error("Erro ao arquivar tarefa");
    }
  };

  const handleOpenArchitect = (architectId: string) => {
    setSelectedArchitectId(architectId);
    setIsSheetOpen(true);
  };

  // Filter tasks - usando funções com timezone de Brasília
  const allTasks = tasks;
  const todayTasks = tasks.filter((t) => isTodayBrasil(t.data_agendamento));
  const futureTasks = tasks.filter((t) => isFutureDayBrasil(t.data_agendamento));

  // Parse observações JSON ou texto simples
  const parseObservacoes = (observacoes: string | null) => {
    if (!observacoes) return { titulo: "", nota: "" };
    
    try {
      const parsed = JSON.parse(observacoes);
      return {
        titulo: parsed.titulo || "",
        nota: parsed.nota || ""
      };
    } catch {
      // Fallback para texto simples
      const parts = observacoes.split('\n\n');
      return {
        titulo: parts.length > 1 ? parts[0] : "",
        nota: parts.length > 1 ? parts.slice(1).join('\n\n') : observacoes
      };
    }
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const dueInfo = getDaysUntilDue(task.data_agendamento);
    const DueIcon = dueInfo.icon;
    const isOverdue = dueInfo.text === "Atrasada";
    const { titulo, nota } = parseObservacoes(task.observacoes);

    return (
      <div
        onClick={() => task.architect && handleOpenArchitect(task.architect.id)}
        className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50 ${
          isOverdue ? "border-destructive/50 bg-destructive/5" : "border-border"
        }`}
      >
        <div className="flex items-start gap-3">
          <Checkbox
            checked={false}
            onClick={(e) => handleMarkDone(task.id, e)}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {task.tipo_tarefa === "automatizada" ? (
                <Bot className="h-3.5 w-3.5 text-primary" />
              ) : (
                <User className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="text-sm font-medium truncate">
                {task.architect?.name || "Parceiro Profissional não encontrado"}
              </span>
            </div>
            {task.architect?.company && (
              <p className="text-xs text-muted-foreground truncate mb-1">
                {task.architect.company}
              </p>
            )}
            {titulo && (
              <p className="text-xs font-medium text-foreground mb-0.5">
                {titulo}
              </p>
            )}
            {nota && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {nota}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={dueInfo.variant} className="text-xs gap-1">
                <DueIcon className="h-3 w-3" />
                {dueInfo.text}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatBrasilShort(task.data_agendamento)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const FailedTaskCard = ({ task }: { task: Task }) => {
    const { titulo, nota } = parseObservacoes(task.observacoes);

    return (
      <div
        onClick={() => task.architect && handleOpenArchitect(task.architect.id)}
        className="p-3 rounded-lg border border-destructive/50 bg-destructive/5 cursor-pointer transition-colors hover:bg-destructive/10"
      >
        <div className="flex items-start gap-3">
          <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {task.tipo_tarefa === "automatizada" ? (
                <Bot className="h-3.5 w-3.5 text-primary" />
              ) : (
                <User className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="text-sm font-medium truncate">
                {task.architect?.name || "Parceiro Profissional não encontrado"}
              </span>
            </div>
            {task.architect?.company && (
              <p className="text-xs text-muted-foreground truncate mb-1">
                {task.architect.company}
              </p>
            )}
            {titulo && (
              <p className="text-xs font-medium text-foreground mb-0.5">
                {titulo}
              </p>
            )}
            {nota && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {nota}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="h-3 w-3" />
                Falha
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatBrasilShort(task.data_agendamento)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={(e) => handleRetryTask(task.id, e)}
              >
                <RefreshCw className="h-3 w-3" />
                Retentar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1 text-muted-foreground"
                onClick={(e) => handleArchiveTask(task.id, e)}
              >
                <Archive className="h-3 w-3" />
                Arquivar
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Tarefas de Parceiros Profissionais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const variation = completedStats.lastMonth > 0 
    ? ((completedStats.thisMonth - completedStats.lastMonth) / completedStats.lastMonth) * 100 
    : completedStats.thisMonth > 0 ? 100 : 0;
  
  const isNewRecord = completedStats.thisMonth > 0 && completedStats.thisMonth >= completedStats.bestMonth.count;
  const currentDay = new Date().getDate();
  const proportionalDay = Math.min(currentDay, new Date(new Date().getFullYear(), new Date().getMonth(), 0).getDate());

  return (
    <div className="mb-6 space-y-4">
      <h3 className="text-lg font-semibold">Tarefas de Parceiros Profissionais</h3>
      
      {/* Métricas Comparativas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Este Mês */}
        <Card className="border-primary/20">
          <CardContent className="pt-4">
            {completedStats.loading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">
                  Concluídas Este Mês (até dia {currentDay})
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
                  Mês Anterior (até dia {proportionalDay})
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

      {/* Cards de Tarefas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* PROBLEMAS */}
        <Collapsible
          open={openCards.problemas}
          onOpenChange={(open) => setOpenCards((prev) => ({ ...prev, problemas: open }))}
        >
          <Card className={failedTasks.length > 0 ? "border-destructive/50" : ""}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors py-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {openCards.problemas ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    ⚠️ PROBLEMAS
                  </div>
                  <Badge variant={failedTasks.length > 0 ? "destructive" : "secondary"}>
                    {failedTasks.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-2 max-h-80 overflow-y-auto">
                {failedTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma tarefa com problema
                  </p>
                ) : (
                  failedTasks.map((task) => <FailedTaskCard key={task.id} task={task} />)
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* TODAS */}
        <Collapsible
          open={openCards.todas}
          onOpenChange={(open) => setOpenCards((prev) => ({ ...prev, todas: open }))}
        >
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors py-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {openCards.todas ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    📋 TODAS
                  </div>
                  <Badge variant="secondary">{allTasks.length}</Badge>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-2 max-h-80 overflow-y-auto">
                {allTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma tarefa pendente
                  </p>
                ) : (
                  allTasks.map((task) => <TaskCard key={task.id} task={task} />)
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* DIÁRIAS */}
        <Collapsible
          open={openCards.diarias}
          onOpenChange={(open) => setOpenCards((prev) => ({ ...prev, diarias: open }))}
        >
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors py-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {openCards.diarias ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    📅 DIÁRIAS
                  </div>
                  <Badge variant="secondary">{todayTasks.length}</Badge>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-2 max-h-80 overflow-y-auto">
                {todayTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
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
        <Collapsible
          open={openCards.futuras}
          onOpenChange={(open) => setOpenCards((prev) => ({ ...prev, futuras: open }))}
        >
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors py-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {openCards.futuras ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    🔮 FUTURAS
                  </div>
                  <Badge variant="secondary">{futureTasks.length}</Badge>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-2 max-h-80 overflow-y-auto">
                {futureTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
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

      {/* Architect Sheet */}
      {selectedArchitectId && (
        <ArchitectProspeccaoSheet
          architectId={selectedArchitectId}
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
        />
      )}
    </div>
  );
}
