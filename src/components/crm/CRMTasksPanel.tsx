import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CRMTasksPanelProps {
  pipelineId: string;
}

export function CRMTasksPanel({ pipelineId }: CRMTasksPanelProps) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [pipelineId]);

  const fetchTasks = async () => {
    setLoading(true);

    // Buscar tarefas de deals do pipeline atual
    const { data: deals } = await supabase
      .from("crm_deals")
      .select("id")
      .eq("pipeline_id", pipelineId)
      .eq("status", "aberto");

    if (!deals || deals.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const dealIds = deals.map((d) => d.id);

    const { data, error } = await supabase
      .from("crm_tasks")
      .select(`
        *,
        deal:crm_deals(
          title,
          lead:leads(
            client:clients(name)
          )
        )
      `)
      .in("deal_id", dealIds)
      .eq("status", "open")
      .order("due_at", { ascending: true })
      .limit(10);

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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-xl">✅</span>
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <span className="text-lg sm:text-xl">✅</span>
          <span className="truncate">Tarefas Pendentes ({tasks.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma tarefa pendente
          </p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const dueInfo = getDaysUntilDue(task.due_at);
              const dueDate = new Date(task.due_at);
              const clientName = task.deal?.lead?.client?.name || "Sem cliente";

              return (
                <div
                  key={task.id}
                  className="p-3 border rounded-md bg-background space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{task.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {task.deal?.title} • {clientName}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 flex-shrink-0"
                      onClick={() => handleMarkDone(task.id)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={dueInfo.variant} className="text-xs flex-shrink-0">
                      {dueInfo.icon} {dueInfo.text}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate">
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
      </CardContent>
    </Card>
  );
}
