import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinanceiroFilters, FinanceiroFiltersState } from "@/components/financeiro/FinanceiroFilters";
import { FinanceiroDashboard } from "@/components/financeiro/FinanceiroDashboard";
import { PayablesReceivablesTab } from "@/components/financeiro/PayablesReceivablesTab";
import { LedgerReconciliationTab } from "@/components/financeiro/LedgerReconciliationTab";
import { DRECashflowView } from "@/components/financeiro/DRECashflowView";
import { PendingAlertsCard } from "@/components/financeiro/PendingAlertsCard";
import { OrphanEntriesAlert } from "@/components/financeiro/OrphanEntriesAlert";
import { PurchasesTab } from "@/components/financeiro/PurchasesTab";

import {
  LayoutDashboard, 
  Wallet, 
  BookOpen, 
  BarChart3, 
  ShoppingCart,
  Database
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Financeiro() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filters, setFilters] = useState<FinanceiroFiltersState>({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    dateTo: new Date(),
    bankAccountId: null,
    costCenterId: null,
    projectId: null,
    search: "",
    categoryId: null,
    subcategoryId: null,
    sortField: null,
    sortDirection: null,
  });

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <div>
            <h1 className="text-2xl font-bold">Financeiro</h1>
            <p className="text-muted-foreground text-sm">
              Gestão financeira completa: caixa, contas a pagar/receber, DRE e conciliação
            </p>
          </div>
        </div>

        {/* Filtros sempre visíveis */}
        <FinanceiroFilters filters={filters} onChange={setFilters} />

        {/* Orphan Entries Alert - Shows when ledger entries are not synced */}
        <OrphanEntriesAlert />

        {/* Global Pending Alerts */}
        <PendingAlertsCard />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="w-full border-b border-border flex items-center justify-between">
            <TabsList className="flex h-12 justify-start gap-0 rounded-none bg-transparent p-0">
              <TabsTrigger
                value="dashboard"
                className="relative flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent"
              >
                <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
                <span>BI/Dashboard</span>
              </TabsTrigger>
              <TabsTrigger
                value="dre-cashflow"
                className="relative flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent"
              >
                <BarChart3 className="h-4 w-4 flex-shrink-0" />
                <span>DRE / Fluxo de Caixa</span>
              </TabsTrigger>
              <TabsTrigger
                value="payables-receivables"
                className="relative flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent"
              >
                <Wallet className="h-4 w-4 flex-shrink-0" />
                <span>Contas a Pagar/Receber</span>
              </TabsTrigger>
              <TabsTrigger
                value="ledger-reconciliation"
                className="relative flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent"
              >
                <BookOpen className="h-4 w-4 flex-shrink-0" />
                <span>Lançamentos & Conciliação</span>
              </TabsTrigger>
              <TabsTrigger
                value="purchases"
                className="relative flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent"
              >
                <ShoppingCart className="h-4 w-4 flex-shrink-0" />
                <span>Compras</span>
              </TabsTrigger>
            </TabsList>
            <button
              onClick={() => navigate("/cadastros-financeiros")}
              className="flex items-center gap-2 px-4 py-2 mr-2 rounded-lg bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition-colors border border-primary/20"
            >
              <Database className="h-4 w-4" />
              <span>Cadastros Financeiros</span>
            </button>
          </div>

          <TabsContent value="dashboard" className="space-y-4">
            <FinanceiroDashboard filters={filters} />
          </TabsContent>

          <TabsContent value="dre-cashflow" className="space-y-4">
            <DRECashflowView filters={filters} onFiltersChange={setFilters} />
          </TabsContent>

          <TabsContent value="payables-receivables" className="space-y-4">
            <PayablesReceivablesTab filters={filters} />
          </TabsContent>

          <TabsContent value="ledger-reconciliation" className="space-y-4">
            <LedgerReconciliationTab filters={filters} />
          </TabsContent>

          <TabsContent value="purchases" className="space-y-4">
            <PurchasesTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
