import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle, Clock, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ArchitectTasksProps {
  architectId: string;
}

export function ArchitectTasks({ architectId }: ArchitectTasksProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    note: "",
    due_at: "",
  });

  useEffect(() => {
    if (!architectId) return;
    fetchTasks();

    // Realtime subscription
    const channel = supabase
      .channel(`architect-tasks-${architectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tendenci_prospec_arq_agendamentos",
          filter: `architect_id=eq.${architectId}`,
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [architectId]);

  const fetchTasks = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("tendenci_prospec_arq_agendamentos")
      .select(`
        *,
        vendedor:profiles!tendenci_prospec_arq_agendamentos_vendedor_id_fkey(full_name, email)
      `)
      .eq("architect_id", architectId)
      .order("data_agendamento", { ascending: true });

    if (error) {
      console.error("Erro ao buscar tarefas:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar tarefas",
        variant: "destructive",
      });
    } else {
      setTasks(data || []);
    }

    setLoading(false);
  };

  const handleAddTask = async () => {
    if (!newTask.title || !newTask.due_at) {
      toast({
        title: "Atenção",
        description: "Preencha o título e a data da tarefa",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("tendenci_prospec_arq_agendamentos")
      .insert({
        architect_id: architectId,
        data_agendamento: newTask.due_at,
        observacoes: `${newTask.title}${newTask.note ? '\n\n' + newTask.note : ''}`,
        canal: "tarefa",
        status: "pendente",
      });

    if (error) {
      console.error("Erro ao criar tarefa:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar tarefa",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Tarefa criada com sucesso!",
      });
      setNewTask({ title: "", note: "", due_at: "" });
      setIsAdding(false);
      fetchTasks();
    }
  };

  const handleToggleStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "concluida" ? "pendente" : "concluida";

    const { error } = await supabase
      .from("tendenci_prospec_arq_agendamentos")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (error) {
      console.error("Erro ao atualizar status:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status da tarefa",
        variant: "destructive",
      });
    } else {
      fetchTasks();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from("tendenci_prospec_arq_agendamentos")
      .delete()
      .eq("id", taskId);

    if (error) {
      console.error("Erro ao deletar tarefa:", error);
      toast({
        title: "Erro",
        description: "Erro ao deletar tarefa",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Tarefa deletada com sucesso!",
      });
      fetchTasks();
    }
  };

  if (loading) {
    return <div className="text-center py-4">Carregando tarefas...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Botão para adicionar nova tarefa */}
      {!isAdding ? (
        <Button onClick={() => setIsAdding(true)} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Nova Tarefa
        </Button>
      ) : (
        <Card className="p-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Título da Tarefa</Label>
              <Input
                id="task-title"
                placeholder="Ex: Ligar para seguir projeto..."
                value={newTask.title}
                onChange={(e) =>
                  setNewTask({ ...newTask, title: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-due">Data/Hora</Label>
              <Input
                id="task-due"
                type="datetime-local"
                value={newTask.due_at}
                onChange={(e) =>
                  setNewTask({ ...newTask, due_at: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-note">Observações (opcional)</Label>
              <Textarea
                id="task-note"
                placeholder="Detalhes adicionais..."
                value={newTask.note}
                onChange={(e) =>
                  setNewTask({ ...newTask, note: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAddTask}
                className="flex-1"
              >
                Criar Tarefa
              </Button>
              <Button
                onClick={() => {
                  setIsAdding(false);
                  setNewTask({ title: "", note: "", due_at: "" });
                }}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Lista de tarefas */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma tarefa agendada</p>
          </Card>
        ) : (
          tasks.map((task) => {
            const isOverdue = new Date(task.data_agendamento) < new Date();
            const isCompleted = task.status === "concluida";

            return (
              <Card
                key={task.id}
                className={`p-4 ${
                  isCompleted
                    ? "opacity-60 bg-muted/50"
                    : isOverdue
                    ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                    : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleStatus(task.id, task.status)}
                    className="p-0 h-6 w-6"
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4
                          className={`font-medium text-sm ${
                            isCompleted ? "line-through text-muted-foreground" : ""
                          }`}
                        >
                          {task.observacoes?.split('\n\n')[0] || "Tarefa"}
                        </h4>
                        {task.observacoes?.includes('\n\n') && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {task.observacoes.split('\n\n')[1]}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={
                              isCompleted
                                ? "secondary"
                                : isOverdue
                                ? "destructive"
                                : "outline"
                            }
                            className="text-xs"
                          >
                            {isCompleted
                              ? "✓ Concluída"
                              : isOverdue
                              ? "⚠ Atrasada"
                              : "⏳ Pendente"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(task.data_agendamento), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        {task.vendedor && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Por: {task.vendedor.full_name || task.vendedor.email}
                          </p>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTask(task.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
