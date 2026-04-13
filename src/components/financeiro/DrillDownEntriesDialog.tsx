import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ArrowDownCircle, ArrowUpCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export type DrillDownFilter = {
  type: "payables" | "receivables";
  statusFilter: "all" | "paid" | "open" | "overdue";
  title: string;
};

type EntryRow = {
  id: string;
  amount: number;
  status: string;
  due_date: string;
  description: string | null;
  document_number: string | null;
  installment: number | null;
  total_installments: number | null;
};

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function getStatusColor(status: string) {
  if (status === "PAGO" || status === "RECEBIDO" || status === "CONCILIADO") return "text-green-600";
  if (status === "VENCIDO") return "text-red-600";
  if (status === "PROVISIONADO") return "text-amber-600";
  if (status === "CONFIRMADO") return "text-blue-600";
  if (status === "EM_DISPUTA") return "text-red-500";
  if (status === "PARCIALMENTE_PAGO" || status === "PARCIALMENTE_RECEBIDO") return "text-orange-600";
  if (status === "CANCELADO") return "text-gray-500";
  return "text-yellow-600";
}

function getStatusLabel(status: string, type: "payables" | "receivables") {
  const labels: Record<string, string> = {
    ABERTO: "Aberto",
    PROVISIONADO: "Provisionado",
    CONFIRMADO: "Confirmado",
    VENCIDO: "Vencido",
    PAGO: "Pago",
    RECEBIDO: "Recebido",
    CONCILIADO: "Conciliado",
    PARCIALMENTE_PAGO: "Parcial",
    PARCIALMENTE_RECEBIDO: "Parcial",
    EM_DISPUTA: "Em Disputa",
    RENEGOCIADO: "Renegociado",
    CANCELADO: "Cancelado",
  };
  return labels[status] || status;
}

interface DrillDownEntriesDialogProps {
  filter: DrillDownFilter;
  dateFrom: string;
  dateTo: string;
  onClose: () => void;
}

export function DrillDownEntriesDialog({
  filter,
  dateFrom,
  dateTo,
  onClose,
}: DrillDownEntriesDialogProps) {
  const table = filter.type === "payables" ? "fin_payables" : "fin_receivables";
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: entries, isLoading } = useQuery({
    queryKey: ["drilldown-entries", filter.type, filter.statusFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from(table)
        .select("id, amount, status, due_date, description, document_number, installment, total_installments")
        .neq("status", "CANCELADO")
        .gte("due_date", dateFrom)
        .lte("due_date", dateTo)
        .order("due_date", { ascending: true });

      if (filter.statusFilter === "paid") {
        const paidStatuses = filter.type === "payables" ? ["PAGO"] : ["RECEBIDO"];
        query = query.in("status", paidStatuses);
      } else if (filter.statusFilter === "open") {
        query = query.eq("status", "ABERTO");
      } else if (filter.statusFilter === "overdue") {
        query = query.eq("status", "VENCIDO");
      }

      const { data } = await query;
      return (data || []) as EntryRow[];
    },
  });

  const totalAmount = entries?.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0;

  const selectedAmount = entries
    ?.filter((e) => selectedIds.has(e.id))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!entries) return;
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map((e) => e.id)));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {filter.type === "payables" ? (
              <ArrowDownCircle className="h-5 w-5 text-red-500" />
            ) : (
              <ArrowUpCircle className="h-5 w-5 text-green-500" />
            )}
            {filter.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Detalhamento dos lançamentos
          </DialogDescription>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {entries?.length || 0} lançamento{(entries?.length || 0) !== 1 ? "s" : ""} — Total: {formatCurrency(totalAmount)}
            </span>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 mt-1">
              <span className="text-sm font-medium text-primary">
                {selectedIds.size} selecionado{selectedIds.size !== 1 ? "s" : ""}
              </span>
              <span className="text-sm text-primary/80">—</span>
              <span className="text-sm font-semibold text-primary">
                {formatCurrency(selectedAmount)}
              </span>
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              <Clock className="h-4 w-4 animate-spin mr-2" /> Carregando...
            </div>
          ) : !entries || entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum lançamento encontrado.
            </div>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-[32px_1fr_100px_100px_80px] gap-2 px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={selectedIds.size === entries.length && entries.length > 0}
                    onCheckedChange={toggleAll}
                    className="h-3.5 w-3.5"
                  />
                </div>
                <span>Descrição</span>
                <span className="text-right">Valor</span>
                <span className="text-center">Vencimento</span>
                <span className="text-center">Status</span>
              </div>
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => toggleSelect(entry.id)}
                  className={cn(
                    "grid grid-cols-[32px_1fr_100px_100px_80px] gap-2 px-2 py-2 text-sm rounded cursor-pointer transition-colors border-b border-border/50 last:border-0",
                    selectedIds.has(entry.id) ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={selectedIds.has(entry.id)}
                      onCheckedChange={() => toggleSelect(entry.id)}
                      className="h-3.5 w-3.5"
                    />
                  </div>
                  <div className="truncate">
                    <span className="font-medium text-foreground">
                      {entry.description || "Sem descrição"}
                    </span>
                    {entry.total_installments && entry.total_installments > 1 && (
                      <span className="text-[10px] text-muted-foreground ml-1">
                        ({entry.installment}/{entry.total_installments})
                      </span>
                    )}
                    {entry.document_number && (
                      <span className="text-[10px] text-muted-foreground block">
                        Doc: {entry.document_number}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-right text-foreground">
                    {formatCurrency(Number(entry.amount) || 0)}
                  </span>
                  <span className="text-center text-muted-foreground">
                    {format(new Date(entry.due_date + "T12:00:00"), "dd/MM/yyyy")}
                  </span>
                  <div className="flex justify-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0",
                        getStatusColor(entry.status)
                      )}
                    >
                      {getStatusLabel(entry.status, filter.type)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}