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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ArchitectTasksProps {
  architectId: string;
}

export function ArchitectTasks({ architectId }: ArchitectTasksProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [architectInfo, setArchitectInfo] = useState<any>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    note: "",
    due_at: "",
    tipo_tarefa: "interna" as "interna" | "automatizada",
    whatsapp_number: "",
  });

  useEffect(() => {
    if (!architectId) return;
    fetchTasks();
    fetchArchitectInfo();

    // Debounce para evitar múltiplos refetches
    let debounceTimer: NodeJS.Timeout;
    const debouncedFetch = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchTasks(), 500);
    };

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
          debouncedFetch();
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [architectId]);

  const fetchArchitectInfo = async () => {
    const { data, error } = await supabase
      .from("architects")
      .select("name, phone")
      .eq("id", architectId)
      .single();

    if (error) return;

    setArchitectInfo(data);
  };

  const fetchTasks = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      return;
    }

    // Query simplificada - buscar apenas tarefas do arquiteto criadas pelo usuário
    const { data, error } = await supabase
      .from("tendenci_prospec_arq_agendamentos")
      .select(`
        *,
        vendedor:profiles!tendenci_prospec_arq_agendamentos_vendedor_id_fkey(full_name, email)
      `)
      .eq("architect_id", architectId)
      .eq("vendedor_id", user.id)
      .order("data_agendamento", { ascending: true });

    if (error) {
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
    setIsSaving(true);
    
    try {
      // Validação detalhada do título
      if (!newTask.title || newTask.title.trim() === "") {
        toast({
          title: "Título obrigatório",
          description: "Por favor, preencha o título da tarefa.",
          variant: "destructive",
        });
        return;
      }

      // Validação detalhada da data/hora
      if (!newTask.due_at || newTask.due_at.trim() === "") {
        toast({
          title: "Data/Hora obrigatória",
          description: "Por favor, preencha a data e hora da tarefa.",
          variant: "destructive",
        });
        return;
      }

      // Validar se a data é válida
      const dueDate = new Date(newTask.due_at);
      if (isNaN(dueDate.getTime())) {
        toast({
          title: "Data inválida",
          description: "Por favor, selecione uma data válida.",
          variant: "destructive",
        });
        return;
      }

      // Validar se a data está no futuro
      const now = new Date();
      if (dueDate < now) {
        toast({
          title: "Data no passado",
          description: "Selecione uma data e hora futura.",
          variant: "destructive",
        });
        return;
      }

      // Validação para tarefas automatizadas
      if (newTask.tipo_tarefa === "automatizada") {
        if (!newTask.whatsapp_number || newTask.whatsapp_number.trim() === "") {
          toast({
            title: "WhatsApp obrigatório",
            description: "Preencha o número de WhatsApp para tarefas automatizadas.",
            variant: "destructive",
          });
          return;
        }
        
        if (!newTask.note || newTask.note.trim() === "") {
          toast({
            title: "Mensagem obrigatória",
            description: "Preencha a mensagem que será enviada via WhatsApp.",
            variant: "destructive",
          });
          return;
        }
      }

      // Obter ID do usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro de autenticação",
          description: "Usuário não autenticado.",
          variant: "destructive",
        });
        return;
      }

      // Converter datetime-local para ISO preservando timezone local
      const localDate = new Date(newTask.due_at);
      const offsetMs = localDate.getTimezoneOffset() * 60000;
      const localISOTime = new Date(localDate.getTime() - offsetMs).toISOString();

      // Estruturar observações como JSON
      const observacoesJSON = JSON.stringify({
        titulo: newTask.title,
        nota: newTask.note || null
      });

      const { error } = await supabase
        .from("tendenci_prospec_arq_agendamentos")
        .insert({
          architect_id: architectId,
          data_agendamento: localISOTime,
          observacoes: observacoesJSON,
          canal: "tarefa",
          status: "pendente",
          tipo_tarefa: newTask.tipo_tarefa,
          whatsapp_number: newTask.whatsapp_number || null,
          vendedor_id: user.id,
        });

      if (error) {
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
        setNewTask({ 
          title: "", 
          note: "", 
          due_at: "", 
          tipo_tarefa: "interna",
          whatsapp_number: "",
        });
        setIsAdding(false);
        fetchTasks();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "concluida" ? "pendente" : "concluida";

    const { error } = await supabase
      .from("tendenci_prospec_arq_agendamentos")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (error) {
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
              <Label htmlFor="task-tipo">Tipo de Tarefa *</Label>
              <Select
                value={newTask.tipo_tarefa}
                onValueChange={async (value: "interna" | "automatizada") => {
                  const updates: any = { tipo_tarefa: value };
                  
                  // Auto-preencher WhatsApp quando selecionar "automatizada"
                  if (value === "automatizada") {
                    if (architectInfo?.phone) {
                      updates.whatsapp_number = architectInfo.phone;
                    } else {
                      // Buscar novamente se não tiver
                      const { data } = await supabase
                        .from("architects")
                        .select("phone")
                        .eq("id", architectId)
                        .single();
                      
                      if (data?.phone) {
                        updates.whatsapp_number = data.phone;
                      } else {
                        toast({
                          title: "Atenção",
                          description: "Arquiteto não possui número de WhatsApp cadastrado.",
                          variant: "destructive",
                        });
                      }
                    }
                  }
                  
                  setNewTask({ ...newTask, ...updates });
                }}
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
              <Label htmlFor="task-title">Título da Tarefa *</Label>
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

            {newTask.tipo_tarefa === "automatizada" && (
              <div className="space-y-2">
                <Label htmlFor="task-whatsapp">
                  Número de WhatsApp * 
                  <span className="text-xs text-muted-foreground ml-2">
                    (Preenchido automaticamente do arquiteto)
                  </span>
                </Label>
                <Input
                  id="task-whatsapp"
                  value={newTask.whatsapp_number}
                  onChange={(e) =>
                    setNewTask({ ...newTask, whatsapp_number: e.target.value })
                  }
                  placeholder="Ex: 5511999999999"
                />
                {architectInfo?.name && (
                  <p className="text-xs text-muted-foreground mt-1">
                    📱 Arquiteto: {architectInfo.name}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="task-note">
                {newTask.tipo_tarefa === "automatizada" ? "Mensagem *" : "Observações"}
              </Label>
              <Textarea
                id="task-note"
                placeholder={
                  newTask.tipo_tarefa === "automatizada"
                    ? "Mensagem que será enviada automaticamente via WhatsApp..."
                    : "Detalhes adicionais..."
                }
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
                disabled={isSaving}
              >
                {isSaving ? "Salvando..." : "Salvar Tarefa"}
              </Button>
              <Button
                onClick={() => {
                  setIsAdding(false);
                  setNewTask({ 
                    title: "", 
                    note: "", 
                    due_at: "", 
                    tipo_tarefa: "interna",
                    whatsapp_number: "",
                  });
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
                          {(() => {
                            try {
                              const taskData = JSON.parse(task.observacoes || '{}');
                              return taskData.titulo || "Tarefa";
                            } catch {
                              return task.observacoes?.split('\n\n')[0] || "Tarefa";
                            }
                          })()}
                        </h4>
                        {(() => {
                          try {
                            const taskData = JSON.parse(task.observacoes || '{}');
                            return taskData.nota && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {taskData.nota}
                              </p>
                            );
                          } catch {
                            return task.observacoes?.includes('\n\n') && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {task.observacoes.split('\n\n')[1]}
                              </p>
                            );
                          }
                        })()}
                        <div className="flex items-center gap-2 flex-wrap mt-1">
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
                          {task.tipo_tarefa === "automatizada" && (
                            <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950 text-xs">
                              ⚡ Automatizada
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(task.data_agendamento), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        {task.tipo_tarefa === "automatizada" && task.whatsapp_number && (
                          <p className="text-xs text-muted-foreground mt-1">
                            📱 WhatsApp: {task.whatsapp_number}
                          </p>
                        )}
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
