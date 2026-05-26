import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DELIVERY: Record<string, { label: string; cls: string }> = {
  pendente:    { label: "Pendente",    cls: "bg-muted text-muted-foreground" },
  agendada:    { label: "Agendada",    cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  em_transito: { label: "Em trânsito", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  entregue:    { label: "Entregue",    cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  cancelada:   { label: "Cancelada",   cls: "bg-destructive/15 text-destructive" },
};

const INSTALL: Record<string, { label: string; cls: string }> = {
  pendente:       { label: "Pendente",       cls: "bg-muted text-muted-foreground" },
  agendada:       { label: "Agendada",       cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  em_andamento:   { label: "Em andamento",   cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  concluida:      { label: "Concluída",      cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  com_pendencia:  { label: "Com pendência",  cls: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  cancelada:      { label: "Cancelada",      cls: "bg-destructive/15 text-destructive" },
};

export function DeliveryStatusBadge({ status }: { status: string }) {
  const c = DELIVERY[status] ?? DELIVERY.pendente;
  return <Badge variant="outline" className={cn("border-transparent text-[10px] h-5", c.cls)}>{c.label}</Badge>;
}

export function InstallStatusBadge({ status }: { status: string }) {
  const c = INSTALL[status] ?? INSTALL.pendente;
  return <Badge variant="outline" className={cn("border-transparent text-[10px] h-5", c.cls)}>{c.label}</Badge>;
}

export const DELIVERY_STATUSES = Object.keys(DELIVERY) as Array<keyof typeof DELIVERY>;
export const INSTALL_STATUSES = Object.keys(INSTALL) as Array<keyof typeof INSTALL>;
