import { RecentEvent } from "@/hooks/useCentralOperacional";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  events: RecentEvent[];
  loading: boolean;
}

export function RecentEventsBlock({ events, loading }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Eventos Recentes
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-muted rounded" />
            <div className="h-8 bg-muted rounded" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum evento recente</p>
        ) : (
          <ScrollArea className="h-[220px]">
            <div className="space-y-1.5">
              {events.map((ev) => {
                const moduleLabel = (ev.module || "sistema")
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase());
                return (
                  <div key={ev.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/30 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-2" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">{ev.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px] h-4">{moduleLabel}</Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(ev.timestamp), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                    </div>
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
