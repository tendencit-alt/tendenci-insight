import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

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

function SummaryBlock({ title, data, paidLabel }: { title: string; data: StatusSummary; paidLabel: string }) {
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
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-foreground font-medium">Total</span>
          <span className="font-mono font-medium">{formatCurrency(data.total)} <span className="text-muted-foreground">({data.totalCount})</span></span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-green-600">✓ {paidLabel}</span>
          <span className="font-mono text-green-600">{formatCurrency(data.paid)} <span className="opacity-70">({data.paidCount})</span></span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-yellow-600">⏳ A vencer</span>
          <span className="font-mono text-yellow-600">{formatCurrency(data.open)} <span className="opacity-70">({data.openCount})</span></span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-red-600">⚠ Vencidas</span>
          <span className="font-mono text-red-600">{formatCurrency(data.overdue)} <span className="opacity-70">({data.overdueCount})</span></span>
        </div>
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

export function AccountsStatusTooltip({
  dateFrom,
  dateTo,
  show = "both",
  children,
}: AccountsStatusTooltipProps) {
  const dfFrom = dateFrom || "2000-01-01";
  const dfTo = dateTo || "2099-12-31";

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
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children || (
          <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help hover:text-muted-foreground transition-colors" />
        )}
      </HoverCardTrigger>
      <HoverCardContent side="bottom" align="start" className="w-72 p-3 z-[9999]">
        <div className={cn("space-y-3", show === "both" && "divide-y divide-border")}>
          {(show === "both" || show === "receivables") && (
            <SummaryBlock title="Contas a Receber" data={receivableSummary} paidLabel="Recebidas" />
          )}
          {(show === "both" || show === "payables") && (
            <div className={show === "both" ? "pt-3" : ""}>
              <SummaryBlock title="Contas a Pagar" data={payableSummary} paidLabel="Pagas" />
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
