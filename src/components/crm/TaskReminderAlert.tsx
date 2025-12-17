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
import { AlertTriangle, Calendar, X, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface DealWithoutTask {
  id: string;
  title: string;
  stage: { name: string };
  lead?: { client?: { name: string } };
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
  const [taskData, setTaskData] = useState({ title: "", due_at: "", observation: "" });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isMaster, setIsMaster] = useState(false);

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
      // Buscar etapas de Qualificação e Negociação
      const { data: stages } = await supabase
        .from("crm_stages")
        .select("id, name")
        .eq("pipeline_id", pipelineId)
        .or("name.ilike.%qualificação%,name.ilike.%negociação%,name.ilike.%qualificacao%,name.ilike.%negociacao%");

      if (!stages || stages.length === 0) return;

      const stageIds = stages.map(s => s.id);

      // Buscar deals nessas etapas que estão abertos
      // Se for vendedor (não master), filtrar apenas pelos seus deals
      let query = supabase
        .from("crm_deals")
        .select(`
          id,
          title,
          owner_id,
          stage_entered_at,
          stage:crm_stages(name),
          lead:leads(
            client:clients(name)
          ),
          owner:profiles(full_name)
        `)
        .eq("pipeline_id", pipelineId)
        .eq("status", "aberto")
        .in("stage_id", stageIds);

      // Vendedores só veem seus próprios deals
      if (!isMaster) {
        query = query.eq("owner_id", currentUserId);
      }

      const { data: deals, error: dealsError } = await query;

      if (dealsError) {
        console.error('Error fetching deals:', dealsError);
        return;
      }

      if (!deals || deals.length === 0) {
        setDealsWithoutTasks([]);
        setShowAlert(false);
        return;
      }

      // Para cada deal, verificar se tem tarefas VÁLIDAS (pendente E due_at >= NOW())
      const dealsWithoutValidTasksArray: DealWithoutTask[] = [];
      const now = new Date().toISOString();
      
      for (const deal of deals) {
        // Buscar tarefas válidas: status pendente E data futura
        const { count } = await supabase
          .from("crm_tasks")
          .select("id", { count: "exact", head: true })
          .eq("deal_id", deal.id)
          .in("status", ["open", "pendente"])
          .gte("due_at", now);

        if (count === 0) {
          // Calcular horas sem tarefa válida
          const stageEnteredAt = deal.stage_entered_at ? new Date(deal.stage_entered_at) : new Date();
          const hoursWithoutTask = Math.floor((Date.now() - stageEnteredAt.getTime()) / (1000 * 60 * 60));
          
          dealsWithoutValidTasksArray.push({
            ...deal as DealWithoutTask,
            hours_without_task: hoursWithoutTask
          });
        }
      }

      if (dealsWithoutValidTasksArray.length > 0) {
        // Ordenar por horas sem tarefa (mais urgente primeiro)
        dealsWithoutValidTasksArray.sort((a, b) => 
          (b.hours_without_task || 0) - (a.hours_without_task || 0)
        );
        
        setDealsWithoutTasks(dealsWithoutValidTasksArray);
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
        });

      if (taskError) throw taskError;

      toast({
        title: "Observação e tarefa criadas",
        description: "A observação e a tarefa foram adicionadas ao negócio",
      });

      setTaskData({ title: "", due_at: "", observation: "" });
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
                                setTaskData({ title: "", due_at: "", observation: "" });
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
