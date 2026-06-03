import { useQuery } from "@tanstack/react-query";
import { auditStub } from "@/lib/audit-stub";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, User, FileText } from "lucide-react";
import { useMemo } from "react";

interface LedgerAuditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: any;
}

const FIELD_LABELS: Record<string, string> = {
  description: "Descrição",
  amount: "Valor",
  type: "Tipo",
  status: "Status",
  competence_date: "Data Competência",
  cash_date: "Data Caixa",
  chart_account_id: "Categoria",
  bank_account_id: "Conta Bancária",
  cost_center_id: "Centro de Custo",
  project_id: "Projeto",
  payment_method: "Método Pagamento",
  document_number: "Nº Documento",
  notes: "Observações",
  reconciled: "Conciliado",
  tags: "Tags",
  party_type: "Tipo Parte",
  party_id: "Parte",
  installment_number: "Parcela",
  total_installments: "Total Parcelas",
  is_recurring: "Recorrente",
  recurrence_type: "Tipo Recorrência",
  juros_atraso: "Juros/Atraso",
  has_splits: "Rateado",
  parent_entry_id: "Lançamento Pai",
};

const HIDDEN_FIELDS = new Set(["updated_at", "created_at", "created_by", "id"]);

// Fields whose values are UUIDs pointing to lookup tables
const UUID_LOOKUP_FIELDS = new Set([
  "chart_account_id",
  "bank_account_id",
  "cost_center_id",
  "project_id",
]);

export function LedgerAuditSheet({ open, onOpenChange, entry }: LedgerAuditSheetProps) {
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ["fin-audit-logs", entry?.id],
    enabled: !!entry?.id,
    queryFn: async () => {
      const { data } = awaitauditStub()
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

  // Collect all unique UUIDs from audit logs for lookup fields
  const allUuids = useMemo(() => {
    const ids: Record<string, Set<string>> = {
      chart_account_id: new Set(),
      bank_account_id: new Set(),
      cost_center_id: new Set(),
      project_id: new Set(),
    };
    auditLogs?.forEach((log) => {
      if (log.before_data && log.after_data) {
        for (const field of Object.keys(ids)) {
          const before = log.before_data[field];
          const after = log.after_data[field];
          if (before && typeof before === "string" && before.length > 10) ids[field].add(before);
          if (after && typeof after === "string" && after.length > 10) ids[field].add(after);
        }
      }
    });
    return ids;
  }, [auditLogs]);

  // Fetch lookup names for chart accounts
  const { data: chartAccountNames } = useQuery({
    queryKey: ["audit-chart-accounts", [...(allUuids.chart_account_id || [])]],
    enabled: (allUuids.chart_account_id?.size || 0) > 0,
    queryFn: async () => {
      const ids = [...allUuids.chart_account_id];
      const { data } = await supabase.from("fin_chart_accounts").select("id, name, code").in("id", ids);
      const map: Record<string, string> = {};
      data?.forEach((a) => { map[a.id] = `${a.code} - ${a.name}`; });
      return map;
    },
  });

  const { data: bankAccountNames } = useQuery({
    queryKey: ["audit-bank-accounts", [...(allUuids.bank_account_id || [])]],
    enabled: (allUuids.bank_account_id?.size || 0) > 0,
    queryFn: async () => {
      const ids = [...allUuids.bank_account_id];
      const { data } = await supabase.from("fin_bank_accounts").select("id, nickname").in("id", ids);
      const map: Record<string, string> = {};
      data?.forEach((a) => { map[a.id] = a.nickname; });
      return map;
    },
  });

  const { data: costCenterNames } = useQuery({
    queryKey: ["audit-cost-centers", [...(allUuids.cost_center_id || [])]],
    enabled: (allUuids.cost_center_id?.size || 0) > 0,
    queryFn: async () => {
      const ids = [...allUuids.cost_center_id];
      const { data } = await supabase.from("fin_cost_centers").select("id, name").in("id", ids);
      const map: Record<string, string> = {};
      data?.forEach((a) => { map[a.id] = a.name; });
      return map;
    },
  });

  const { data: projectNames } = useQuery({
    queryKey: ["audit-projects", [...(allUuids.project_id || [])]],
    enabled: (allUuids.project_id?.size || 0) > 0,
    queryFn: async () => {
      const ids = [...allUuids.project_id];
      const { data } = await supabase.from("fin_projects").select("id, name").in("id", ids);
      const map: Record<string, string> = {};
      data?.forEach((a) => { map[a.id] = a.name; });
      return map;
    },
  });

  const lookupMaps: Record<string, Record<string, string> | undefined> = {
    chart_account_id: chartAccountNames,
    bank_account_id: bankAccountNames,
    cost_center_id: costCenterNames,
    project_id: projectNames,
  };

  const resolveValue = (field: string, value: any): string => {
    if (value === null || value === undefined) return "(vazio)";
    if (UUID_LOOKUP_FIELDS.has(field)) {
      const map = lookupMaps[field];
      if (map && typeof value === "string" && map[value]) return map[value];
      if (typeof value === "string" && value.length > 20) return "(removido)";
    }
    if (field === "reconciled") return value ? "Sim" : "Não";
    if (field === "has_splits" || field === "is_recurring") return value ? "Sim" : "Não";
    if (typeof value === "number") {
      if (field === "amount" || field === "juros_atraso") {
        return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      }
      return String(value);
    }
    return String(value);
  };

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
                          if (HIDDEN_FIELDS.has(key)) return null;
                          const before = log.before_data[key];
                          const after = log.after_data[key];
                          if (before !== after) {
                            const label = FIELD_LABELS[key] || key;
                            return (
                              <div key={key} className="flex gap-2 flex-wrap">
                                <span className="text-muted-foreground font-medium">{label}:</span>
                                <span className="text-red-500 line-through">{resolveValue(key, before)}</span>
                                <span>→</span>
                                <span className="text-green-600">{resolveValue(key, after)}</span>
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
