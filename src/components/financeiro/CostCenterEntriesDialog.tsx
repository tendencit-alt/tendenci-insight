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
import { ArrowDownCircle, ArrowUpCircle, DollarSign, Clock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OrderDetailSheet } from "@/components/orders/OrderDetailSheet";

export interface CostCenterDrillDownFilter {
  costCenterId: string;
  costCenterName: string;
  type: "receitas" | "despesas" | "resultado";
}

interface CostCenterEntriesDialogProps {
  filter: CostCenterDrillDownFilter;
  dateFrom: string | null;
  dateTo: string | null;
  onClose: () => void;
}

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CostCenterEntriesDialog({
  filter,
  dateFrom,
  dateTo,
  onClose,
}: CostCenterEntriesDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data: entries, isLoading } = useQuery({
    queryKey: ["cc-drilldown", filter.costCenterId, filter.type, dateFrom, dateTo],
    queryFn: async () => {
      // 1) Direct entries for this cost center
      let directQuery = supabase
        .from("fin_ledger_entries")
        .select("id, description, amount, type, competence_date, cash_date, status, chart_account:fin_chart_accounts(name, code)")
        .eq("cost_center_id", filter.costCenterId)
        .neq("status", "CANCELADO")
        .order("competence_date", { ascending: false });

      if (filter.type === "receitas") {
        directQuery = directQuery.eq("type", "RECEITA");
      } else if (filter.type === "despesas") {
        directQuery = directQuery.eq("type", "DESPESA");
      }

      if (dateFrom && dateTo) {
        directQuery = directQuery.or(
          `and(cash_date.gte.${dateFrom},cash_date.lte.${dateTo}),and(cash_date.is.null,competence_date.gte.${dateFrom},competence_date.lte.${dateTo})`
        );
      }

      const { data: directEntries } = await directQuery;

      // 2) Split entries: find splits for this CC, then fetch parent entries
      const { data: splits } = await supabase
        .from("fin_ledger_splits")
        .select("parent_entry_id, amount")
        .eq("cost_center_id", filter.costCenterId);

      const splitParentIds = [...new Set(splits?.map(s => s.parent_entry_id) || [])];
      let splitEntries: any[] = [];

      if (splitParentIds.length > 0) {
        let splitQuery = supabase
          .from("fin_ledger_entries")
          .select("id, description, amount, type, competence_date, cash_date, status, has_splits, chart_account:fin_chart_accounts(name, code)")
          .eq("has_splits", true)
          .neq("status", "CANCELADO")
          .in("id", splitParentIds)
          .order("competence_date", { ascending: false });

        if (filter.type === "receitas") {
          splitQuery = splitQuery.eq("type", "RECEITA");
        } else if (filter.type === "despesas") {
          splitQuery = splitQuery.eq("type", "DESPESA");
        }

        if (dateFrom && dateTo) {
          splitQuery = splitQuery.or(
            `and(cash_date.gte.${dateFrom},cash_date.lte.${dateTo}),and(cash_date.is.null,competence_date.gte.${dateFrom},competence_date.lte.${dateTo})`
          );
        }

        const { data: parentEntries } = await splitQuery;

        const splitAmountMap = new Map<string, number>();
        splits?.forEach(s => {
          splitAmountMap.set(s.parent_entry_id, Number(s.amount));
        });

        splitEntries = (parentEntries || []).map(e => ({
          ...e,
          amount: splitAmountMap.get(e.id) || e.amount,
          description: `${e.description} (rateio)`,
        }));
      }

      // Merge direct + split entries, avoiding duplicates
      const directIds = new Set((directEntries || []).map(e => e.id));
      const merged = [
        ...(directEntries || []),
        ...splitEntries.filter(e => !directIds.has(e.id)),
      ];

      // 3) Fetch order linkage from fin_payables and fin_receivables
      const allIds = merged.map(e => e.id);
      if (allIds.length === 0) return merged as any[];

      const [{ data: payableLinks }, { data: receivableLinks }] = await Promise.all([
        supabase
          .from("fin_payables")
          .select("ledger_entry_id, order_id")
          .in("ledger_entry_id", allIds)
          .not("order_id", "is", null),
        supabase
          .from("fin_receivables")
          .select("ledger_entry_id, order_id")
          .in("ledger_entry_id", allIds)
          .not("order_id", "is", null),
      ]);

      const orderMap = new Map<string, string>();
      [...(payableLinks || []), ...(receivableLinks || [])].forEach(link => {
        if (link.ledger_entry_id && link.order_id) {
          orderMap.set(link.ledger_entry_id, link.order_id);
        }
      });

      // Fetch order numbers
      const uniqueOrderIds = [...new Set(orderMap.values())];
      let orderNumberMap = new Map<string, string>();
      if (uniqueOrderIds.length > 0) {
        const { data: orders } = await supabase
          .from("orders")
          .select("id, order_number")
          .in("id", uniqueOrderIds);
        orders?.forEach(o => {
          orderNumberMap.set(o.id, String(o.order_number));
        });
      }

      // Attach order info to entries
      return merged.map(e => ({
        ...e,
        _order_id: orderMap.get(e.id) || null,
        _order_number: orderMap.has(e.id) ? orderNumberMap.get(orderMap.get(e.id)!) || null : null,
      })) as any[];
    },
  });

  const totalAmount =
    entries?.reduce((sum, e) => {
      const amt = Math.abs(Number(e.amount) || 0);
      return sum + (e.type === "DESPESA" ? -amt : amt);
    }, 0) || 0;

  const selectedAmount =
    entries
      ?.filter((e) => selectedIds.has(e.id))
      .reduce((sum, e) => {
        const amt = Math.abs(Number(e.amount) || 0);
        return sum + (e.type === "DESPESA" ? -amt : amt);
      }, 0) || 0;

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

  const titleMap = {
    receitas: `Receitas — ${filter.costCenterName}`,
    despesas: `Despesas — ${filter.costCenterName}`,
    resultado: `Resultado — ${filter.costCenterName}`,
  };

  const iconMap = {
    receitas: <ArrowUpCircle className="h-5 w-5 text-green-500" />,
    despesas: <ArrowDownCircle className="h-5 w-5 text-red-500" />,
    resultado: <DollarSign className="h-5 w-5 text-primary" />,
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {iconMap[filter.type]}
              {titleMap[filter.type]}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Detalhamento dos lançamentos por centro de custo
            </DialogDescription>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {entries?.length || 0} lançamento{(entries?.length || 0) !== 1 ? "s" : ""} — Total:{" "}
                {filter.type === "resultado"
                  ? formatCurrency(totalAmount)
                  : formatCurrency(entries?.reduce((s, e) => s + Math.abs(Number(e.amount) || 0), 0) || 0)}
              </span>
            </div>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 mt-1">
                <span className="text-sm font-medium text-primary">
                  {selectedIds.size} selecionado{selectedIds.size !== 1 ? "s" : ""}
                </span>
                <span className="text-sm text-primary/80">—</span>
                <span className="text-sm font-semibold text-primary">
                  {formatCurrency(
                    filter.type === "resultado"
                      ? selectedAmount
                      : entries
                          ?.filter((e) => selectedIds.has(e.id))
                          .reduce((s, e) => s + Math.abs(Number(e.amount) || 0), 0) || 0
                  )}
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
                <div className="grid grid-cols-[32px_1fr_120px_100px_80px_32px] gap-2 px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={selectedIds.size === entries.length && entries.length > 0}
                      onCheckedChange={toggleAll}
                      className="h-3.5 w-3.5"
                    />
                  </div>
                  <span>Descrição</span>
                  <span className="text-right">Valor</span>
                  <span className="text-center">Data</span>
                  <span className="text-center">Tipo</span>
                  <span />
                </div>
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => toggleSelect(entry.id)}
                    className={cn(
                      "grid grid-cols-[32px_1fr_120px_100px_80px_32px] gap-2 px-2 py-2 text-sm rounded cursor-pointer transition-colors border-b border-border/50 last:border-0",
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
                      {entry.chart_account && (
                        <span className="text-[10px] text-muted-foreground block">
                          {entry.chart_account.code} - {entry.chart_account.name}
                        </span>
                      )}
                      {entry._order_number && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 mt-0.5 text-primary border-primary/30">
                          Pedido #{entry._order_number}
                        </Badge>
                      )}
                    </div>
                    <span
                      className={cn(
                        "font-mono text-right",
                        entry.type === "RECEITA" ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {entry.type === "RECEITA" ? "+" : "-"}
                      {formatCurrency(Math.abs(Number(entry.amount) || 0))}
                    </span>
                    <span className="text-center text-muted-foreground">
                      {format(new Date(entry.competence_date + "T12:00:00"), "dd/MM/yyyy")}
                    </span>
                    <div className="flex justify-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          entry.type === "RECEITA" ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {entry.type === "RECEITA" ? "Receita" : "Despesa"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-center">
                      {entry._order_id ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrderId(entry._order_id);
                              }}
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-primary" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">Ver Pedido #{entry._order_number}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="h-6 w-6 flex items-center justify-center text-muted-foreground/40">
                              <ExternalLink className="h-3 w-3" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="left">Lançamento manual</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {selectedOrderId && (
        <OrderDetailSheet
          orderId={selectedOrderId}
          open={!!selectedOrderId}
          onOpenChange={(open) => !open && setSelectedOrderId(null)}
          onUpdate={() => {}}
        />
      )}
    </>
  );
}
