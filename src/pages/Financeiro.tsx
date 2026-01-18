import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinanceiroFilters, FinanceiroFiltersState } from "@/components/financeiro/FinanceiroFilters";
import { IntegratedDashboardBI } from "@/components/financeiro/IntegratedDashboardBI";
import { PayablesReceivablesTab } from "@/components/financeiro/PayablesReceivablesTab";
import { LedgerTab } from "@/components/financeiro/LedgerTab";
import { ReconciliationTab } from "@/components/financeiro/ReconciliationTab";
import { MastersTab } from "@/components/financeiro/MastersTab";
import { 
  LayoutDashboard, 
  Wallet, 
  BookOpen, 
  RefreshCw, 
  Settings2 
} from "lucide-react";

export default function Financeiro() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filters, setFilters] = useState<FinanceiroFiltersState>({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    dateTo: new Date(),
    regime: "CAIXA",
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
              Gestão financeira completa: Dashboard + BI integrados, contas a pagar/receber e conciliação
            </p>
          </div>
          <FinanceiroFilters filters={filters} onChange={setFilters} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard + BI</span>
            </TabsTrigger>
            <TabsTrigger value="payables-receivables" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Contas a Pagar/Receber</span>
            </TabsTrigger>
            <TabsTrigger value="ledger" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Lançamentos</span>
            </TabsTrigger>
            <TabsTrigger value="reconciliation" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Conciliação</span>
            </TabsTrigger>
            <TabsTrigger value="masters" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Cadastros</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <IntegratedDashboardBI filters={filters} />
          </TabsContent>

          <TabsContent value="payables-receivables" className="space-y-4">
            <PayablesReceivablesTab filters={filters} />
          </TabsContent>

          <TabsContent value="ledger" className="space-y-4">
            <LedgerTab filters={filters} />
          </TabsContent>

          <TabsContent value="reconciliation" className="space-y-4">
            <ReconciliationTab filters={filters} />
          </TabsContent>

          <TabsContent value="masters" className="space-y-4">
            <MastersTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
