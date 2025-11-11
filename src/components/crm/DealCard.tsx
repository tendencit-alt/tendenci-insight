import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Flame, Snowflake, User } from "lucide-react";

interface DealCardProps {
  deal: any;
  timeInStage: number;
  onClick: () => void;
  onDragStart?: (e: React.DragEvent) => void;
}

export function DealCard({ deal, timeInStage, onClick, onDragStart }: DealCardProps) {
  const clientName = deal.lead?.client?.name || "Sem cliente";
  const phone = deal.lead?.client?.phone || "";
  const temperature = deal.lead?.temperature || "frio";
  const productType = deal.product_type;
  const ownerName = deal.owner?.full_name || deal.owner?.email?.split("@")[0] || "";

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
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
    >
      <CardContent className="p-4">
        <div className="space-y-2">
          {/* Nome do cliente em destaque */}
          <p className="font-bold text-base">{clientName}</p>
          
          {/* Título do negócio */}
          <p className="text-sm text-muted-foreground">{deal.title}</p>
          
          {/* Telefone */}
          {phone && (
            <p className="text-xs text-muted-foreground">{phone}</p>
          )}
          
          {/* Badges: Temperatura e Tipo de Produto */}
          <div className="flex flex-wrap gap-1">
            {temperature && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                {getTemperatureIcon()}
                {temperature.charAt(0).toUpperCase() + temperature.slice(1)}
              </Badge>
            )}
            {productType && (
              <Badge variant="secondary" className="text-xs">
                {productType}
              </Badge>
            )}
          </div>
          
          {/* Responsável */}
          {ownerName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{ownerName}</span>
            </div>
          )}
          
          {/* Valor e Tempo */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Badge variant="secondary" className="text-xs font-semibold">
              R$ {Number(deal.value || 0).toLocaleString("pt-BR")}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{timeInStage}h</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
