import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinanceiroFilters, FinanceiroFiltersState } from "@/components/financeiro/FinanceiroFilters";
import { FinanceiroDashboard } from "@/components/financeiro/FinanceiroDashboard";
import { PayablesReceivablesTab } from "@/components/financeiro/PayablesReceivablesTab";
import { LedgerReconciliationTab } from "@/components/financeiro/LedgerReconciliationTab";
import { DRECashflowView } from "@/components/financeiro/DRECashflowView";
import { MastersTab } from "@/components/financeiro/MastersTab";
import { PendingAlertsCard } from "@/components/financeiro/PendingAlertsCard";
import { OrphanEntriesAlert } from "@/components/financeiro/OrphanEntriesAlert";
import {
  LayoutDashboard, 
  Wallet, 
  BookOpen, 
  BarChart3, 
  Settings2 
} from "lucide-react";

export default function Financeiro() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filters, setFilters] = useState<FinanceiroFiltersState>({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    dateTo: new Date(),
    bankAccountId: null,
    costCenterId: null,
    projectId: null,
    search: "",
  });

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Financeiro</h1>
            <p className="text-muted-foreground text-sm">
              Gestão financeira completa: caixa, contas a pagar/receber, DRE e conciliação
            </p>
          </div>
          <FinanceiroFilters filters={filters} onChange={setFilters} />
        </div>

        {/* Orphan Entries Alert - Shows when ledger entries are not synced */}
        <OrphanEntriesAlert />

        {/* Global Pending Alerts */}
        <PendingAlertsCard />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="w-full">
            <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1 bg-muted/50 p-1.5">
              <TabsTrigger value="dashboard" className="flex items-center gap-1.5 px-3 py-2 text-sm">
                <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
                <span>Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="dre-cashflow" className="flex items-center gap-1.5 px-3 py-2 text-sm">
                <BarChart3 className="h-4 w-4 flex-shrink-0" />
                <span>DRE / Fluxo de Caixa</span>
              </TabsTrigger>
              <TabsTrigger value="payables-receivables" className="flex items-center gap-1.5 px-3 py-2 text-sm">
                <Wallet className="h-4 w-4 flex-shrink-0" />
                <span>Contas a Pagar/Receber</span>
              </TabsTrigger>
              <TabsTrigger value="ledger-reconciliation" className="flex items-center gap-1.5 px-3 py-2 text-sm">
                <BookOpen className="h-4 w-4 flex-shrink-0" />
                <span>Lançamentos & Conciliação</span>
              </TabsTrigger>
              <TabsTrigger value="masters" className="flex items-center gap-1.5 px-3 py-2 text-sm">
                <Settings2 className="h-4 w-4 flex-shrink-0" />
                <span>Cadastros</span>
              </TabsTrigger>
            </TabsList>
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

          <TabsContent value="masters" className="space-y-4">
            <MastersTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
