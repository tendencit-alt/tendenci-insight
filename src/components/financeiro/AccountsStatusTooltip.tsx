import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { DrillDownEntriesDialog, DrillDownFilter } from "./DrillDownEntriesDialog";

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

  const result: StatusSummary = { total: 0, totalCount: 0, paid: 0, paidCount: 0, open: 0, openCount: 0, overdue: 0, overdueCount: 0 };

  rows.forEach((r) => {
    const amt = Number(r.amount) || 0;
    result.total += amt;
    result.totalCount++;

    if (r.status === "PAGO" || r.status === "RECEBIDO") {
      result.paid += amt;
      result.paidCount++;
    } else if (r.status === "VENCIDO") {
      result.overdue += amt;
      result.overdueCount++;
    } else {
      result.open += amt;
      result.openCount++;
    }
  });

  return result;
}

function StatusLine({
  label, count, amount, colorClass, icon, onClick,
}: {
  label: string; count: number; amount: number; colorClass: string; icon: string; onClick: () => void;
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
  title, data, paidLabel, type, onDrillDown,
}: {
  title: string; data: StatusSummary; paidLabel: string; type: "payables" | "receivables"; onDrillDown: (f: DrillDownFilter) => void;
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
        <StatusLine label={paidLabel} count={data.paidCount} amount={data.paid} colorClass="text-green-600" icon="✓" onClick={() => onDrillDown({ type, statusFilter: "paid", title: `${title} - ${paidLabel}` })} />
        <StatusLine label="A vencer" count={data.openCount} amount={data.open} colorClass="text-yellow-600" icon="⏳" onClick={() => onDrillDown({ type, statusFilter: "open", title: `${title} - A Vencer` })} />
        <StatusLine label="Vencidas" count={data.overdueCount} amount={data.overdue} colorClass="text-red-600" icon="⚠" onClick={() => onDrillDown({ type, statusFilter: "overdue", title: `${title} - Vencidas` })} />
        <div className="flex h-1.5 rounded-full overflow-hidden bg-muted mt-1">
          {data.paidCount > 0 && <div className="bg-green-500" style={{ width: `${(data.paid / data.total) * 100}%` }} />}
          {data.openCount > 0 && <div className="bg-yellow-400" style={{ width: `${(data.open / data.total) * 100}%` }} />}
          {data.overdueCount > 0 && <div className="bg-red-500" style={{ width: `${(data.overdue / data.total) * 100}%` }} />}
        </div>
      </div>
    </div>
  );
}

export function AccountsStatusTooltip({
  dateFrom, dateTo, show = "both", children,
}: AccountsStatusTooltipProps) {
  const dfFrom = dateFrom || "2000-01-01";
  const dfTo = dateTo || "2099-12-31";
  const [drillDown, setDrillDown] = useState<DrillDownFilter | null>(null);

  const { data: payables } = useQuery({
    queryKey: ["accounts-status-payables", dfFrom, dfTo],
    queryFn: async () => {
      const { data } = await supabase.from("fin_payables").select("amount, status, due_date").neq("status", "CANCELADO").gte("due_date", dfFrom).lte("due_date", dfTo);
      return data as { amount: number; status: string; due_date: string }[] | null;
    },
    staleTime: 60_000,
    enabled: show === "both" || show === "payables",
  });

  const { data: receivables } = useQuery({
    queryKey: ["accounts-status-receivables", dfFrom, dfTo],
    queryFn: async () => {
      const { data } = await supabase.from("fin_receivables").select("amount, status, due_date").neq("status", "CANCELADO").gte("due_date", dfFrom).lte("due_date", dfTo);
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
              <SummaryBlock title="Contas a Receber" data={receivableSummary} paidLabel="Recebidas" type="receivables" onDrillDown={setDrillDown} />
            )}
            {(show === "both" || show === "payables") && (
              <div className={show === "both" ? "pt-3" : ""}>
                <SummaryBlock title="Contas a Pagar" data={payableSummary} paidLabel="Pagas" type="payables" onDrillDown={setDrillDown} />
              </div>
            )}
          </div>
          <p className="text-[9px] text-muted-foreground/60 mt-2 text-center">
            Clique em uma linha para ver os lançamentos
          </p>
        </HoverCardContent>
      </HoverCard>

      {drillDown && (
        <DrillDownEntriesDialog filter={drillDown} dateFrom={dfFrom} dateTo={dfTo} onClose={() => setDrillDown(null)} />
      )}
    </>
  );
}