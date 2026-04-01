import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info, ArrowDownCircle, ArrowUpCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface AccountsStatusTooltipProps {
  dateFrom?: string | null;
  dateTo?: string | null;
  show?: "both" | "payables" | "receivables";
  children?: React.ReactNode;
}

interface StatusSummary {
  total: number;
  totalCount: number;
  paid: number;
  paidCount: number;
  open: number;
  openCount: number;
  overdue: number;
  overdueCount: number;
}

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

type DrillDownFilter = {
  type: "payables" | "receivables";
  statusFilter: "all" | "paid" | "open" | "overdue";
  title: string;
};

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function summarize(
  rows: { amount: number; status: string; due_date: string }[] | null
): StatusSummary {
  if (!rows || rows.length === 0)
    return { total: 0, totalCount: 0, paid: 0, paidCount: 0, open: 0, openCount: 0, overdue: 0, overdueCount: 0 };

  const today = new Date().toISOString().slice(0, 10);
  const result: StatusSummary = { total: 0, totalCount: 0, paid: 0, paidCount: 0, open: 0, openCount: 0, overdue: 0, overdueCount: 0 };

  rows.forEach((r) => {
    const amt = Number(r.amount) || 0;
    result.total += amt;
    result.totalCount++;

    if (r.status === "PAGO" || r.status === "RECEBIDO") {
      result.paid += amt;
      result.paidCount++;
    } else if (r.status === "ABERTO" && r.due_date < today) {
      result.overdue += amt;
      result.overdueCount++;
    } else {
      result.open += amt;
      result.openCount++;
    }
  });

  return result;
}

function getStatusColor(status: string, dueDate: string) {
  const today = new Date().toISOString().slice(0, 10);
  if (status === "PAGO" || status === "RECEBIDO") return "text-green-600";
  if (status === "ABERTO" && dueDate < today) return "text-red-600";
  return "text-yellow-600";
}

function getStatusLabel(status: string, dueDate: string, type: "payables" | "receivables") {
  const today = new Date().toISOString().slice(0, 10);
  if (status === "PAGO") return "Paga";
  if (status === "RECEBIDO") return "Recebida";
  if (status === "ABERTO" && dueDate < today) return "Vencida";
  return "A vencer";
}

function StatusLine({
  label,
  count,
  amount,
  colorClass,
  icon,
  onClick,
}: {
  label: string;
  count: number;
  amount: number;
  colorClass: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex justify-between text-[11px] w-full rounded px-1 py-0.5 -mx-1 transition-colors",
        "hover:bg-muted/80 cursor-pointer text-left"
      )}
    >
      <span className={colorClass}>{icon} {label}</span>
      <span className={cn("font-mono", colorClass)}>
        {formatCurrency(amount)} <span className="opacity-70">({count})</span>
      </span>
    </button>
  );
}

