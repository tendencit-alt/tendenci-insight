import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle, Clock, Loader2, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DealTasksProps {
  dealId: string;
}

export function DealTasks({ dealId }: DealTasksProps) {
  const { toast } = useToast();
  const { isMaster } = usePermissions();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [dealInfo, setDealInfo] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [errors, setErrors] = useState({ title: "", due_at: "" });
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    note: "",
    due_at: "",
    tipo_tarefa: "interna" as "interna" | "automatizada",
    whatsapp_number: "",
  });

  useEffect(() => {
    fetchTasks();
    fetchDealInfo();

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

  const fetchDealInfo = async () => {
    const { data, error } = await supabase
      .from("crm_deals")
      .select(`
        *,
        lead:leads(
          client:clients(
            name,
            phone
          )
        ),
        architect:architects(
          name,
          phone
        )
      `)
      .eq("id", dealId)
      .single();

    if (error) return;

    setDealInfo(data);
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("crm_tasks")
      .select("*")
      .eq("deal_id", dealId)
      .order("due_at", { ascending: true });

    if (error) return;

    setTasks(data || []);
  };

  const checkRecentObservations = async () => {
    const { data: recentNotes } = await supabase
      .from('crm_timeline')
      .select('created_at')
      .eq('deal_id', dealId)
      .eq('update_type', 'Observação')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);
    
    return (recentNotes && recentNotes.length > 0);
  };

  const validateField = (field: string, value: string) => {
    if (field === 'title') {
      if (!value.trim()) {
        setErrors(prev => ({ ...prev, title: "Título é obrigatório" }));
      } else {
        setErrors(prev => ({ ...prev, title: "" }));
      }
    }
    if (field === 'due_at') {
      if (!value) {
        setErrors(prev => ({ ...prev, due_at: "Data e hora são obrigatórias" }));
      } else {
        setErrors(prev => ({ ...prev, due_at: "" }));
      }
    }
  };

  const handleStartEdit = (task: any) => {
    setEditingTaskId(task.id);
    // Converter ISO para datetime-local format
    const dueDate = new Date(task.due_at);
    const localISOTime = new Date(dueDate.getTime() - (dueDate.getTimezoneOffset() * 60000))
      .toISOString()
      .slice(0, 16);
    
    setNewTask({
      title: task.title,
      note: task.note || "",
      due_at: localISOTime,
      tipo_tarefa: task.tipo_tarefa || "interna",
      whatsapp_number: task.whatsapp_number || "",
    });
    setIsAdding(true);
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setNewTask({ 
      title: "", 
      note: "", 
      due_at: "", 
      tipo_tarefa: "interna",
      whatsapp_number: "",
    });
    setErrors({ title: "", due_at: "" });
    setIsAdding(false);
  };

  const handleSaveTask = async () => {
    if (!newTask.title || !newTask.due_at) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e a data/hora da tarefa.",
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

    // VALIDAÇÃO: Verificar observação nas últimas 24h (apenas para novas tarefas)
    if (!editingTaskId) {
      const hasRecentObservation = await checkRecentObservations();
      if (!hasRecentObservation) {
        toast({
          title: "Atualização obrigatória",
          description: "Você precisa adicionar uma observação nas últimas 24 horas antes de criar uma tarefa. Vá até a aba 'Observações' e registre uma atualização do status do negócio.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);

    // Obter ID do usuário autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Usuário não autenticado.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Corrigir timezone local
    const localDate = new Date(newTask.due_at);
    const offsetMs = localDate.getTimezoneOffset() * 60000;
    const localISOTime = new Date(localDate.getTime() - offsetMs).toISOString().slice(0, -1);

    if (editingTaskId) {
      // UPDATE: Editar tarefa existente
      const { error } = await supabase
        .from("crm_tasks")
        .update({
          title: newTask.title,
          note: newTask.note || null,
          due_at: localISOTime,
          tipo_tarefa: newTask.tipo_tarefa,
          whatsapp_number: newTask.whatsapp_number || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingTaskId);
        // RLS policy já garante que vendedores só editam próprias tarefas e admins editam todas

      setIsSubmitting(false);

      if (error) {
        toast({
          title: "Erro ao editar tarefa",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "✅ Tarefa atualizada com sucesso",
        description: `"${newTask.title}" foi atualizada.`,
      });
      
      // Forçar refetch imediato para sincronizar dados
      await fetchTasks();
      
      // Limpar formulário e estado de edição
      setNewTask({
        title: "",
        due_at: "",
        note: "",
        tipo_tarefa: "interna",
        whatsapp_number: "",
      });
      setEditingTaskId(null);
      setIsAdding(false);
      return;
    } else {
      // INSERT: Criar nova tarefa
      const { error } = await supabase.from("crm_tasks").insert({
        deal_id: dealId,
        title: newTask.title,
        note: newTask.note || null,
        due_at: localISOTime,
        status: "open",
        origem_modulo: "crm",
        tipo_tarefa: newTask.tipo_tarefa,
        whatsapp_number: newTask.whatsapp_number || null,
        created_by: user.id,
      });

      setIsSubmitting(false);

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
        description: "A tarefa foi adicionada com sucesso.",
      });
    }

    setEditingTaskId(null);
    setNewTask({ 
      title: "", 
      note: "", 
      due_at: "", 
      tipo_tarefa: "interna",
      whatsapp_number: "",
    });
    setErrors({ title: "", due_at: "" });
    setIsAdding(false);
    fetchTasks();
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
    fetchTasks();
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;

    if (!isMaster) {
      toast({
        title: "Permissão negada",
        description: "Apenas usuários MASTER podem excluir tarefas. Entre em contato com o administrador se necessário.",
        variant: "destructive",
      });
      setTaskToDelete(null);
      return;
    }

    const { error } = await supabase
      .from("crm_tasks")
      .delete()
      .eq("id", taskToDelete);

    if (error) {
      toast({
        title: "Erro ao excluir tarefa",
        description: error.message,
        variant: "destructive",
      });
      setTaskToDelete(null);
      return;
    }

    toast({
      title: "Tarefa excluída",
      description: "A tarefa foi removida com sucesso.",
    });

    setTaskToDelete(null);
    fetchTasks();
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
        <div className="space-y-1">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-xl">✅</span>
            Tarefas ({tasks.length})
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Gerencie tarefas e follow-ups desta oportunidade
          </p>
        </div>
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
        {/* Formulário de nova/editar tarefa */}
        {isAdding && (
          <div className="p-4 border rounded-md bg-muted/30 space-y-3">
            <h4 className="font-semibold text-sm">
              {editingTaskId ? "✏️ Editar Tarefa" : "➕ Nova Tarefa"}
            </h4>
            <div>
              <Label htmlFor="task-tipo">Tipo de Tarefa *</Label>
              <Select
                value={newTask.tipo_tarefa}
                onValueChange={(value: "interna" | "automatizada") => {
                  const updates: any = { tipo_tarefa: value };
                  
                  // Auto-preencher WhatsApp quando selecionar "automatizada"
                  if (value === "automatizada" && dealInfo) {
                    const clientPhone = dealInfo.lead?.client?.phone;
                    const architectPhone = dealInfo.architect?.phone;
                    updates.whatsapp_number = clientPhone || architectPhone || "";
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

            <div>
              <Label htmlFor="task-title">Título da Tarefa *</Label>
              <Input
                id="task-title"
                value={newTask.title}
                onChange={(e) => {
                  setNewTask({ ...newTask, title: e.target.value });
                  validateField('title', e.target.value);
                }}
                placeholder="Ex: Enviar proposta por email"
                className={errors.title ? "border-destructive" : ""}
              />
              {errors.title && (
                <p className="text-xs text-destructive mt-1">{errors.title}</p>
              )}
            </div>

            <div>
              <Label htmlFor="task-due">Data e Hora *</Label>
              <Input
                id="task-due"
                type="datetime-local"
                value={newTask.due_at}
                onChange={(e) => {
                  setNewTask({ ...newTask, due_at: e.target.value });
                  validateField('due_at', e.target.value);
                }}
                className={errors.due_at ? "border-destructive" : ""}
              />
              {errors.due_at && (
                <p className="text-xs text-destructive mt-1">{errors.due_at}</p>
              )}
            </div>

            {newTask.tipo_tarefa === "automatizada" && (
              <div>
                <Label htmlFor="task-whatsapp">
                  Número de WhatsApp * 
                  <span className="text-xs text-muted-foreground ml-2">
                    (Preenchido automaticamente do cliente)
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
                {dealInfo?.lead?.client?.name && (
                  <p className="text-xs text-muted-foreground mt-1">
                    📱 Cliente: {dealInfo.lead.client.name}
                  </p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="task-note">
                {newTask.tipo_tarefa === "automatizada" ? "Mensagem *" : "Observações"}
              </Label>
              <Textarea
                id="task-note"
                value={newTask.note}
                onChange={(e) =>
                  setNewTask({ ...newTask, note: e.target.value })
                }
                placeholder={
                  newTask.tipo_tarefa === "automatizada"
                    ? "Mensagem que será enviada automaticamente via WhatsApp..."
                    : "Detalhes adicionais sobre a tarefa..."
                }
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveTask} size="sm" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingTaskId ? "Atualizando..." : "Salvando..."}
                  </>
                ) : (
                  editingTaskId ? "Atualizar Tarefa" : "Salvar Tarefa"
                )}
              </Button>
              <Button
                onClick={handleCancelEdit}
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
                        <div className="flex gap-1">
                          {/* Todos vendedores autenticados podem editar */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleStartEdit(task)}
                            title="Editar tarefa"
                          >
                            <Edit className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </Button>
                          {/* Botão de excluir - apenas MASTER */}
                          {isMaster && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => setTaskToDelete(task.id)}
                              title="Excluir tarefa (somente MASTER)"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={dueInfo.variant}>
                          {dueInfo.icon} {dueInfo.text}
                        </Badge>
                        {task.tipo_tarefa === "automatizada" && (
                          <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950">
                            ⚡ Automatizada
                          </Badge>
                        )}
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

                      {task.tipo_tarefa === "automatizada" && task.whatsapp_number && (
                        <p className="text-xs text-muted-foreground mt-1">
                          📱 WhatsApp: {task.whatsapp_number}
                        </p>
                      )}

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

      {/* AlertDialog para confirmar exclusão */}
      <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A tarefa será permanentemente removida do negócio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTask}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
