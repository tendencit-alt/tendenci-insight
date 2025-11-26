import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Clock, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DealDetailSheet } from "./DealDetailSheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";

interface CRMTasksPanelProps {
  pipelineId: string;
  categoryFilter?: string;
}

export function CRMTasksPanel({ pipelineId, categoryFilter }: CRMTasksPanelProps) {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<any | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // Minimizado por padrão
  
  const isMaster = profile?.role === 'admin';

  useEffect(() => {
    fetchTasks();

    // Realtime subscription
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
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pipelineId, categoryFilter]);

  const fetchTasks = async () => {
    setLoading(true);

    // Buscar tarefas de deals do pipeline atual com categoria
    let dealsQuery = supabase
      .from("crm_deals")
      .select("id, categoria")
      .eq("pipeline_id", pipelineId)
      .eq("status", "aberto");
    
    // Filtrar por categoria se especificado
    if (categoryFilter && categoryFilter !== "all") {
      dealsQuery = dealsQuery.eq("categoria", categoryFilter);
    }
    
    const { data: deals } = await dealsQuery;

    if (!deals || deals.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const dealIds = deals.map((d) => d.id);

    // Buscar todas as tarefas sem limite artificial
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

    // Ordenar: atrasadas primeiro, depois por data mais próxima
    const sortedData = (data || []).sort((a, b) => {
      const aDate = new Date(a.due_at);
      const bDate = new Date(b.due_at);
      const now = new Date();
      
      const aOverdue = aDate < now;
      const bOverdue = bDate < now;
      
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      return aDate.getTime() - bDate.getTime();
    });

    setTasks(sortedData);
    setLoading(false);
  };

  const getDaysUntilDue = (dueAt: string) => {
    const dueDate = new Date(dueAt);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

    if (diffDays < 0) {
      return { text: "Atrasada", variant: "destructive" as const, icon: "⚠️" };
    } else if (diffHours < 24) {
      return { text: `${diffHours}h`, variant: "default" as const, icon: "⏰" };
    } else if (diffDays === 0) {
      return { text: "Hoje", variant: "default" as const, icon: "📅" };
    } else if (diffDays === 1) {
      return { text: "Amanhã", variant: "secondary" as const, icon: "📅" };
    } else {
      return { text: `${diffDays}d`, variant: "secondary" as const, icon: "📅" };
    }
  };

  const handleMarkDone = async (taskId: string) => {
    const { error } = await supabase
      .from("crm_tasks")
      .update({ status: "done" })
      .eq("id", taskId);

    if (!error) {
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">✅</span>
            Tarefas Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="text-sm font-bold flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-base">✅</span>
                <span className="truncate text-sm">Tarefas Pendentes ({tasks.length})</span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
              </Button>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-3 pb-2">
        {tasks.length === 0 ? (
          <p className="text-center py-6 text-muted-foreground text-xs">
            Nenhuma tarefa pendente
          </p>
        ) : (
          <div className="space-y-2">
            {/* Tarefas Atrasadas */}
            {tasks.filter(task => {
              const dueDate = new Date(task.due_at);
              return dueDate < new Date();
            }).length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-destructive uppercase tracking-wide">
                  Atrasadas
                </h4>
                {tasks.filter(task => {
                  const dueDate = new Date(task.due_at);
                  return dueDate < new Date();
                }).map((task) => {
                  const dueInfo = getDaysUntilDue(task.due_at);
                  const dueDate = new Date(task.due_at);
                  const clientName = task.deal?.lead?.client?.name || "Sem cliente";

                  return (
                    <div
                      key={task.id}
                      className="p-2 border border-destructive/40 rounded-lg bg-destructive/5 hover:bg-destructive/10 transition-colors space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div 
                          className="flex-1 space-y-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handleOpenDeal(task.deal_id)}
                        >
                          <p className="font-semibold text-sm line-clamp-1">{task.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                            {task.deal?.title} • {clientName}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 flex-shrink-0 hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkDone(task.id);
                          }}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={dueInfo.variant} className="text-xs flex-shrink-0 font-semibold h-6 px-2">
                          {dueInfo.icon} {dueInfo.text}
                        </Badge>
                        {task.origem_modulo === "prospeccao" && (
                          <Badge variant="outline" className="text-xs flex-shrink-0 h-6 px-2">
                            📋 Prospecção
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground font-medium">
                          {dueDate.toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tarefas de Hoje */}
            {tasks.filter(task => {
              const dueDate = new Date(task.due_at);
              const now = new Date();
              const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              return diffDays === 0;
            }).length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-primary uppercase tracking-wide">
                  Hoje
                </h4>
                {tasks.filter(task => {
                  const dueDate = new Date(task.due_at);
                  const now = new Date();
                  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  return diffDays === 0;
                }).map((task) => {
                  const dueInfo = getDaysUntilDue(task.due_at);
                  const dueDate = new Date(task.due_at);
                  const clientName = task.deal?.lead?.client?.name || "Sem cliente";

                  return (
                    <div
                      key={task.id}
                      className="p-3 border border-primary/40 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div 
                          className="flex-1 space-y-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handleOpenDeal(task.deal_id)}
                        >
                          <p className="font-semibold text-sm line-clamp-1">{task.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                            {task.deal?.title} • {clientName}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 flex-shrink-0 hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkDone(task.id);
                          }}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={dueInfo.variant} className="text-xs flex-shrink-0 font-semibold h-6 px-2">
                          {dueInfo.icon} {dueInfo.text}
                        </Badge>
                        {task.origem_modulo === "prospeccao" && (
                          <Badge variant="outline" className="text-xs flex-shrink-0 h-6 px-2">
                            📋 Prospecção
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground font-medium">
                          {dueDate.toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
          </CardContent>
        </CollapsibleContent>
      </Card>

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
    </Collapsible>
  );
}
