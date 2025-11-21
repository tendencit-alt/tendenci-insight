import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ProspeccaoTasksManager() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({
    deal_id: "",
    title: "",
    note: "",
    due_at: "",
    tipo_tarefa: "interna" as "interna" | "automatizada",
    whatsapp_number: "",
  });

  useEffect(() => {
    fetchData();

    // Realtime subscription
    const channel = supabase
      .channel("prospeccao-tasks")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crm_tasks",
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Buscar todos os deals ativos
    const { data: dealsData, error: dealsError } = await supabase
      .from("crm_deals")
      .select(`
        id,
        title,
        lead:leads(
          client:clients(name)
        )
      `)
      .eq("status", "aberto")
      .order("created_at", { ascending: false });

    if (dealsError) {
      console.error("Erro ao buscar deals:", dealsError);
    } else {
      setDeals(dealsData || []);
    }

    // Buscar todas as tarefas
    const { data: tasksData, error: tasksError } = await supabase
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
      .order("due_at", { ascending: true });

    if (tasksError) {
      console.error("Erro ao buscar tarefas:", tasksError);
    } else {
      setTasks(tasksData || []);
    }

    setLoading(false);
  };

  const handleAddTask = async () => {
    if (!newTask.deal_id || !newTask.title || !newTask.due_at) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o negócio, título e data/hora da tarefa.",
        variant: "destructive",
      });
      return;
    }

    // Validação para tarefas automatizadas
    if (newTask.tipo_tarefa === "automatizada") {
      if (!newTask.whatsapp_number || !newTask.note) {
        toast({
          title: "Campos obrigatórios para Tarefa Automatizada",
          description: "Preencha o Número de WhatsApp e a Mensagem (Observações) para tarefas automatizadas.",
          variant: "destructive",
        });
        return;
      }
    }

    const { error } = await supabase.from("crm_tasks").insert({
      deal_id: newTask.deal_id,
      title: newTask.title,
      note: newTask.note || null,
      due_at: newTask.due_at,
      status: "open",
      origem_modulo: "prospeccao",
      tipo_tarefa: newTask.tipo_tarefa,
      whatsapp_number: newTask.whatsapp_number || null,
    });

    if (error) {
      toast({
        title: "Erro ao criar tarefa",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Tarefa criada",
      description: "A tarefa foi adicionada e aparecerá no CRM Kanban.",
    });

    setNewTask({ 
      deal_id: "", 
      title: "", 
      note: "", 
      due_at: "",
      tipo_tarefa: "interna",
      whatsapp_number: "",
    });
    setIsAdding(false);
    fetchData();
  };

  const handleToggleStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "open" ? "done" : "open";

    const { error } = await supabase
      .from("crm_tasks")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", taskId);

    if (error) {
      toast({
        title: "Erro ao atualizar tarefa",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    fetchData();
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;

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

    fetchData();
  };

  const getDaysUntilDue = (dueAt: string) => {
    const dueDate = new Date(dueAt);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: "Atrasada", variant: "destructive" as const };
    } else if (diffDays === 0) {
      return { text: "Hoje", variant: "default" as const };
    } else if (diffDays === 1) {
      return { text: "Amanhã", variant: "secondary" as const };
    } else {
      return { text: `${diffDays}d`, variant: "secondary" as const };
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Carregando tarefas...</p>
        </CardContent>
      </Card>
    );
  }

  const openTasks = tasks.filter((t) => t.status === "open");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="space-y-6">
      {/* Header com botão de adicionar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tarefas</h2>
          <p className="text-muted-foreground">
            Gerencie tarefas vinculadas aos negócios do CRM
          </p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

      {/* Formulário de nova tarefa */}
      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Tarefa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-tipo">Tipo de Tarefa *</Label>
              <Select
                value={newTask.tipo_tarefa}
                onValueChange={(value: "interna" | "automatizada") =>
                  setNewTask({ ...newTask, tipo_tarefa: value })
                }
              >
                <SelectTrigger id="task-tipo">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interna">Tarefa Interna</SelectItem>
                  <SelectItem value="automatizada">Tarefa Automatizada</SelectItem>
                </SelectContent>
              </Select>
              {newTask.tipo_tarefa === "automatizada" && (
                <p className="text-xs text-muted-foreground mt-1">
                  ⚡ Esta tarefa será processada pelo n8n para disparo automático via WhatsApp
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="deal">Negócio *</Label>
              <Select
                value={newTask.deal_id}
                onValueChange={(value) =>
                  setNewTask({ ...newTask, deal_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um negócio" />
                </SelectTrigger>
                <SelectContent>
                  {deals.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id}>
                      {deal.lead?.client?.name || "Sem cliente"} - {deal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={newTask.title}
                onChange={(e) =>
                  setNewTask({ ...newTask, title: e.target.value })
                }
                placeholder="Ex: Ligar para confirmar proposta"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_at">Data/Hora *</Label>
              <Input
                id="due_at"
                type="datetime-local"
                value={newTask.due_at}
                onChange={(e) =>
                  setNewTask({ ...newTask, due_at: e.target.value })
                }
              />
            </div>

            {newTask.tipo_tarefa === "automatizada" && (
              <div className="space-y-2">
                <Label htmlFor="task-whatsapp">
                  Número de WhatsApp * 
                  <span className="text-xs text-muted-foreground ml-2">
                    (Ex: 5511999999999)
                  </span>
                </Label>
                <Input
                  id="task-whatsapp"
                  value={newTask.whatsapp_number}
                  onChange={(e) =>
                    setNewTask({ ...newTask, whatsapp_number: e.target.value })
                  }
                  placeholder="Digite o número com DDD"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="note">
                {newTask.tipo_tarefa === "automatizada" ? "Mensagem *" : "Observações"}
              </Label>
              <Textarea
                id="note"
                value={newTask.note}
                onChange={(e) =>
                  setNewTask({ ...newTask, note: e.target.value })
                }
                placeholder={
                  newTask.tipo_tarefa === "automatizada"
                    ? "Mensagem que será enviada automaticamente via WhatsApp..."
                    : "Detalhes adicionais da tarefa..."
                }
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddTask}>Criar Tarefa</Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tarefas abertas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tarefas Abertas
            <Badge variant="secondary">{openTasks.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {openTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Nenhuma tarefa aberta
            </p>
          ) : (
            <div className="space-y-3">
              {openTasks.map((task) => {
                const dueInfo = getDaysUntilDue(task.due_at);
                return (
                  <div
                    key={task.id}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{task.title}</h4>
                          <Badge variant={dueInfo.variant}>
                            {dueInfo.text}
                          </Badge>
                          {task.tipo_tarefa === "automatizada" && (
                            <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950">
                              ⚡ Automatizada
                            </Badge>
                          )}
                          {task.origem_modulo === "prospeccao" && (
                            <Badge variant="outline" className="text-xs">
                              Prospecção
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <strong>Negócio:</strong>{" "}
                          {task.deal?.lead?.client?.name || "Sem cliente"} -{" "}
                          {task.deal?.title}
                        </p>
                        {task.note && (
                          <p className="text-sm text-muted-foreground">
                            {task.note}
                          </p>
                        )}
                        {task.tipo_tarefa === "automatizada" && task.whatsapp_number && (
                          <p className="text-xs text-muted-foreground">
                            📱 WhatsApp: {task.whatsapp_number}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {new Date(task.due_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleStatus(task.id, task.status)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tarefas concluídas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Tarefas Concluídas
            <Badge variant="secondary">{doneTasks.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {doneTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Nenhuma tarefa concluída
            </p>
          ) : (
            <div className="space-y-3">
              {doneTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 border rounded-lg bg-muted/30 opacity-60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold line-through">
                          {task.title}
                        </h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <strong>Negócio:</strong>{" "}
                        {task.deal?.lead?.client?.name || "Sem cliente"} -{" "}
                        {task.deal?.title}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleStatus(task.id, task.status)}
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
