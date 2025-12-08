import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Clock, AlertTriangle, Calendar, Bot, User } from "lucide-react";
import { format, isToday, isTomorrow, isPast, differenceInDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ArchitectProspeccaoSheet } from "./ArchitectProspeccaoSheet";

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

export function ArchitectTasksPanel({ filters }: ArchitectTasksPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArchitectId, setSelectedArchitectId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [openCards, setOpenCards] = useState({
    todas: false,
    diarias: false,
    futuras: false,
  });

  const fetchTasks = useCallback(async () => {
    try {
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

      // Apply vendor filter
      if (filters?.vendedor && filters.vendedor !== "todos") {
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
  }, [filters?.vendedor, filters?.search]);

  useEffect(() => {
    fetchTasks();

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
          setTimeout(fetchTasks, 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTasks]);

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = startOfDay(new Date());
    const dueDay = startOfDay(due);
    const daysUntil = differenceInDays(dueDay, today);

    if (isPast(dueDay) && !isToday(due)) {
      return {
        text: "Atrasada",
        variant: "destructive" as const,
        icon: AlertTriangle,
      };
    }
    if (isToday(due)) {
      return {
        text: "Hoje",
        variant: "default" as const,
        icon: Clock,
      };
    }
    if (isTomorrow(due)) {
      return {
        text: "Amanhã",
        variant: "secondary" as const,
        icon: Calendar,
      };
    }
    return {
      text: `${daysUntil}d`,
      variant: "outline" as const,
      icon: Calendar,
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

  const handleOpenArchitect = (architectId: string) => {
    setSelectedArchitectId(architectId);
    setIsSheetOpen(true);
  };

  // Filter tasks
  const today = startOfDay(new Date());
  const allTasks = tasks;
  const todayTasks = tasks.filter((t) => isToday(new Date(t.data_agendamento)));
  const futureTasks = tasks.filter((t) => {
    const taskDate = startOfDay(new Date(t.data_agendamento));
    return taskDate > today;
  });

  const TaskCard = ({ task }: { task: Task }) => {
    const dueInfo = getDaysUntilDue(task.data_agendamento);
    const DueIcon = dueInfo.icon;
    const isOverdue = dueInfo.text === "Atrasada";

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
                {task.architect?.name || "Arquiteto não encontrado"}
              </span>
            </div>
            {task.architect?.company && (
              <p className="text-xs text-muted-foreground truncate mb-1">
                {task.architect.company}
              </p>
            )}
            {task.observacoes && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {task.observacoes}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={dueInfo.variant} className="text-xs gap-1">
                <DueIcon className="h-3 w-3" />
                {dueInfo.text}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(task.data_agendamento), "dd/MM HH:mm", { locale: ptBR })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Tarefas de Arquitetos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-4">Tarefas de Arquitetos</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
