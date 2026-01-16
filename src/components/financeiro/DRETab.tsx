import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BarChart3, Download } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DRETabProps {
  filters: FinanceiroFiltersState;
}

export function DRETab({ filters }: DRETabProps) {
  const dateField = filters.regime === "CAIXA" ? "cash_date" : "competence_date";

  const { data: dreData, isLoading } = useQuery({
    queryKey: ["fin-dre", filters],
    queryFn: async () => {
      const dateFrom = format(filters.dateFrom, "yyyy-MM-dd");
      const dateTo = format(filters.dateTo, "yyyy-MM-dd");

      // Get chart accounts with DRE structure
      const { data: chartAccounts } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name, nature, parent_id, dre_order")
        .eq("in_dre", true)
        .eq("active", true)
        .order("dre_order");

      // Get ledger entries
      let query = supabase
        .from("fin_ledger_entries")
        .select("chart_account_id, amount, type")
        .neq("status", "CANCELADO")
        .gte(dateField, dateFrom)
        .lte(dateField, dateTo)
        .not(dateField, "is", null);

      if (filters.costCenterId) {
        query = query.eq("cost_center_id", filters.costCenterId);
      }
      if (filters.projectId) {
        query = query.eq("project_id", filters.projectId);
      }

      const { data: entries } = await query;

      // Calculate values for each account
      const accountValues = new Map<string, number>();
      entries?.forEach((entry) => {
        if (entry.chart_account_id) {
          const current = accountValues.get(entry.chart_account_id) || 0;
          accountValues.set(entry.chart_account_id, current + Number(entry.amount));
        }
      });

      // Build DRE structure
      const dreLines: any[] = [];
      let receitaBruta = 0;
      let deducoes = 0;
      let cmv = 0;
      let despesasOperacionais = 0;
      let resultadoFinanceiro = 0;

      chartAccounts?.forEach((account) => {
        const value = accountValues.get(account.id) || 0;
        const isParent = !account.parent_id;

        // Categorize by code prefix
        if (account.code.startsWith("1")) {
          receitaBruta += value;
        } else if (account.code.startsWith("2")) {
          deducoes += value;
        } else if (account.code.startsWith("3")) {
          cmv += value;
        } else if (account.code.startsWith("4")) {
          despesasOperacionais += value;
        } else if (account.code.startsWith("5")) {
          if (account.nature === "RECEITA") {
            resultadoFinanceiro += value;
          } else {
            resultadoFinanceiro -= value;
          }
        }

        dreLines.push({
          id: account.id,
          code: account.code,
          name: account.name,
          nature: account.nature,
          value,
          isParent,
          level: account.parent_id ? 1 : 0,
        });
      });

      const receitaLiquida = receitaBruta - deducoes;
      const lucroBruto = receitaLiquida - cmv;
      const lucroOperacional = lucroBruto - despesasOperacionais;
      const lucroLiquido = lucroOperacional + resultadoFinanceiro;

      return {
        lines: dreLines,
        summary: {
          receitaBruta,
          deducoes,
          receitaLiquida,
          cmv,
          lucroBruto,
          despesasOperacionais,
          lucroOperacional,
          resultadoFinanceiro,
          lucroLiquido,
        },
      };
    },
  });

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  const summary = dreData?.summary;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Demonstração do Resultado do Exercício (DRE)
          </h2>
          <p className="text-sm text-muted-foreground">
            {filters.regime === "CAIXA" ? "Regime de Caixa" : "Regime de Competência"}
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60%]">Conta</TableHead>
                <TableHead className="text-right">Realizado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* RECEITA BRUTA */}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell>RECEITA BRUTA</TableCell>
                <TableCell className="text-right text-green-600">{formatCurrency(summary?.receitaBruta || 0)}</TableCell>
              </TableRow>
              {dreData?.lines.filter((l) => l.code.startsWith("1.")).map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="pl-8 text-sm">{line.code} - {line.name}</TableCell>
                  <TableCell className="text-right text-sm">{formatCurrency(line.value)}</TableCell>
                </TableRow>
              ))}

              {/* DEDUÇÕES */}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell>(-) DEDUÇÕES</TableCell>
                <TableCell className="text-right text-red-600">({formatCurrency(summary?.deducoes || 0)})</TableCell>
              </TableRow>
              {dreData?.lines.filter((l) => l.code.startsWith("2.")).map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="pl-8 text-sm">{line.code} - {line.name}</TableCell>
                  <TableCell className="text-right text-sm">({formatCurrency(line.value)})</TableCell>
                </TableRow>
              ))}

              {/* RECEITA LÍQUIDA */}
              <TableRow className="bg-primary/10 font-bold">
                <TableCell>= RECEITA LÍQUIDA</TableCell>
                <TableCell className={cn("text-right", (summary?.receitaLiquida || 0) >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatCurrency(summary?.receitaLiquida || 0)}
                </TableCell>
              </TableRow>

              {/* CMV/CPV */}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell>(-) CUSTOS (CMV/CPV)</TableCell>
                <TableCell className="text-right text-red-600">({formatCurrency(summary?.cmv || 0)})</TableCell>
              </TableRow>
              {dreData?.lines.filter((l) => l.code.startsWith("3.")).map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="pl-8 text-sm">{line.code} - {line.name}</TableCell>
                  <TableCell className="text-right text-sm">({formatCurrency(line.value)})</TableCell>
                </TableRow>
              ))}

              {/* LUCRO BRUTO */}
              <TableRow className="bg-primary/10 font-bold">
                <TableCell>= LUCRO BRUTO</TableCell>
                <TableCell className={cn("text-right", (summary?.lucroBruto || 0) >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatCurrency(summary?.lucroBruto || 0)}
                </TableCell>
              </TableRow>

              {/* DESPESAS OPERACIONAIS */}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell>(-) DESPESAS OPERACIONAIS</TableCell>
                <TableCell className="text-right text-red-600">({formatCurrency(summary?.despesasOperacionais || 0)})</TableCell>
              </TableRow>
              {dreData?.lines.filter((l) => l.code.startsWith("4.")).map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="pl-8 text-sm">{line.code} - {line.name}</TableCell>
                  <TableCell className="text-right text-sm">({formatCurrency(line.value)})</TableCell>
                </TableRow>
              ))}

              {/* LUCRO OPERACIONAL */}
              <TableRow className="bg-primary/10 font-bold">
                <TableCell>= LUCRO OPERACIONAL</TableCell>
                <TableCell className={cn("text-right", (summary?.lucroOperacional || 0) >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatCurrency(summary?.lucroOperacional || 0)}
                </TableCell>
              </TableRow>

              {/* RESULTADO FINANCEIRO */}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell>(+/-) RESULTADO FINANCEIRO</TableCell>
                <TableCell className={cn("text-right", (summary?.resultadoFinanceiro || 0) >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatCurrency(summary?.resultadoFinanceiro || 0)}
                </TableCell>
              </TableRow>
              {dreData?.lines.filter((l) => l.code.startsWith("5.")).map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="pl-8 text-sm">{line.code} - {line.name}</TableCell>
                  <TableCell className={cn("text-right text-sm", line.nature === "RECEITA" ? "text-green-600" : "text-red-600")}>
                    {line.nature === "RECEITA" ? "" : "-"}{formatCurrency(line.value)}
                  </TableCell>
                </TableRow>
              ))}

              {/* LUCRO LÍQUIDO */}
              <TableRow className="bg-primary/20 font-bold text-lg">
                <TableCell>= LUCRO LÍQUIDO</TableCell>
                <TableCell className={cn("text-right", (summary?.lucroLiquido || 0) >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatCurrency(summary?.lucroLiquido || 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
