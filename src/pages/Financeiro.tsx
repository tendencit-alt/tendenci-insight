import { useState } from "react";
import { useFinanceiroRealtime } from "@/hooks/useFinanceiroRealtime";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinanceiroFilters, FinanceiroFiltersState } from "@/components/financeiro/FinanceiroFilters";
import { PayablesReceivablesTab } from "@/components/financeiro/PayablesReceivablesTab";
import { LedgerReconciliationTab } from "@/components/financeiro/LedgerReconciliationTab";
import { OrphanEntriesAlert } from "@/components/financeiro/OrphanEntriesAlert";
import { TreasuryTab } from "@/components/financeiro/TreasuryTab";
import { CashflowTab } from "@/components/financeiro/CashflowTab";
import { DRETab } from "@/components/financeiro/DRETab";
import { FinancialResultTab } from "@/components/financeiro/FinancialResultTab";
import { CapitalFinancingTab } from "@/components/financeiro/CapitalFinancingTab";
import { useSearchParams } from "react-router-dom";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Landmark,
  GitCompare,
  TrendingUp,
  BarChart2,
  DollarSign,
  Banknote,
} from "lucide-react";

export default function Financeiro() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "receivables";

  useFinanceiroRealtime();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [filters, setFilters] = useState<FinanceiroFiltersState>({
    dateFrom: null,
    dateTo: null,
    bankAccountId: null,
    costCenterId: null,
    projectId: null,
    search: "",
    categoryId: null,
    subcategoryId: null,
    sortField: null,
    sortDirection: null,
    clientId: null,
    vendedorId: null,
    orderId: null,
  });

  const tabClass = "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm";

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground text-sm">
            Gestão financeira completa: obrigações, tesouraria, resultado e capital
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="w-full rounded-xl bg-card border border-border p-1.5 overflow-x-auto">
            <TabsList className="flex h-auto justify-start gap-1 rounded-none bg-transparent p-0 min-w-max">
              <TabsTrigger value="receivables" className={tabClass}>
                <ArrowUpCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="whitespace-nowrap">Contas a Receber</span>
              </TabsTrigger>
              <TabsTrigger value="payables" className={tabClass}>
                <ArrowDownCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="whitespace-nowrap">Contas a Pagar</span>
              </TabsTrigger>
              <TabsTrigger value="treasury" className={tabClass}>
                <Landmark className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="whitespace-nowrap">Tesouraria</span>
              </TabsTrigger>
              <TabsTrigger value="reconciliation" className={tabClass}>
                <GitCompare className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="whitespace-nowrap">Conciliação</span>
              </TabsTrigger>
              <TabsTrigger value="cashflow" className={tabClass}>
                <TrendingUp className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="whitespace-nowrap">Fluxo de Caixa</span>
              </TabsTrigger>
              <TabsTrigger value="dre" className={tabClass}>
                <BarChart2 className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="whitespace-nowrap">DRE Gerencial</span>
              </TabsTrigger>
              <TabsTrigger value="financial-result" className={tabClass}>
                <DollarSign className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="whitespace-nowrap">Resultado Financeiro</span>
              </TabsTrigger>
              <TabsTrigger value="capital" className={tabClass}>
                <Banknote className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="whitespace-nowrap">Capital</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <FinanceiroFilters filters={filters} onChange={setFilters} />
          <OrphanEntriesAlert />

          {/* Contas a Receber + Contas a Pagar: reusa o componente unificado com filtro de tipo */}
          <TabsContent value="receivables" forceMount className={activeTab === "receivables" ? "space-y-4" : "hidden"}>
            <PayablesReceivablesTab filters={filters} />
          </TabsContent>

          <TabsContent value="payables" forceMount className={activeTab === "payables" ? "space-y-4" : "hidden"}>
            <PayablesReceivablesTab filters={filters} />
          </TabsContent>

          <TabsContent value="treasury" forceMount className={activeTab === "treasury" ? "space-y-4" : "hidden"}>
            <TreasuryTab filters={filters} />
          </TabsContent>

          <TabsContent value="reconciliation" forceMount className={activeTab === "reconciliation" ? "space-y-4" : "hidden"}>
            <LedgerReconciliationTab filters={filters} />
          </TabsContent>

          <TabsContent value="cashflow" forceMount className={activeTab === "cashflow" ? "space-y-4" : "hidden"}>
            <CashflowTab filters={filters} onFiltersChange={setFilters} />
          </TabsContent>

          <TabsContent value="dre" forceMount className={activeTab === "dre" ? "space-y-4" : "hidden"}>
            <DRETab filters={filters} onFiltersChange={setFilters} />
          </TabsContent>

          <TabsContent value="financial-result" forceMount className={activeTab === "financial-result" ? "space-y-4" : "hidden"}>
            <FinancialResultTab filters={filters} />
          </TabsContent>

          <TabsContent value="capital" forceMount className={activeTab === "capital" ? "space-y-4" : "hidden"}>
            <CapitalFinancingTab filters={filters} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
