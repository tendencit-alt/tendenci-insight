import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle, Clock, Calendar, Edit, Mic, Play, Pause } from "lucide-react";
import { AudioRecorder } from "@/components/prospeccao/AudioRecorder";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
import { describeError } from '@/lib/errorMessage';
  localInputToUTC, 
  utcToLocalInput, 
  isLocalInputInPast, 
  formatBrasil,
  formatBrasilShort,
  isISODateInPast
} from "@/utils/taskTimezone";

interface ArchitectTasksProps {
  architectId: string;
}

export function ArchitectTasks({ architectId }: ArchitectTasksProps) {
  const { toast } = useToast();
  const { isMaster } = usePermissions();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [architectInfo, setArchitectInfo] = useState<any>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [newTask, setNewTask] = useState({
    title: "",
    note: "",
    due_at: "",
    tipo_tarefa: "interna" as "interna" | "automatizada",
    whatsapp_number: "",
    audio_url: "",
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
  }, [architectId, isMaster]);

  const fetchArchitectInfo = async () => {
    const { data, error } = await supabase
      .from("architects")
      .select("name, phone, status_funil")
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

    // Query base - buscar tarefas do parceiro profissional
    let query = supabase
      .from("tendenci_prospec_arq_agendamentos")
      .select(`
        *,
        vendedor:profiles!tendenci_prospec_arq_agendamentos_vendedor_id_fkey(full_name, email)
      `)
      .eq("architect_id", architectId);

    // Vendedores só veem suas próprias tarefas; MASTER vê todas
    if (!isMaster) {
      query = query.eq("vendedor_id", user.id);
    }

    const { data, error } = await query.order("data_agendamento", { ascending: true });

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

  const handleStartEdit = (task: any) => {
    setEditingTaskId(task.id);
    // Usar utilitário centralizado para converter UTC -> datetime-local em Brasília
    const localDateTime = utcToLocalInput(task.data_agendamento);
    
    // Parser de observações JSON
    let taskTitle = "";
    let taskNote = "";
    try {
      const taskData = JSON.parse(task.observacoes || '{}');
      taskTitle = taskData.titulo || "";
      taskNote = taskData.nota || "";
    } catch {
      taskTitle = task.observacoes?.split('\n\n')[0] || "";
      taskNote = task.observacoes?.split('\n\n')[1] || "";
    }
    
    setNewTask({
      title: taskTitle,
      note: taskNote,
      due_at: localDateTime,
      tipo_tarefa: task.tipo_tarefa || "interna",
      whatsapp_number: task.whatsapp_number || "",
      audio_url: task.audio_url || "",
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
      audio_url: "",
    });
    setIsAdding(false);
  };

  const handleAddTask = async () => {
    setIsSaving(true);
    
    try {
      // VALIDAÇÃO CRÍTICA: Verificar se há atualização na timeline nas últimas 36h
      // Só aplica para CRIAÇÃO de novas tarefas em status 'contato_iniciado' ou 'parceiro_ativo'
      if (!editingTaskId) {
        const requiresTimelineValidation = 
          architectInfo?.status_funil === 'contato_iniciado' || 
          architectInfo?.status_funil === 'parceiro_ativo';
        
        if (requiresTimelineValidation) {
          const thirtySixHoursAgo = new Date();
          thirtySixHoursAgo.setHours(thirtySixHoursAgo.getHours() - 36);
          
          // Verificar timeline nas últimas 36h
          const { data: recentUpdates, error: timelineError } = await supabase
            .from("architect_timeline")
            .select("id, created_at")
            .eq("architect_id", architectId)
            .gte("created_at", thirtySixHoursAgo.toISOString())
            .limit(1);
          
          if (timelineError) {
            console.error("Erro ao verificar timeline:", timelineError);
          }
          
          // FALLBACK: Se não há timeline, verificar se há tarefa automatizada concluída recentemente
          // (pode ter falhado a inserção na timeline após execução da tarefa)
          let hasRecentActivity = recentUpdates && recentUpdates.length > 0;
          
          if (!hasRecentActivity) {
            const thirtyMinutesAgo = new Date();
            thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
            
            const { data: recentCompletedTasks } = await supabase
              .from("tendenci_prospec_arq_agendamentos")
              .select("id, updated_at, tipo_tarefa")
              .eq("architect_id", architectId)
              .eq("status", "concluida")
              .eq("tipo_tarefa", "automatizada")
              .gte("updated_at", thirtyMinutesAgo.toISOString())
              .limit(1);
            
            if (recentCompletedTasks && recentCompletedTasks.length > 0) {
              console.log("✅ Fallback: Tarefa automatizada concluída recentemente detectada");
              hasRecentActivity = true;
              
              // Tentar criar a entrada na timeline que estava faltando
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase.from("architect_timeline").insert({
                  architect_id: architectId,
                  author_id: user.id,
                  message: "📤 Tarefa automatizada executada (registro retroativo)",
                  update_type: "Comentário Interno"
                });
              }
            }
          }
          
          if (!hasRecentActivity) {
            toast({
              title: "⚠️ Atualização na Timeline Obrigatória",
              description: "Para parceiros profissionais em Contato Iniciado ou Parceiro Ativo, adicione uma atualização na Timeline (últimas 36h) antes de criar tarefas.",
              variant: "destructive",
            });
            return;
          }
        }
      }

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
      if (!newTask.due_at) {
        toast({
          title: "Data inválida",
          description: "Por favor, selecione uma data válida.",
          variant: "destructive",
        });
        return;
      }

      // Usar utilitário centralizado para validar data no passado
      if (isLocalInputInPast(newTask.due_at)) {
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
        
        // Validar formato do telefone
        const cleanPhone = newTask.whatsapp_number.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
          toast({
            title: "Telefone muito curto",
            description: "O número deve ter no mínimo 10 dígitos (DDD + número).",
            variant: "destructive",
          });
          return;
        }
        if (cleanPhone.length > 13) {
          toast({
            title: "Telefone muito longo",
            description: "O número deve ter no máximo 13 dígitos.",
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

        // VALIDAÇÃO CRÍTICA: Verificar se vendedor tem instância WhatsApp conectada
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({
            title: "Erro de autenticação",
            description: "Usuário não autenticado.",
            variant: "destructive",
          });
          return;
        }

        const { data: whatsappInstance, error: instanceError } = await supabase
          .from("tendenci_whatsapp_connections")
          .select("id, instance_name, status")
          .eq("user_id", user.id)
          .eq("status", "connected")
          .maybeSingle();

        if (instanceError || !whatsappInstance) {
          toast({
            title: "⚠️ Instância WhatsApp não conectada",
            description: "Você precisa conectar uma instância WhatsApp antes de criar tarefas automatizadas. Vá em Configurações > Conexões WhatsApp.",
            variant: "destructive",
          });
          return;
        }

        console.log("✅ Instância WhatsApp identificada:", whatsappInstance.instance_name);
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

      // Usar utilitário centralizado para conversão de timezone
      const localISOTime = localInputToUTC(newTask.due_at);

      // Estruturar observações como JSON
      const observacoesJSON = JSON.stringify({
        titulo: newTask.title,
        nota: newTask.note || null
      });

      if (editingTaskId) {
        // UPDATE: Editar tarefa existente
        const { error } = await supabase
          .from("tendenci_prospec_arq_agendamentos")
          .update({
            data_agendamento: localISOTime,
            observacoes: observacoesJSON,
            tipo_tarefa: newTask.tipo_tarefa,
            whatsapp_number: newTask.whatsapp_number || null,
            audio_url: newTask.audio_url || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingTaskId);

        if (error) {
          toast({
            title: "Erro",
            description: "Erro ao editar tarefa",
            variant: "destructive",
          });
        } else {
          toast({
            title: "✅ Tarefa atualizada",
            description: `"${newTask.title}" foi atualizada com sucesso.`,
          });
          setNewTask({ 
            title: "", 
            note: "", 
            due_at: "", 
            tipo_tarefa: "interna",
            whatsapp_number: "",
            audio_url: "",
          });
          setEditingTaskId(null);
          setIsAdding(false);
          fetchTasks();
        }
      } else {
        // INSERT: Criar nova tarefa
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
            audio_url: newTask.audio_url || null,
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
            audio_url: "",
          });
          setIsAdding(false);
          fetchTasks();
        }
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
            <h4 className="font-semibold text-sm">
              {editingTaskId ? "✏️ Editar Tarefa" : "➕ Nova Tarefa"}
            </h4>
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
                          description: "Parceiro Profissional não possui número de WhatsApp cadastrado.",
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
                    (Preenchido automaticamente do parceiro profissional)
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
                    📱 Parceiro Profissional: {architectInfo.name}
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

            {/* Botão Gravar Áudio */}
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAudioRecorder(true)}
                className="gap-2"
              >
                <Mic className="w-4 h-4" />
                Gravar Áudio
              </Button>
              {newTask.audio_url && (
                <p className="text-xs text-green-600">✓ Áudio anexado</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAddTask}
                className="flex-1"
                disabled={isSaving}
              >
                {isSaving ? "Salvando..." : editingTaskId ? "Atualizar Tarefa" : "Salvar Tarefa"}
              </Button>
              <Button
                onClick={handleCancelEdit}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Audio Recorder Modal */}
      <AudioRecorder
        isOpen={showAudioRecorder}
        onClose={() => setShowAudioRecorder(false)}
        onSave={async (audioBlob: Blob) => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const fileName = `task_audio_${Date.now()}.webm`;
            const filePath = `${architectId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from("architect-files")
              .upload(filePath, audioBlob);

            if (uploadError) throw uploadError;

            setNewTask({ ...newTask, audio_url: filePath });
            
            toast({
              title: "Áudio gravado",
              description: "O áudio foi anexado à tarefa.",
            });
          } catch (error: any) {
            toast({
              title: "Erro ao salvar áudio",
              description: error.message,
              variant: "destructive",
            });
          }
        }}
      />

      {/* Lista de tarefas */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma tarefa agendada</p>
          </Card>
        ) : (
          tasks.map((task) => {
            // Usar utilitário centralizado para verificação de atraso (comparação UTC vs UTC)
            const isOverdue = isISODateInPast(task.data_agendamento);
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
                            {" • "}{formatBrasilShort(task.data_agendamento)}
                          </span>
                        </div>
                        {task.tipo_tarefa === "automatizada" && task.whatsapp_number && (
                          <p className="text-xs text-muted-foreground mt-1">
                            📱 WhatsApp: {task.whatsapp_number}
                          </p>
                        )}
                        {task.audio_url && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const taskId = task.id;
                              if (playingAudio === taskId) {
                                const existingAudio = audioRefs.current.get(taskId);
                                if (existingAudio) {
                                  existingAudio.pause();
                                  existingAudio.currentTime = 0;
                                }
                                setPlayingAudio(null);
                              } else {
                                // Pausar qualquer outro áudio tocando
                                audioRefs.current.forEach((audio, id) => {
                                  if (id !== taskId) {
                                    audio.pause();
                                    audio.currentTime = 0;
                                  }
                                });

                                // Tocar novo áudio
                                const playAudio = async () => {
                                  try {
                                    const { data } = await supabase.storage
                                      .from("architect-files")
                                      .createSignedUrl(task.audio_url, 3600);
                                    
                                    if (data?.signedUrl) {
                                      let audio = audioRefs.current.get(taskId);
                                      if (!audio) {
                                        audio = new Audio();
                                        audioRefs.current.set(taskId, audio);
                                      }
                                      audio.src = data.signedUrl;
                                      audio.onended = () => setPlayingAudio(null);
                                      audio.play();
                                      setPlayingAudio(taskId);
                                    }
                                  } catch (error) {
                                    toast({
                                      title: "Erro",
                                      description: describeError('Não foi possível reproduzir o áudio', error),
                                      variant: "destructive",
                                    });
                                  }
                                };
                                playAudio();
                              }
                            }}
                            className="gap-2 mt-1 h-7"
                          >
                            {playingAudio === task.id ? (
                              <>
                                <Pause className="h-3 w-3" />
                                Pausar
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3" />
                                Ouvir Áudio
                              </>
                            )}
                          </Button>
                        )}
                        {task.vendedor && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Por: {task.vendedor.full_name || task.vendedor.email}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(task)}
                          className="h-8 w-8 p-0"
                          title="Editar tarefa"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTask(task.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          title="Deletar tarefa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
