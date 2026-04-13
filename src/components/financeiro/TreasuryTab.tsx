import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Landmark, ArrowRightLeft, PiggyBank, TrendingUp, TrendingDown, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFinanceiroSync } from "@/hooks/useFinanceiroSync";

interface TreasuryTabProps {
  filters: FinanceiroFiltersState;
}

export function TreasuryTab({ filters }: TreasuryTabProps) {
  const { invalidateAll } = useFinanceiroSync();

  const { data: bankAccounts, isLoading } = useQuery({
    queryKey: ["fin-bank-accounts-treasury"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fin_bank_accounts")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const totalBalance = useMemo(() => {
    if (!bankAccounts) return 0;
    return bankAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  }, [bankAccounts]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Landmark className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo Total</p>
                <p className={`text-xl font-bold ${totalBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatCurrency(totalBalance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <PiggyBank className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contas Ativas</p>
                <p className="text-xl font-bold">{bankAccounts?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <ArrowRightLeft className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transferências</p>
                <Badge variant="outline" className="text-xs">Em breve</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contas bancárias */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Contas Bancárias</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => invalidateAll()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conta</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Saldo Atual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bankAccounts?.map((acc) => (
                <TableRow key={acc.id}>
                  <TableCell className="font-medium">{acc.name}</TableCell>
                  <TableCell className="text-muted-foreground">{acc.bank_name || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {acc.account_type || "corrente"}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-mono font-medium ${(acc.current_balance || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {formatCurrency(acc.current_balance || 0)}
                  </TableCell>
                </TableRow>
              ))}
              {(!bankAccounts || bankAccounts.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhuma conta bancária cadastrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Tesouraria controla contas, transferências e aplicações. Impacta apenas Fluxo de Caixa — não altera DRE.
      </p>
    </div>
  );
}
