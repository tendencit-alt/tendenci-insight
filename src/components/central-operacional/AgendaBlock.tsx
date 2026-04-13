import { AgendaItem } from "@/hooks/useCentralOperacional";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, CreditCard, ArrowDownCircle, Truck, Factory } from "lucide-react";

const TYPE_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  payment: { icon: CreditCard, label: "Pagamento", color: "text-destructive" },
  receivable: { icon: ArrowDownCircle, label: "Recebimento", color: "text-green-600" },
  delivery: { icon: Truck, label: "Entrega", color: "text-blue-600" },
  production: { icon: Factory, label: "Produção", color: "text-orange-600" },
};

interface Props {
  items: AgendaItem[];
  loading: boolean;
}

export function AgendaBlock({ items, loading }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Agenda de Hoje
          {items.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">{items.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum evento para hoje</p>
        ) : (
          <ScrollArea className="h-[220px]">
            <div className="space-y-2">
              {items.map((item) => {
                const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.payment;
                const Icon = cfg.icon;
                return (
                  <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg border">
                    <Icon className={`h-4 w-4 flex-shrink-0 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <Badge variant="outline" className="text-[10px] h-4">{cfg.label}</Badge>
                    </div>
                    <span className={`text-xs font-semibold whitespace-nowrap ${cfg.color}`}>
                      {item.detail}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