function SummaryBlock({
  title,
  data,
  paidLabel,
  type,
  onDrillDown,
}: {
  title: string;
  data: StatusSummary;
  paidLabel: string;
  type: "payables" | "receivables";
  onDrillDown: (filter: DrillDownFilter) => void;
}) {
  if (data.totalCount === 0) {
    return (
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{title}</p>
        <p className="text-[10px] text-muted-foreground">Nenhum título no período</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{title}</p>
      <div className="space-y-0.5">
        <button
          onClick={() => onDrillDown({ type, statusFilter: "all", title: `${title} - Todos` })}
          className="flex justify-between text-[11px] w-full rounded px-1 py-0.5 -mx-1 hover:bg-muted/80 cursor-pointer text-left transition-colors"
        >
          <span className="text-foreground font-medium">Total</span>
          <span className="font-mono font-medium">{formatCurrency(data.total)} <span className="text-muted-foreground">({data.totalCount})</span></span>
        </button>
        <StatusLine
          label={paidLabel}
          count={data.paidCount}
          amount={data.paid}
          colorClass="text-green-600"
          icon="✓"
          onClick={() => onDrillDown({ type, statusFilter: "paid", title: `${title} - ${paidLabel}` })}
        />
        <StatusLine
          label="A vencer"
          count={data.openCount}
          amount={data.open}
          colorClass="text-yellow-600"
          icon="⏳"
          onClick={() => onDrillDown({ type, statusFilter: "open", title: `${title} - A Vencer` })}
        />
        <StatusLine
          label="Vencidas"
          count={data.overdueCount}
          amount={data.overdue}
          colorClass="text-red-600"
          icon="⚠"
          onClick={() => onDrillDown({ type, statusFilter: "overdue", title: `${title} - Vencidas` })}
        />
        {/* Progress bar */}
        <div className="flex h-1.5 rounded-full overflow-hidden bg-muted mt-1">
          {data.paidCount > 0 && (
            <div className="bg-green-500" style={{ width: `${(data.paid / data.total) * 100}%` }} />
          )}
          {data.openCount > 0 && (
            <div className="bg-yellow-400" style={{ width: `${(data.open / data.total) * 100}%` }} />
          )}
          {data.overdueCount > 0 && (
            <div className="bg-red-500" style={{ width: `${(data.overdue / data.total) * 100}%` }} />
          )}
        </div>
      </div>
    </div>
  );
}

function DrillDownDialog({
  filter,
  dateFrom,
  dateTo,
  onClose,
}: {
  filter: DrillDownFilter;
  dateFrom: string;
  dateTo: string;
  onClose: () => void;
}) {
  const table = filter.type === "payables" ? "fin_payables" : "fin_receivables";
  const today = new Date().toISOString().slice(0, 10);

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
        query = query.eq("status", "ABERTO").gte("due_date", today);
      } else if (filter.statusFilter === "overdue") {
        query = query.eq("status", "ABERTO").lt("due_date", today);
      }

      const { data } = await query;
      return (data || []) as EntryRow[];
    },
  });

  const totalAmount = entries?.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0;

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
          {entries && (
            <p className="text-sm text-muted-foreground">
              {entries.length} lançamento{entries.length !== 1 ? "s" : ""} — Total: {formatCurrency(totalAmount)}
            </p>
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
              {/* Header */}
              <div className="grid grid-cols-[1fr_100px_100px_80px] gap-2 px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
                <span>Descrição</span>
                <span className="text-right">Valor</span>
                <span className="text-center">Vencimento</span>
                <span className="text-center">Status</span>
              </div>
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-[1fr_100px_100px_80px] gap-2 px-2 py-2 text-sm rounded hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                >
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
                        getStatusColor(entry.status, entry.due_date)
                      )}
                    >
                      {getStatusLabel(entry.status, entry.due_date, filter.type)}
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

export function AccountsStatusTooltip({
  dateFrom,
  dateTo,
  show = "both",
  children,
}: AccountsStatusTooltipProps) {
  const dfFrom = dateFrom || "2000-01-01";
  const dfTo = dateTo || "2099-12-31";
  const [drillDown, setDrillDown] = useState<DrillDownFilter | null>(null);

  const { data: payables } = useQuery({
    queryKey: ["accounts-status-payables", dfFrom, dfTo],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_payables")
        .select("amount, status, due_date")
        .neq("status", "CANCELADO")
        .gte("due_date", dfFrom)
        .lte("due_date", dfTo);
      return data as { amount: number; status: string; due_date: string }[] | null;
    },
    staleTime: 60_000,
    enabled: show === "both" || show === "payables",
  });

  const { data: receivables } = useQuery({
    queryKey: ["accounts-status-receivables", dfFrom, dfTo],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_receivables")
        .select("amount, status, due_date")
        .neq("status", "CANCELADO")
        .gte("due_date", dfFrom)
        .lte("due_date", dfTo);
      return data as { amount: number; status: string; due_date: string }[] | null;
    },
    staleTime: 60_000,
    enabled: show === "both" || show === "receivables",
  });

  const payableSummary = summarize(payables);
  const receivableSummary = summarize(receivables);

  return (
    <>
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          {children || (
            <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help hover:text-muted-foreground transition-colors" />
          )}
        </HoverCardTrigger>
        <HoverCardContent side="bottom" align="start" className="w-80 p-3 z-[9999]">
          <div className={cn("space-y-3", show === "both" && "divide-y divide-border")}>
            {(show === "both" || show === "receivables") && (
              <SummaryBlock
                title="Contas a Receber"
                data={receivableSummary}
                paidLabel="Recebidas"
                type="receivables"
                onDrillDown={setDrillDown}
              />
            )}
            {(show === "both" || show === "payables") && (
              <div className={show === "both" ? "pt-3" : ""}>
                <SummaryBlock
                  title="Contas a Pagar"
                  data={payableSummary}
                  paidLabel="Pagas"
                  type="payables"
                  onDrillDown={setDrillDown}
                />
              </div>
            )}
          </div>
          <p className="text-[9px] text-muted-foreground/60 mt-2 text-center">
            Clique em uma linha para ver os lançamentos
          </p>
        </HoverCardContent>
      </HoverCard>

      {drillDown && (
        <DrillDownDialog
          filter={drillDown}
          dateFrom={dfFrom}
          dateTo={dfTo}
          onClose={() => setDrillDown(null)}
        />
      )}
    </>
  );
}