import { Badge } from "@/components/ui/badge";
import { StatusMachine } from "@/lib/status-machine/engine";
import { getConfigForEntity } from "@/lib/status-machine/config";
import type { StatusKey } from "@/lib/status-machine/types";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface Props {
  status: StatusKey;
  entityType?: string;
  className?: string;
}

export function StatusBadge({ status, entityType = "orders", className }: Props) {
  const config = useMemo(() => {
    const machine = new StatusMachine(getConfigForEntity(entityType));
    return machine.getStatus(status);
  }, [status, entityType]);

  if (!config) return <Badge variant="outline">{status}</Badge>;

  return (
    <Badge className={cn("text-[11px] font-medium", config.bgColor, config.textColor, className)}>
      {config.label}
    </Badge>
  );
}
