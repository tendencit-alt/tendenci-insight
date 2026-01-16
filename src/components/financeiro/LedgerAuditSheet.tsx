import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, User, FileText } from "lucide-react";

interface LedgerAuditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: any;
}

export function LedgerAuditSheet({ open, onOpenChange, entry }: LedgerAuditSheetProps) {
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ["fin-audit-logs", entry?.id],
    enabled: !!entry?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_audit_logs")
        .select(`
          *,
          user:profiles(full_name)
        `)
        .eq("entity_type", "fin_ledger_entries")
        .eq("entity_id", entry.id)
        .order("created_at", { ascending: false });

      return data || [];
    },
  });

  if (!entry) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Auditoria
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Entry Info */}
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{entry.description}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {Number(entry.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
              <span>•</span>
              <Badge variant="outline">{entry.type}</Badge>
            </div>
          </div>

          {/* Audit Trail */}
          <ScrollArea className="h-[calc(100vh-250px)]">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : auditLogs?.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhum registro de auditoria encontrado
              </div>
            ) : (
              <div className="space-y-3">
                {auditLogs?.map((log) => (
                  <div key={log.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {log.user?.full_name || "Sistema"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div>
                      <Badge 
                        variant={
                          log.action === "INSERT" ? "default" :
                          log.action === "UPDATE" ? "secondary" :
                          "destructive"
                        }
                      >
                        {log.action === "INSERT" ? "Criado" :
                         log.action === "UPDATE" ? "Atualizado" :
                         "Removido"}
                      </Badge>
                    </div>
                    {log.action === "UPDATE" && log.before_data && log.after_data && (
                      <div className="text-xs space-y-1 mt-2">
                        {Object.keys(log.after_data).map((key) => {
                          const before = log.before_data[key];
                          const after = log.after_data[key];
                          if (before !== after && key !== "updated_at") {
                            return (
                              <div key={key} className="flex gap-2">
                                <span className="text-muted-foreground">{key}:</span>
                                <span className="text-red-500 line-through">{String(before)}</span>
                                <span>→</span>
                                <span className="text-green-600">{String(after)}</span>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
