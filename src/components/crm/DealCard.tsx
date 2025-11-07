import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface DealCardProps {
  deal: any;
  timeInStage: number;
  onClick: () => void;
}

export function DealCard({ deal, timeInStage, onClick }: DealCardProps) {
  const clientName = deal.lead?.client?.name || "Sem cliente";
  const phone = deal.lead?.client?.phone || "";

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-2">
          <p className="font-semibold text-sm">{deal.title}</p>
          <p className="text-xs text-muted-foreground">
            {clientName}
            {phone && ` • ${phone}`}
          </p>
          {deal.architect && (
            <p className="text-xs text-muted-foreground">
              Arq: {deal.architect.name}
            </p>
          )}
          <div className="flex items-center justify-between pt-2">
            <Badge variant="secondary" className="text-xs">
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
