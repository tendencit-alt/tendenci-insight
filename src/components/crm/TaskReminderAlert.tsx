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
import { AlertTriangle, Calendar, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface DealWithoutTask {
  id: string;
  title: string;
  stage: { name: string };
  lead?: { client?: { name: string } };
  owner?: { full_name: string };
}

interface TaskReminderAlertProps {
  pipelineId: string;
}

export function TaskReminderAlert({ pipelineId }: TaskReminderAlertProps) {
  const { toast } = useToast();
  const [showAlert, setShowAlert] = useState(false);
  const [dealsWithoutTasks, setDealsWithoutTasks] = useState<DealWithoutTask[]>([]);
  const [addingTaskFor, setAddingTaskFor] = useState<string | null>(null);
  const [taskData, setTaskData] = useState({ title: "", due_at: "" });

  useEffect(() => {
    if (!pipelineId) return;

    // Verificação inicial
    checkDealsWithoutTasks();

    // Verificar a cada 10 minutos (600000ms)
    const interval = setInterval(() => {
      checkDealsWithoutTasks();
    }, 600000);

    return () => clearInterval(interval);
  }, [pipelineId]);

  const checkDealsWithoutTasks = async () => {
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
      const { data: deals } = await supabase
        .from("crm_deals")
        .select(`
          id,
          title,
          stage:crm_stages(name),
          lead:leads(
            client:clients(name)
          ),
          owner:profiles(full_name)
        `)
        .eq("pipeline_id", pipelineId)
        .eq("status", "aberto")
        .in("stage_id", stageIds);

      if (!deals || deals.length === 0) {
        setDealsWithoutTasks([]);
        setShowAlert(false);
        return;
      }

      // Para cada deal, verificar se tem tarefas
      const dealsWithoutTasksArray: DealWithoutTask[] = [];
      
      for (const deal of deals) {
        const { data: tasks, count } = await supabase
          .from("crm_tasks")
          .select("id", { count: "exact", head: true })
          .eq("deal_id", deal.id);

        if (count === 0) {
          dealsWithoutTasksArray.push(deal as DealWithoutTask);
        }
      }

      if (dealsWithoutTasksArray.length > 0) {
        setDealsWithoutTasks(dealsWithoutTasksArray);
        setShowAlert(true);
      } else {
        setDealsWithoutTasks([]);
        setShowAlert(false);
      }
    } catch (error) {
      // Silenciar erro
    }
  };

  const handleAddTask = async (dealId: string) => {
    if (!taskData.title || !taskData.due_at) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e a data da tarefa",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("crm_tasks")
        .insert({
          deal_id: dealId,
          title: taskData.title,
          due_at: taskData.due_at,
          status: "open",
        });

      if (error) throw error;

      toast({
        title: "Tarefa criada",
        description: "A tarefa foi adicionada ao negócio",
      });

      setTaskData({ title: "", due_at: "" });
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
    // Mostrar novamente após 10 minutos se ainda houver deals sem tarefas
    setTimeout(() => {
      if (dealsWithoutTasks.length > 0) {
        setShowAlert(true);
      }
    }, 600000);
  };

  if (dealsWithoutTasks.length === 0) return null;

  return (
    <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
      <AlertDialogContent className="max-w-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
            Oportunidades sem Tarefas
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            As seguintes oportunidades nas etapas de <strong>Qualificação</strong> e <strong>Negociação</strong> 
            não possuem nenhuma tarefa cadastrada. Adicione pelo menos uma tarefa para cada.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          <div className="space-y-3">
            {dealsWithoutTasks.map((deal) => (
              <Card key={deal.id} className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{deal.title}</h4>
                        <Badge variant="outline">{deal.stage?.name}</Badge>
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
                            <Label htmlFor={`task-title-${deal.id}`}>Título da Tarefa</Label>
                            <Input
                              id={`task-title-${deal.id}`}
                              placeholder="Ex: Ligar para cliente"
                              value={taskData.title}
                              onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`task-date-${deal.id}`}>Data de Vencimento</Label>
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
                              Salvar Tarefa
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setAddingTaskFor(null);
                                setTaskData({ title: "", due_at: "" });
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
            Lembrar depois (10 min)
          </Button>
          <Button onClick={() => setShowAlert(false)}>
            Fechar
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
