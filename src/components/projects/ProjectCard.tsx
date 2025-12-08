import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2, Calendar, User, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// Estágios considerados como "entregues" (projeto já passou de mãos)
const DELIVERED_STAGES = ['orcado', 'apresentado', 'em_negociacao', 'aprovado'];

interface ProjectCardProps {
  project: any;
  onView: (project: any) => void;
  onDelete?: (project: any) => void;
  showDeleteButton?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, project: any) => void;
}

export function ProjectCard({ 
  project, 
  onView, 
  onDelete, 
  showDeleteButton = false,
  draggable = false,
  onDragStart
}: ProjectCardProps) {
  
  const getDeadlineInfo = () => {
    const stage = project.stage;
    const deadline = project.deadline;
    
    // Se o projeto já avançou para estágios de entrega, mostrar "Entregue"
    if (stage && DELIVERED_STAGES.includes(stage)) {
      return { label: "Entregue", isUrgent: false, isOverdue: false, color: "text-green-600" };
    }
    
    if (!deadline) {
      return { label: "Sem prazo", isUrgent: false, isOverdue: false, color: "text-muted-foreground" };
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    
    const days = differenceInDays(deadlineDate, today);
    
    if (days < 0) {
      return { 
        label: `Vencido há ${Math.abs(days)} dia(s)`, 
        isUrgent: true, 
        isOverdue: true,
        color: "text-destructive"
      };
    }
    
    if (days <= 3) {
      return { 
        label: `${days} dia(s) restante(s)`, 
        isUrgent: true, 
        isOverdue: false,
        color: "text-orange-600"
      };
    }
    
    return { 
      label: `${days} dias restantes`, 
      isUrgent: false, 
      isOverdue: false,
      color: "text-green-600"
    };
  };

  const getDaysSinceSent = () => {
    const sentDate = project.sent_date || project.created_at;
    if (!sentDate) return null;
    
    const days = differenceInDays(new Date(), new Date(sentDate));
    return days;
  };

  const deadlineInfo = getDeadlineInfo();
  const daysSinceSent = getDaysSinceSent();
  const hasNoArchitect = !project.architect && !project.architect_id;

  return (
    <Card
      className={`p-4 hover:shadow-lg transition-all ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${hasNoArchitect ? 'border-l-4 border-l-orange-400' : ''}`}
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, project)}
      onClick={() => onView(project)}
    >
      <div className="space-y-3">
        {/* Header with title and badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm line-clamp-2">
              {project.name || "Sem título"}
            </h4>
          </div>
          {hasNoArchitect && (
            <Badge variant="outline" className="shrink-0 text-orange-600 border-orange-400 text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Sem Arq.
            </Badge>
          )}
        </div>
        
        {/* Client info */}
        {project.client?.name && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            <span className="truncate">{project.client.name}</span>
          </div>
        )}
        
        {/* Architect info */}
        {project.architect?.name && (
          <p className="text-xs text-muted-foreground truncate">
            🏛️ {project.architect.name}
          </p>
        )}
        
        {/* Value */}
        {project.value > 0 && (
          <p className="font-bold text-primary text-sm">
            R$ {project.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        )}
        
        {/* Days since sent */}
        {daysSinceSent !== null && daysSinceSent > 0 && (
          <p className="text-xs text-muted-foreground">
            📅 Há {daysSinceSent} dia(s)
          </p>
        )}
        
        {/* Deadline info */}
        <div className={`flex items-center gap-2 text-xs ${deadlineInfo.color}`}>
          <Calendar className="w-3 h-3" />
          <span className={deadlineInfo.isOverdue ? "font-semibold" : ""}>
            {deadlineInfo.label}
          </span>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
          <Button 
            size="sm" 
            variant="ghost" 
            className="flex-1 h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onView(project);
            }}
          >
            <Eye className="w-3 h-3 mr-1" />
            Ver
          </Button>
          {showDeleteButton && onDelete && (
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(project);
              }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
