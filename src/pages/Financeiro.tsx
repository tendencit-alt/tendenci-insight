import { useState } from "react";
import { useFinanceiroRealtime } from "@/hooks/useFinanceiroRealtime";
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
  useFinanceiroRealtime();
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="w-full rounded-xl bg-card border border-border p-1.5 flex items-center gap-1">
            <TabsList className="flex h-auto justify-start gap-1 rounded-none bg-transparent p-0 flex-1">
              <TabsTrigger
                value="dashboard"
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm"
              >
                <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
                <span>BI/Dashboard</span>
              </TabsTrigger>
              <TabsTrigger
                value="dre-cashflow"
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm"
              >
                <BarChart3 className="h-4 w-4 flex-shrink-0" />
                <span>DRE / Fluxo de Caixa</span>
              </TabsTrigger>
              <TabsTrigger
                value="payables-receivables"
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm"
              >
                <Wallet className="h-4 w-4 flex-shrink-0" />
                <span>Contas a Pagar/Receber</span>
              </TabsTrigger>
              <TabsTrigger
                value="ledger-reconciliation"
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm"
              >
                <BookOpen className="h-4 w-4 flex-shrink-0" />
                <span>Lançamentos & Conciliação</span>
              </TabsTrigger>
              <TabsTrigger
                value="purchases"
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm"
              >
                <ShoppingCart className="h-4 w-4 flex-shrink-0" />
                <span>Compras</span>
              </TabsTrigger>
            </TabsList>
            <button
              onClick={() => navigate("/cadastros-financeiros")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <Database className="h-4 w-4" />
              <span>Cadastros</span>
            </button>
          </div>

          {/* Filtros */}
          <FinanceiroFilters filters={filters} onChange={setFilters} />

          {/* Orphan Entries Alert */}
          <OrphanEntriesAlert />

          {/* Global Pending Alerts */}
          <PendingAlertsCard />

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
