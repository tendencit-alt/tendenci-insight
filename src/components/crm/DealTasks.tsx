import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DealTasksProps {
  dealId: string;
}

export function DealTasks({ dealId }: DealTasksProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    note: "",
    due_at: "",
  });

  useEffect(() => {
    fetchTasks();

    // Realtime subscription
    const channel = supabase
      .channel("deal-tasks-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crm_tasks",
          filter: `deal_id=eq.${dealId}`,
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dealId]);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("crm_tasks")
      .select("*")
      .eq("deal_id", dealId)
      .order("due_at", { ascending: true });

    if (error) {
      console.error("Erro ao buscar tarefas:", error);
      return;
    }

    setTasks(data || []);
  };

  const handleAddTask = async () => {
    if (!newTask.title || !newTask.due_at) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e a data/hora da tarefa.",
        variant: "destructive",
      });
      return;
    }

    console.log("Criando tarefa:", { dealId, newTask });

    const { data, error } = await supabase.from("crm_tasks").insert({
      deal_id: dealId,
      title: newTask.title,
      note: newTask.note || null,
      due_at: newTask.due_at,
      status: "open",
    }).select();

    if (error) {
      console.error("Erro ao criar tarefa:", error);
      toast({
        title: "Erro ao criar tarefa",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    console.log("Tarefa criada com sucesso:", data);

    toast({
      title: "Tarefa criada",
      description: "A tarefa foi adicionada com sucesso.",
    });

    setNewTask({ title: "", note: "", due_at: "" });
    setIsAdding(false);
    fetchTasks();
  };

  const handleToggleStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "open" ? "done" : "open";

    console.log("Alterando status da tarefa:", taskId, "de", currentStatus, "para", newStatus);

    const { error } = await supabase
      .from("crm_tasks")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", taskId);

    if (error) {
      console.error("Erro ao atualizar tarefa:", error);
      toast({
        title: "Erro ao atualizar tarefa",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    console.log("Status da tarefa atualizado com sucesso!");
    fetchTasks();
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from("crm_tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      toast({
        title: "Erro ao excluir tarefa",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Tarefa excluída",
      description: "A tarefa foi removida com sucesso.",
    });
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
      return { text: `${diffHours}h restantes`, variant: "default" as const, icon: "⏰" };
    } else if (diffDays === 0) {
      return { text: "Hoje", variant: "default" as const, icon: "📅" };
    } else if (diffDays === 1) {
      return { text: "Amanhã", variant: "secondary" as const, icon: "📅" };
    } else {
      return { text: `${diffDays} dias`, variant: "secondary" as const, icon: "📅" };
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-xl">✅</span>
          Tarefas ({tasks.length})
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsAdding(!isAdding)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Nova Tarefa
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulário de nova tarefa */}
        {isAdding && (
          <div className="p-4 border rounded-md bg-muted/30 space-y-3">
            <div>
              <Label htmlFor="task-title">Título da Tarefa *</Label>
              <Input
                id="task-title"
                value={newTask.title}
                onChange={(e) =>
                  setNewTask({ ...newTask, title: e.target.value })
                }
                placeholder="Ex: Enviar proposta por email"
              />
            </div>

            <div>
              <Label htmlFor="task-due">Data e Hora *</Label>
              <Input
                id="task-due"
                type="datetime-local"
                value={newTask.due_at}
                onChange={(e) =>
                  setNewTask({ ...newTask, due_at: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="task-note">Observações</Label>
              <Textarea
                id="task-note"
                value={newTask.note}
                onChange={(e) =>
                  setNewTask({ ...newTask, note: e.target.value })
                }
                placeholder="Detalhes adicionais sobre a tarefa..."
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddTask} size="sm">
                Salvar Tarefa
              </Button>
              <Button
                onClick={() => setIsAdding(false)}
                size="sm"
                variant="ghost"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Lista de tarefas */}
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Nenhuma tarefa cadastrada.</p>
            <p className="text-xs mt-2">
              Crie tarefas para organizar follow-ups e ações
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const dueInfo = getDaysUntilDue(task.due_at);
              const dueDate = new Date(task.due_at);

              return (
                <div
                  key={task.id}
                  className={`p-4 border rounded-md ${
                    task.status === "done"
                      ? "bg-muted/20 opacity-70"
                      : "bg-background"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-1 h-6 w-6 p-0"
                      onClick={() => handleToggleStatus(task.id, task.status)}
                    >
                      {task.status === "done" ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      )}
                    </Button>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`font-medium ${
                            task.status === "done" ? "line-through" : ""
                          }`}
                        >
                          {task.title}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={dueInfo.variant}>
                          {dueInfo.icon} {dueInfo.text}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {dueDate.toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                        {task.status === "done" && (
                          <Badge variant="outline" className="text-green-600">
                            ✓ Concluída
                          </Badge>
                        )}
                      </div>

                      {task.note && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {task.note}
                        </p>
                      )}
                    </div>
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
