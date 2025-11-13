import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Flame, Snowflake, User, Bot, X } from "lucide-react";

interface DealCardProps {
  deal: any;
  timeInStage: number;
  onClick: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDelete?: (dealId: string) => void;
}

export function DealCard({ deal, timeInStage, onClick, onDragStart, onDelete }: DealCardProps) {
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
      className="cursor-pointer hover:shadow-md transition-shadow relative group"
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
    >
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={handleDelete}
        >
          <X className="h-4 w-4 text-destructive" />
        </Button>
      )}
      <CardContent className="p-[clamp(12px,2vw,20px)]">
        <div className="space-y-2">
          {/* Nome do cliente em destaque com tag IA */}
          <div className="flex items-center gap-2 flex-wrap">
            {fromAI && (
              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 flex-shrink-0">
                <Bot className="h-3 w-3 mr-1" />
                IA
              </Badge>
            )}
            <p className="font-bold text-base line-clamp-1 flex-1 min-w-0">{clientName}</p>
          </div>
          
          {/* Título do negócio com indicador de etapa Lead */}
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground flex-1 line-clamp-1">{deal.title}</p>
          </div>
          
          {/* Telefone */}
          {phone && (
            <p className="text-xs text-muted-foreground truncate">{phone}</p>
          )}
          
          {/* Observações */}
          {deal.note && (
            <p className="text-xs text-muted-foreground italic line-clamp-2">
              📝 {deal.note}
            </p>
          )}
          
          {/* Badges: Temperatura e Tipo de Produto */}
          <div className="flex flex-wrap gap-1">
            {temperature && (
              <Badge variant="outline" className="text-xs flex items-center gap-1 flex-shrink-0">
                {getTemperatureIcon()}
                <span className="truncate">{temperature.charAt(0).toUpperCase() + temperature.slice(1)}</span>
              </Badge>
            )}
            {productType && (
              <Badge variant="secondary" className="text-xs truncate">
                {productType}
              </Badge>
            )}
          </div>
          
          {/* Responsável */}
          {ownerName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{ownerName}</span>
            </div>
          )}
          
          {/* Valor e Tempo */}
          <div className="flex items-center justify-between pt-2 border-t gap-2">
            <Badge variant="secondary" className="text-xs font-semibold truncate">
              R$ {Number(deal.value || 0).toLocaleString("pt-BR")}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
              <Clock className="h-3 w-3" />
              <span>{timeInStage}h</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
