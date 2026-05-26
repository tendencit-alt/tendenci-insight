import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ArrowRight } from "lucide-react";

export type KpiKey = "cashBalance" | "monthlyResult" | "openOrders" | "overduePayables" | "goalProgress";

interface Props {
  kpiKey: KpiKey | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fmt = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const TITLE: Record<KpiKey, string> = {
  cashBalance: "Saldo de Caixa — Últimas movimentações",
  monthlyResult: "Resultado do Mês — Composição",
  openOrders: "Pedidos Abertos — Lista",
  overduePayables: "Contas Vencidas — Detalhamento",
  goalProgress: "Meta vs Realizado — Receitas do mês",
};

const ROUTE: Record<KpiKey, { label: string; to: string }> = {
  cashBalance: { label: "Abrir Tesouraria", to: "/financeiro" },
  monthlyResult: { label: "Abrir DRE", to: "/bi-dashboard" },
  openOrders: { label: "Abrir Pedidos", to: "/pedidos" },
  overduePayables: { label: "Abrir Contas a Pagar", to: "/financeiro" },
  goalProgress: { label: "Abrir Planejamento", to: "/planning" },
};

async function fetchData(key: KpiKey) {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

  if (key === "cashBalance") {
    const { data } = await supabase
      .from("fin_ledger_entries")
      .select("id, description, amount, entry_type, type, cash_date, competence_date, status")
      .in("status", ["PAGO_RECEBIDO", "CONCILIADO"])
      .order("cash_date", { ascending: false, nullsFirst: false })
      .limit(20);
    return { rows: data || [] };
  }
  if (key === "monthlyResult" || key === "goalProgress") {
    const { data } = await supabase
      .from("fin_ledger_entries")
      .select("id, description, amount, entry_type, type, competence_date, status, chart_account:fin_chart_accounts(name, grupo_fluxo)")
      .gte("competence_date", monthStart)
      .lte("competence_date", monthEnd)
      .neq("status", "CANCELADO")
      .order("competence_date", { ascending: false })
      .limit(50);
    return { rows: data || [] };
  }
  if (key === "openOrders") {
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, valor_total, status, created_at, client:clients(name)")
      .in("status", ["rascunho", "pendente_aprovacao", "aprovado", "liberado_producao", "em_producao"])
      .order("created_at", { ascending: false })
      .limit(30);
    return { rows: data || [] };
  }
  if (key === "overduePayables") {
    const { data } = await supabase
      .from("fin_payables")
      .select("id, description, amount, due_date, status, supplier:suppliers(name)")
      .in("status", ["ABERTO", "VENCIDO"])
      .lt("due_date", today)
      .order("due_date", { ascending: true })
      .limit(30);
    return { rows: data || [] };
  }
  return { rows: [] };
}

export function ExecutiveKpiDrilldown({ kpiKey, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["kpi-drilldown", kpiKey],
    queryFn: () => fetchData(kpiKey as KpiKey),
    enabled: !!kpiKey && open,
  });

  if (!kpiKey) return null;
  const rows: any[] = data?.rows || [];
  const route = ROUTE[kpiKey];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">{TITLE[kpiKey]}</DialogTitle>
          <DialogDescription className="text-xs">
            Composição dos dados que originam este indicador.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 rounded-md" />)}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sem registros para exibir.</p>
        ) : (
          <ScrollArea className="max-h-[420px] pr-2">
            <div className="space-y-1.5">
              {rows.map((r, idx) => (
                <DrillRow key={r.id ?? idx} kpiKey={kpiKey} row={r} />
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button
            size="sm"
            className="gap-1"
            onClick={() => { onOpenChange(false); navigate(route.to); }}
          >
            {route.label} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DrillRow({ kpiKey, row }: { kpiKey: KpiKey; row: any }) {
  if (kpiKey === "openOrders") {
    return (
      <div className="flex items-center justify-between gap-2 p-2.5 rounded-md border border-border/50 hover:bg-muted/40">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate">
            #{row.order_number ?? row.id?.slice(0, 8)} — {row.client_name ?? "Sem cliente"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {row.created_at ? format(new Date(row.created_at), "dd/MM/yyyy") : "—"}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px]">{row.status}</Badge>
        <span className="text-xs font-mono tabular-nums">{fmt(Number(row.total_amount || 0))}</span>
      </div>
    );
  }

  if (kpiKey === "overduePayables") {
    return (
      <div className="flex items-center justify-between gap-2 p-2.5 rounded-md border border-border/50 hover:bg-muted/40">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate">{row.description ?? "Sem descrição"}</p>
          <p className="text-[10px] text-muted-foreground">
            {row.supplier?.name ?? "—"} · venc. {row.due_date ? format(new Date(row.due_date), "dd/MM/yyyy") : "—"}
          </p>
        </div>
        <Badge variant="destructive" className="text-[10px]">{row.status}</Badge>
        <span className="text-xs font-mono tabular-nums text-red-600 dark:text-red-400">
          {fmt(Number(row.amount || 0))}
        </span>
      </div>
    );
  }

  // ledger entries (cashBalance / monthlyResult / goalProgress)
  const isCredit = row.entry_type === "credit" || row.type === "RECEITA";
  return (
    <div className="flex items-center justify-between gap-2 p-2.5 rounded-md border border-border/50 hover:bg-muted/40">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{row.description ?? "Lançamento"}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {row.chart_account?.name ? `${row.chart_account.name} · ` : ""}
          {row.cash_date
            ? `pago ${format(new Date(row.cash_date), "dd/MM/yyyy")}`
            : row.competence_date
            ? `comp. ${format(new Date(row.competence_date), "dd/MM/yyyy")}`
            : ""}
        </p>
      </div>
      <Badge variant="outline" className="text-[10px]">{row.status}</Badge>
      <span className={`text-xs font-mono tabular-nums ${isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
        {isCredit ? "+" : "−"} {fmt(Math.abs(Number(row.amount || 0)))}
      </span>
    </div>
  );
}
