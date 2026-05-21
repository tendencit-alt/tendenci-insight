import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Flame, Snowflake, User, Bot, X, Mic, Paperclip, Target, AlertTriangle, CheckCircle } from "lucide-react";
import { useEffect, useState, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface DealCardProps {
  deal: any;
  timeInStage: number;
  onClick: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDelete?: (dealId: string) => void;
  // Props opcionais para receber dados de tasks do pai (evita N+1 queries)
  taskData?: { total: number; overdue: number };
  // Se true, desabilita o sortable (usado no DragOverlay)
  isDragOverlay?: boolean;
}

function DealCardComponent({ deal, timeInStage, onClick, onDragStart, onDelete, taskData, isDragOverlay }: DealCardProps) {
  const [audioCount, setAudioCount] = useState(0);
  const [fileCount, setFileCount] = useState(0);
  const [taskCount, setTaskCount] = useState(taskData?.total || 0);
  const [overdueTaskCount, setOverdueTaskCount] = useState(taskData?.overdue || 0);
  const [hasIndication, setHasIndication] = useState(false);

  // Hook do @dnd-kit para tornar o card arrastável
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: deal.id,
    disabled: isDragOverlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const fetchFiles = useCallback(async () => {
    const { data } = await supabase
      .from("crm_deal_files")
      .select("file_type")
      .eq("deal_id", deal.id);

    if (data) {
      const audios = data.filter(f => f.file_type?.startsWith('audio/')).length;
      const files = data.filter(f => !f.file_type?.startsWith('audio/')).length;
      setAudioCount(audios);
      setFileCount(files);
    }
  }, [deal.id]);

  const fetchTasks = useCallback(async () => {
    // Se taskData foi passado pelo pai, não buscar individualmente
    if (taskData !== undefined) return;
    
    const { data } = await supabase
      .from("crm_tasks")
      .select("id, status, due_at")
      .eq("deal_id", deal.id)
      .eq("status", "open");

    if (data) {
      setTaskCount(data.length);
      const now = new Date();
      const overdue = data.filter(t => new Date(t.due_at) < now).length;
      setOverdueTaskCount(overdue);
    }
  }, [deal.id, taskData]);

  const fetchIndications = useCallback(async () => {
    const { data } = await supabase
      .from("architect_indications")
      .select("id")
      .eq("deal_id", deal.id)
      .limit(1);

    setHasIndication((data?.length || 0) > 0);
  }, [deal.id]);

  // Atualizar estado quando taskData mudar (vindo do pai)
  useEffect(() => {
    if (taskData !== undefined) {
      setTaskCount(taskData.total);
      setOverdueTaskCount(taskData.overdue);
    }
  }, [taskData]);

  useEffect(() => {
    if (deal.id) {
      fetchFiles();
      fetchTasks();
      fetchIndications();
    }
  }, [deal.id, fetchFiles, fetchTasks, fetchIndications]);

  // REMOVIDO: Subscription individual por deal
  // Os dados agora são atualizados pelo CRMBoard quando há mudanças

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(deal.id);
    }
  };
  const clientName = deal.lead?.client?.name || "Sem cliente";
  const phone = deal.lead?.client?.phone || "";
  const temperature = deal.lead?.temperature || "frio";
  const productType = deal.product_type;
  const ownerName = deal.owner?.full_name || deal.owner?.email?.split("@")[0] || "";
  const fromAI = deal.from_ai === true;

  const getTemperatureIcon = () => {
    switch (temperature.toLowerCase()) {
      case "quente":
        return <Flame className="h-3 w-3 text-red-500" />;
      case "morno":
        return <Flame className="h-3 w-3 text-orange-500" />;
      case "frio":
        return <Snowflake className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-grab hover:shadow-lg hover:border-primary/50 transition-all duration-200 hover:scale-[1.01] animate-fade-in relative group border-border/50 hover:bg-accent/5",
        isDragging && "opacity-50 cursor-grabbing",
        isDragOverlay && "shadow-xl cursor-grabbing rotate-2"
      )}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-destructive/10"
          onClick={handleDelete}
        >
          <X className="h-3.5 w-3.5 text-destructive" />
        </Button>
      )}
      <CardContent className="p-2">
        <div className="space-y-1">
          {/* Nome do cliente em destaque com tag IA */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {fromAI && (
              <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 flex-shrink-0 h-4">
                <Bot className="h-2.5 w-2.5 mr-0.5" />
                IA
              </Badge>
            )}
            {hasIndication && (
              <Badge className="text-[10px] bg-amber-500 hover:bg-amber-600 text-white flex-shrink-0 h-4 flex items-center gap-0.5">
                <Target className="h-2.5 w-2.5" />
                Indicação
              </Badge>
            )}
            <p className="font-bold text-sm line-clamp-1 flex-1 min-w-0">{clientName}</p>
          </div>
          
          {/* Título do negócio com indicador de etapa Lead */}
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-muted-foreground flex-1 line-clamp-1">{deal.title}</p>
          </div>
          
          {/* Telefone */}
          {phone && (
            <p className="text-[10px] text-muted-foreground truncate">{phone}</p>
          )}
          
          {/* Última Observação */}
          {deal.note && (
            <div className="p-1.5 bg-muted/50 rounded-md border-l-2 border-primary/40">
              <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">📋 Última Observação:</p>
              <p className="text-[10px] line-clamp-2 leading-relaxed">{deal.note}</p>
            </div>
          )}

          {/* Arquivos, Áudios e Tarefas */}
          {(audioCount > 0 || fileCount > 0 || taskCount > 0) && (
            <div className="flex gap-1 flex-wrap">
              {audioCount > 0 && (
                <Badge variant="outline" className="text-[10px] flex items-center gap-0.5 h-4 px-1.5">
                  <Mic className="h-2.5 w-2.5" />
                  {audioCount}
                </Badge>
              )}
              {fileCount > 0 && (
                <Badge variant="outline" className="text-[10px] flex items-center gap-0.5 h-4 px-1.5">
                  <Paperclip className="h-2.5 w-2.5" />
                  {fileCount}
                </Badge>
              )}
              {taskCount > 0 && overdueTaskCount > 0 && (
                <Badge 
                  key="task-overdue"
                  variant="destructive" 
                  className="text-[10px] flex items-center gap-0.5 h-4 px-1.5 font-semibold"
                >
                  <AlertTriangle className="h-2.5 w-2.5" />
                  <span>{overdueTaskCount} atrasada{overdueTaskCount > 1 ? 's' : ''}</span>
                </Badge>
              )}
              {taskCount > 0 && overdueTaskCount === 0 && (
                <Badge 
                  key="task-ok"
                  variant="outline" 
                  className="text-[10px] flex items-center gap-0.5 h-4 px-1.5 font-semibold"
                >
                  <CheckCircle className="h-2.5 w-2.5" />
                  <span>{taskCount} tarefa{taskCount > 1 ? 's' : ''}</span>
                </Badge>
              )}
            </div>
          )}
          
          {/* Badges: Temperatura e Tipo de Produto */}
          <div className="flex flex-wrap gap-1">
            {temperature && (
              <Badge variant="outline" className="text-[10px] flex items-center gap-1 flex-shrink-0 px-1.5 py-0.5 h-4">
                {getTemperatureIcon()}
                <span className="truncate font-medium">{temperature.charAt(0).toUpperCase() + temperature.slice(1)}</span>
              </Badge>
            )}
            {productType && (
              <Badge variant="secondary" className="text-[10px] truncate px-1.5 py-0.5 font-medium h-4">
                {productType}
              </Badge>
            )}
          </div>
          
          {/* Responsável */}
          {ownerName && (
            <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground min-w-0">
              <User className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate">{ownerName}</span>
            </div>
          )}
          
          {/* Valor e Tempo */}
          <div className="flex items-center justify-between pt-2 border-t gap-1.5">
            <Badge variant="secondary" className="text-xs font-bold truncate px-2 py-1">
              R$ {Number(deal.value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
              <Clock className="h-3 w-3" />
              <span className="font-medium">{timeInStage}h</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Exportar componente com React.memo para otimização
export const DealCard = memo(DealCardComponent);
