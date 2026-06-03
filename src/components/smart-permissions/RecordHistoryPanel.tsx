import { useQuery } from "@tanstack/react-query";
import { auditStub } from "@/lib/audit-stub";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { History } from "lucide-react";

interface Props {
  tableName: string;
  recordId: string;
  limit?: number;
}

const eventLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  INSERT: { label: "Criou", variant: "default" },
  UPDATE: { label: "Editou", variant: "secondary" },
  DELETE: { label: "Excluiu", variant: "destructive" },
  ACCESS: { label: "Acessou", variant: "outline" },
  APPROVE: { label: "Aprovou", variant: "default" },
};

/** Drop-in panel for detail dialogs: shows audit_log entries for this record. */
export function RecordHistoryPanel({ tableName, recordId, limit = 50 }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["record-history", tableName, recordId],
    enabled: !!recordId,
    queryFn: async () => {
      const { data, error } = awaitauditStub()
        .select("id, event_type, field_name, old_value, new_value, user_id, created_at, metadata")
        .eq("table_name", tableName)
        .eq("record_id", recordId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground text-sm">
        <History className="h-6 w-6" />
        Sem histórico para este registro.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-3">
      <div className="space-y-2">
        {data.map((row: any) => {
          const evt = eventLabels[row.event_type] ?? { label: row.event_type, variant: "outline" as const };
          return (
            <div key={row.id} className="rounded-md border bg-card p-2.5 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={evt.variant} className="text-[10px]">
                  {evt.label}
                </Badge>
                {row.field_name && (
                  <span className="font-mono text-[10px] text-muted-foreground">{row.field_name}</span>
                )}
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {format(new Date(row.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </span>
              </div>
              {row.old_value !== null && row.new_value !== null && (
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <div className="rounded bg-destructive/5 px-2 py-1">
                    <p className="text-[10px] text-muted-foreground">Antes</p>
                    <p className="font-mono text-[11px] truncate">{String(row.old_value)}</p>
                  </div>
                  <div className="rounded bg-primary/5 px-2 py-1">
                    <p className="text-[10px] text-muted-foreground">Depois</p>
                    <p className="font-mono text-[11px] truncate">{String(row.new_value)}</p>
                  </div>
                </div>
              )}
              {row.user_id && (
                <p className="mt-1 text-[10px] text-muted-foreground font-mono">
                  por {String(row.user_id).slice(0, 8)}…
                </p>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
