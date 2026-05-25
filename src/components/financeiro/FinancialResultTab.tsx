import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useActiveTenant } from "@/hooks/useActiveTenant";

interface FinancialResultTabProps {
  filters: FinanceiroFiltersState;
}

export function FinancialResultTab({ filters }: FinancialResultTabProps) {
  const dateFrom = filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : format(startOfMonth(new Date()), "yyyy-MM-dd");
  const dateTo = filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : format(endOfMonth(new Date()), "yyyy-MM-dd");
  const { activeTenantId } = useActiveTenant();

  // Buscar lançamentos da raiz 5 (Resultado Financeiro)
  const { data: entries, isLoading } = useQuery({
    queryKey: ["fin-result-entries", dateFrom, dateTo, filters.costCenterId, activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      // Buscar contas da raiz 5
      const { data: root5 } = await supabase
        .from("fin_chart_accounts")
        .select("id")
        .eq("code", "5")
        .maybeSingle();

      if (!root5) return [];

      const { data: accounts } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name, nature")
        .eq("tenant_id", activeTenantId!)
        .or(`id.eq.${root5.id},parent_id.eq.${root5.id}`);

      if (!accounts) return [];
      const accountIds = accounts.map(a => a.id);

      let query = supabase
        .from("fin_ledger_entries")
        .select("id, description, amount, type, competence_date, cash_date, status, chart_account_id")
        .eq("tenant_id", activeTenantId!)
        .in("chart_account_id", accountIds)
        .gte("competence_date", dateFrom)
        .lte("competence_date", dateTo)
        .order("competence_date", { ascending: false });

      if (filters.costCenterId) {
        query = query.eq("cost_center_id", filters.costCenterId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(e => ({
        ...e,
        accountName: accounts.find(a => a.id === e.chart_account_id)?.name || "",
        accountCode: accounts.find(a => a.id === e.chart_account_id)?.code || "",
      }));
    },
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const totals = useMemo(() => {
    if (!entries) return { received: 0, paid: 0, net: 0 };
    const received = entries.filter(e => e.type === "RECEITA").reduce((s, e) => s + Math.abs(e.amount || 0), 0);
    const paid = entries.filter(e => e.type === "DESPESA").reduce((s, e) => s + Math.abs(e.amount || 0), 0);
    return { received, paid, net: received - paid };
  }, [entries]);

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Receitas Financeiras</p>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(totals.received)}</p>
                <p className="text-[10px] text-muted-foreground">Juros, rendimentos, multas recebidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Despesas Financeiras</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totals.paid)}</p>
                <p className="text-[10px] text-muted-foreground">Juros, IOF, encargos, multas pagas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Resultado Financeiro</p>
                <p className={`text-xl font-bold ${totals.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatCurrency(totals.net)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Detalhamento do Resultado Financeiro</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries?.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {entry.competence_date ? format(new Date(entry.competence_date), "dd/MM/yy") : "-"}
                  </TableCell>
                  <TableCell className="text-sm">{entry.description || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{entry.accountCode} - {entry.accountName}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.status === "PAGO_RECEBIDO" ? "default" : "secondary"} className="text-[10px]">
                      {entry.status === "PAGO_RECEBIDO" ? "Realizado" : entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-mono text-sm ${entry.type === "RECEITA" ? "text-emerald-600" : "text-red-600"}`}>
                    {entry.type === "RECEITA" ? "+" : "-"}{formatCurrency(Math.abs(entry.amount || 0))}
                  </TableCell>
                </TableRow>
              ))}
              {(!entries || entries.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum lançamento financeiro no período
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Consolida juros, IOF, encargos, multas e rendimentos financeiros. Impacta DRE após EBITDA — não altera resultado operacional.
      </p>
    </div>
  );
}
