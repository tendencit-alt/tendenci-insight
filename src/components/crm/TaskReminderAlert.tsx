import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, X, Clock, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DealWithoutTask {
  id: string;
  title: string;
  stage: { name: string };
  lead?: { client?: { name: string; phone?: string } };
  owner?: { full_name: string };
  owner_id?: string;
  hours_without_task?: number;
}

interface TaskReminderAlertProps {
  pipelineId: string;
}

export function TaskReminderAlert({ pipelineId }: TaskReminderAlertProps) {
  const { toast } = useToast();
  const [showAlert, setShowAlert] = useState(false);
  const [dealsWithoutTasks, setDealsWithoutTasks] = useState<DealWithoutTask[]>([]);
  const [addingTaskFor, setAddingTaskFor] = useState<string | null>(null);
  const [taskData, setTaskData] = useState({ 
    title: "", 
    due_at: "", 
    observation: "",
    tipo_tarefa: "interna" as "interna" | "automatizada",
    whatsapp_number: "",
    note: ""
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isMaster, setIsMaster] = useState(false);
  const [hasWhatsAppConnection, setHasWhatsAppConnection] = useState(false);

  useEffect(() => {
    if (!pipelineId) return;

    // Get current user info
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        
        // Check if user is master/admin
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        setIsMaster(profile?.role === "admin");

        // Check if user has WhatsApp connection
        const { data: connection } = await supabase
          .from("tendenci_whatsapp_connections")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "connected")
          .maybeSingle();
        
        setHasWhatsAppConnection(!!connection);
      }
    };
    
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (!pipelineId || !currentUserId) return;

    // Verificação inicial
    checkDealsWithoutTasks();

    // Verificar a cada 30 minutos (1800000ms) - muito mais frequente que antes
    const interval = setInterval(() => {
      checkDealsWithoutTasks();
    }, 1800000);

    return () => clearInterval(interval);
  }, [pipelineId, currentUserId, isMaster]);

  const checkDealsWithoutTasks = async () => {
    if (!currentUserId) return;
    
    try {
      // Usar RPC do servidor que usa NOW() para garantir consistência
      // Isso resolve o problema de timezone e relógio do cliente
      const { data: deals, error } = await supabase.rpc('get_deals_without_valid_tasks', {
        p_pipeline_id: pipelineId,
        p_user_id: currentUserId,
        p_is_master: isMaster
      });

      if (error) {
        console.error('Error fetching deals without tasks:', error);
        return;
      }

      if (deals && deals.length > 0) {
        // Mapear para o formato esperado pelo componente
        const formattedDeals: DealWithoutTask[] = deals.map((deal: any) => ({
          id: deal.id,
          title: deal.title,
          stage: { name: deal.stage_name },
          lead: { client: { name: deal.client_name, phone: deal.client_phone } },
          owner: { full_name: deal.owner_name },
          owner_id: deal.owner_id,
          hours_without_task: deal.hours_without_task
        }));
        
        setDealsWithoutTasks(formattedDeals);
        setShowAlert(true);
      } else {
        setDealsWithoutTasks([]);
        setShowAlert(false);
      }
    } catch (error) {
      console.error('TaskReminderAlert checkDealsWithoutTasks error:', error);
    }
  };

  const handleAddTask = async (dealId: string) => {
    if (!taskData.title || !taskData.due_at || !taskData.observation) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha a observação, título e data da tarefa",
        variant: "destructive",
      });
      return;
    }

    // Validação adicional para tarefa automatizada
    if (taskData.tipo_tarefa === "automatizada") {
      if (!taskData.whatsapp_number) {
        toast({
          title: "Número de WhatsApp obrigatório",
          description: "Informe o número de WhatsApp para tarefa automatizada",
          variant: "destructive",
        });
        return;
      }
      if (!taskData.note) {
        toast({
          title: "Mensagem obrigatória",
          description: "Informe a mensagem para tarefa automatizada",
          variant: "destructive",
        });
        return;
      }
      if (!hasWhatsAppConnection) {
        toast({
          title: "WhatsApp não conectado",
          description: "Você precisa ter uma instância WhatsApp conectada para criar tarefas automatizadas",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      // Primeiro, salvar a observação no timeline
      const { data: userData } = await supabase.auth.getUser();
      
      const { error: timelineError } = await supabase
        .from("crm_timeline")
        .insert({
          deal_id: dealId,
          message: taskData.observation,
          update_type: "Observação",
          author_id: userData.user?.id,
        });

      if (timelineError) throw timelineError;

      // Depois, criar a tarefa - usando horário de Brasília (UTC-3)
      const dueAtWithTimezone = taskData.due_at + ":00-03:00";
      const dueAtISO = new Date(dueAtWithTimezone).toISOString();

      const { error: taskError } = await supabase
        .from("crm_tasks")
        .insert({
          deal_id: dealId,
          title: taskData.title,
          due_at: dueAtISO,
          status: "open",
          created_by: userData.user?.id || null,
          tipo_tarefa: taskData.tipo_tarefa,
          whatsapp_number: taskData.tipo_tarefa === "automatizada" ? taskData.whatsapp_number : null,
          note: taskData.tipo_tarefa === "automatizada" ? taskData.note : null,
        });

      if (taskError) throw taskError;

      toast({
        title: "Observação e tarefa criadas",
        description: taskData.tipo_tarefa === "automatizada" 
          ? "A tarefa automatizada será executada na data agendada"
          : "A observação e a tarefa foram adicionadas ao negócio",
      });

      setTaskData({ title: "", due_at: "", observation: "", tipo_tarefa: "interna", whatsapp_number: "", note: "" });
      setAddingTaskFor(null);
      
      // Recarregar lista
      checkDealsWithoutTasks();
    } catch (error: any) {
      toast({
        title: "Erro ao criar tarefa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDismiss = () => {
    setShowAlert(false);
    // Mostrar novamente após 2 horas se ainda houver deals sem tarefas
    setTimeout(() => {
      if (dealsWithoutTasks.length > 0) {
        setShowAlert(true);
      }
    }, 7200000); // 2 horas
  };

  const formatHoursWithoutTask = (hours: number | undefined) => {
    if (!hours) return "";
    if (hours < 24) return `${hours}h sem tarefa válida`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h sem tarefa válida`;
  };

  const getClientPhone = (deal: DealWithoutTask) => {
    return deal.lead?.client?.phone || "";
  };

  if (dealsWithoutTasks.length === 0) return null;

  return (
    <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
      <AlertDialogContent className="max-w-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
            Oportunidades sem Tarefas Válidas
            <Badge variant="destructive" className="ml-2">
              {dealsWithoutTasks.length}
            </Badge>
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            As seguintes oportunidades nas etapas de <strong>Qualificação</strong> e <strong>Negociação</strong> 
            não possuem tarefas válidas (pendentes com data futura). Adicione pelo menos uma tarefa para cada.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          <div className="space-y-3">
            {dealsWithoutTasks.map((deal) => (
              <Card key={deal.id} className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold">{deal.title}</h4>
                        <Badge variant="outline">{deal.stage?.name}</Badge>
                        {deal.hours_without_task !== undefined && deal.hours_without_task > 36 && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatHoursWithoutTask(deal.hours_without_task)}
                          </Badge>
                        )}
                        {deal.hours_without_task !== undefined && deal.hours_without_task <= 36 && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatHoursWithoutTask(deal.hours_without_task)}
                          </Badge>
                        )}
                      </div>
                      {deal.lead?.client?.name && (
                        <p className="text-sm text-muted-foreground">
                          Cliente: {deal.lead.client.name}
                        </p>
                      )}
                      {deal.owner?.full_name && (
                        <p className="text-sm text-muted-foreground">
                          Responsável: {deal.owner.full_name}
                        </p>
                      )}

                      {addingTaskFor === deal.id ? (
                        <div className="space-y-3 pt-3 border-t">
                          <div className="space-y-2">
                            <Label htmlFor={`task-observation-${deal.id}`}>
                              Observação (obrigatória) *
                            </Label>
                            <Textarea
                              id={`task-observation-${deal.id}`}
                              placeholder="Descreva o status atual da oportunidade..."
                              value={taskData.observation}
                              onChange={(e) => setTaskData({ ...taskData, observation: e.target.value })}
                              className="min-h-[80px]"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Tipo de Tarefa *</Label>
                            <Select
                              value={taskData.tipo_tarefa}
                              onValueChange={(value: "interna" | "automatizada") => {
                                setTaskData({ 
                                  ...taskData, 
                                  tipo_tarefa: value,
                                  whatsapp_number: value === "automatizada" ? getClientPhone(deal) : "",
                                  note: ""
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="interna">Tarefa Interna</SelectItem>
                                <SelectItem value="automatizada">
                                  <span className="flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    Tarefa Automatizada (WhatsApp)
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`task-title-${deal.id}`}>Título da Tarefa *</Label>
                            <Input
                              id={`task-title-${deal.id}`}
                              placeholder="Ex: Ligar para cliente"
                              value={taskData.title}
                              onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`task-date-${deal.id}`}>Data de Vencimento *</Label>
                            <Input
                              id={`task-date-${deal.id}`}
                              type="datetime-local"
                              value={taskData.due_at}
                              onChange={(e) => setTaskData({ ...taskData, due_at: e.target.value })}
                            />
                          </div>

                          {taskData.tipo_tarefa === "automatizada" && (
                            <>
                              <div className="space-y-2">
                                <Label htmlFor={`task-whatsapp-${deal.id}`}>Número de WhatsApp *</Label>
                                <Input
                                  id={`task-whatsapp-${deal.id}`}
                                  placeholder="Ex: 5511999999999"
                                  value={taskData.whatsapp_number}
                                  onChange={(e) => setTaskData({ ...taskData, whatsapp_number: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Formato: código do país + DDD + número (ex: 5511999999999)
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`task-message-${deal.id}`}>Mensagem (WhatsApp) *</Label>
                                <Textarea
                                  id={`task-message-${deal.id}`}
                                  placeholder="Mensagem que será enviada automaticamente..."
                                  value={taskData.note}
                                  onChange={(e) => setTaskData({ ...taskData, note: e.target.value })}
                                  className="min-h-[80px]"
                                />
                              </div>

                              {!hasWhatsAppConnection && (
                                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                                  <p className="text-sm text-destructive">
                                    ⚠️ Você não tem uma instância WhatsApp conectada. 
                                    Conecte primeiro em Configurações para criar tarefas automatizadas.
                                  </p>
                                </div>
                              )}
                            </>
                          )}

                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleAddTask(deal.id)}
                            >
                              Salvar Observação + Tarefa
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setAddingTaskFor(null);
                                setTaskData({ title: "", due_at: "", observation: "", tipo_tarefa: "interna", whatsapp_number: "", note: "" });
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          className="mt-2"
                          onClick={() => setAddingTaskFor(deal.id)}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Adicionar Tarefa
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleDismiss}>
            <X className="h-4 w-4 mr-2" />
            Lembrar depois (2h)
          </Button>
          <Button onClick={() => setShowAlert(false)}>
            Fechar
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
