import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { StatusMachine } from "@/lib/status-machine/engine";
import { getConfigForEntity } from "@/lib/status-machine/config";
import type { StatusTransition } from "@/lib/status-machine/types";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";

interface Props {
  transitions: StatusTransition[];
  entityType?: string;
  maxHeight?: string;
}

export function StatusTimeline({ transitions, entityType = "orders", maxHeight = "300px" }: Props) {
  const machine = useMemo(() => new StatusMachine(getConfigForEntity(entityType)), [entityType]);

  if (!transitions.length) {
    return <p className="text-xs text-muted-foreground text-center py-4">Nenhuma transição registrada</p>;
  }

  return (
    <ScrollArea style={{ maxHeight }}>
      <div className="space-y-3 p-1">
        {transitions.map((t, i) => {
          const fromCfg = machine.getStatus(t.from);
          const toCfg = machine.getStatus(t.to);
          return (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={cn("w-2 h-2 rounded-full mt-1.5", toCfg?.bgColor || "bg-primary")} />
                {i < transitions.length - 1 && <div className="w-px flex-1 bg-border" />}
              </div>
              <div className="pb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px] h-4">{fromCfg?.label || t.from}</Badge>
                  <span className="text-[10px] text-muted-foreground">→</span>
                  <Badge className={cn("text-[10px] h-4", toCfg?.bgColor, toCfg?.textColor)}>
                    {toCfg?.label || t.to}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t.userName || "Sistema"} · {formatDistanceToNow(new Date(t.timestamp), { addSuffix: true, locale: ptBR })}
                </p>
                {t.reason && <p className="text-[11px] text-muted-foreground italic">{t.reason}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
