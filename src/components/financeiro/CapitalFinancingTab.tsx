import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Banknote, TrendingDown, TrendingUp, DollarSign } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface CapitalFinancingTabProps {
  filters: FinanceiroFiltersState;
}

export function CapitalFinancingTab({ filters }: CapitalFinancingTabProps) {
  const dateFrom = filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : format(startOfMonth(new Date()), "yyyy-MM-dd");
  const dateTo = filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : format(endOfMonth(new Date()), "yyyy-MM-dd");

  // Buscar lançamentos da raiz 6 (Capital e Financiamentos)
  const { data: entries, isLoading } = useQuery({
    queryKey: ["fin-capital-entries", dateFrom, dateTo],
    queryFn: async () => {
      const { data: root6 } = await supabase
        .from("fin_chart_accounts")
        .select("id")
        .eq("code", "6")
        .single();

      if (!root6) return [];

      const { data: accounts } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name, nature")
        .or(`id.eq.${root6.id},parent_id.eq.${root6.id}`);

      if (!accounts) return [];
      const accountIds = accounts.map(a => a.id);

      const { data: subAccounts } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name, nature, parent_id")
        .in("parent_id", accountIds);

      const allAccounts = [...accounts, ...(subAccounts || [])];
      const allIds = allAccounts.map(a => a.id);

      const { data, error } = await supabase
        .from("fin_ledger_entries")
        .select("id, description, amount, type, competence_date, cash_date, status, chart_account_id")
        .in("chart_account_id", allIds)
        .gte("competence_date", dateFrom)
        .lte("competence_date", dateTo)
        .order("competence_date", { ascending: false });

      if (error) throw error;

      return (data || []).map(e => ({
        ...e,
        accountName: allAccounts.find(a => a.id === e.chart_account_id)?.name || "",
        accountCode: allAccounts.find(a => a.id === e.chart_account_id)?.code || "",
      }));
    },
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const totals = useMemo(() => {
    if (!entries) return { inflows: 0, outflows: 0, net: 0 };
    const inflows = entries.filter(e => e.type === "RECEITA").reduce((s, e) => s + Math.abs(e.amount || 0), 0);
    const outflows = entries.filter(e => e.type === "DESPESA").reduce((s, e) => s + Math.abs(e.amount || 0), 0);
    return { inflows, outflows, net: inflows - outflows };
  }, [entries]);

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Captações</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(totals.inflows)}</p>
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
                <p className="text-xs text-muted-foreground">Amortizações</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(totals.outflows)}</p>
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
                <p className="text-xs text-muted-foreground">Saldo Período</p>
                <p className={`text-lg font-bold ${totals.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatCurrency(totals.net)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Banknote className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Financiamentos</p>
                <Badge variant="outline" className="text-xs">Raiz 6</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Movimentações de Capital no Período</CardTitle>
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
                    Nenhuma movimentação de capital no período
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Principal impacta Fluxo de Caixa. Juros impactam Resultado Financeiro na DRE. Financiamentos não alteram EBITDA.
      </p>
    </div>
  );
}
