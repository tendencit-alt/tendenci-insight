import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Clock, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DealDetailSheet } from "./DealDetailSheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";

interface CRMTasksPanelProps {
  pipelineId: string;
  categoryFilter?: string;
  ownerFilter?: string;
  searchQuery?: string;
  dateFilter?: string;
  customDateRange?: { from: Date | undefined; to: Date | undefined };
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

  useEffect(() => {
    fetchTasks();

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
          }, 500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimeout);
      supabase.removeChannel(channel);
    };
  }, [pipelineId, categoryFilter, ownerFilter, searchQuery, dateFilter, customDateRange]);

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

    // Filtrar por busca (título do deal ou nome do cliente)
    if (searchQuery && searchQuery.trim()) {
      dealsQuery = dealsQuery.or(`title.ilike.%${searchQuery}%,lead.client.name.ilike.%${searchQuery}%`);
    }

    // Filtrar por data de criação do deal
    if (dateFilter && dateFilter !== "all") {
      const now = new Date();
      let startDate: Date | undefined;
      
      switch(dateFilter) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "week":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "month":
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case "custom":
          if (customDateRange?.from) {
            dealsQuery = dealsQuery.gte("created_at", customDateRange.from.toISOString());
          }
          if (customDateRange?.to) {
            dealsQuery = dealsQuery.lte("created_at", customDateRange.to.toISOString());
          }
          break;
      }
      
      if (startDate && dateFilter !== "custom") {
        dealsQuery = dealsQuery.gte("created_at", startDate.toISOString());
      }
    }
    
    const { data: deals } = await dealsQuery;

    if (!deals || deals.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const dealIds = deals.map((d) => d.id);

    // Buscar todas as tarefas abertas
    const { data, error } = await supabase
      .from("crm_tasks")
      .select(`
        *,
        deal:crm_deals(
          title,
          categoria,
          lead:leads(
            client:clients(name)
          )
        )
      `)
      .in("deal_id", dealIds)
      .eq("status", "open")
      .order("due_at", { ascending: true });

    if (error) {
      console.error("Erro ao buscar tarefas:", error);
      setLoading(false);
      return;
    }

    setTasks(data || []);
    setLoading(false);
  };

  const getDaysUntilDue = (dueAt: string) => {
    const dueDate = new Date(dueAt);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: "Atrasada", variant: "destructive" as const, icon: "⚠️" };
    } else if (diffDays === 0) {
      return { text: "Hoje", variant: "default" as const, icon: "📅" };
    } else if (diffDays === 1) {
      return { text: "Amanhã", variant: "secondary" as const, icon: "📅" };
    } else {
      return { text: `${diffDays}d`, variant: "secondary" as const, icon: "📅" };
    }
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
        <h2 className="text-2xl font-bold">Tarefas</h2>
        
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