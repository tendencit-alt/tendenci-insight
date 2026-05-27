import { useState } from "react";
import { useFinanceiroRealtime } from "@/hooks/useFinanceiroRealtime";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleShell } from "@/components/layout/ModuleShell";
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
import { RecurringContractsTab } from "@/components/financeiro/RecurringContractsTab";
import { GovernanceTab } from "@/components/financeiro/GovernanceTab";
import { RhPjPanel } from "@/pages/FinanceiroRhPj";
import { useCanViewHrPii } from "@/hooks/useRhPj";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";
import { Can } from "@/components/auth/Can";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Landmark,
  GitCompare,
  TrendingUp,
  BarChart2,
  DollarSign,
  Banknote,
  CalendarClock,
  ShieldCheck,
  Wallet,
  Users,
} from "lucide-react";

export default function Financeiro() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialTab = searchParams.get("tab") || "receivables";

  useFinanceiroRealtime();
  const { data: canRhPj } = useCanViewHrPii();
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
      <ModuleShell
        moduleKey="financeiro"
        title="Financeiro"
        description="Gestão financeira completa: obrigações, tesouraria, resultado e capital"
        icon={<Wallet className="h-5 w-5" />}
        headerActions={
          <div className="flex items-center gap-2">
            <Can module="financeiro" action="create">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Lançamento
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => setActiveTab("receivables")}>
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                  Conta a Receber
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("payables")}>
                  <ArrowDownCircle className="h-4 w-4 mr-2" />
                  Conta a Pagar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("treasury")}>
                  <Landmark className="h-4 w-4 mr-2" />
                  Movimento de Tesouraria
                </DropdownMenuItem>
              </DropdownMenuContent>
              </DropdownMenu>
            </Can>
          </div>
        }
        filters={<FinanceiroFilters filters={filters} onChange={setFilters} />}
        records={
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
                <TabsTrigger value="capital" className={tabClass}>
                  <Banknote className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="whitespace-nowrap">Capital</span>
                </TabsTrigger>
                <TabsTrigger value="recurring" className={tabClass}>
                  <CalendarClock className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="whitespace-nowrap">Recorrentes</span>
                </TabsTrigger>
                {canRhPj && (
                  <TabsTrigger value="rh-pj" className={tabClass}>
                    <Users className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="whitespace-nowrap">RH / PJ</span>
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <OrphanEntriesAlert />

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

            <TabsContent value="capital" forceMount className={activeTab === "capital" ? "space-y-4" : "hidden"}>
              <CapitalFinancingTab filters={filters} />
            </TabsContent>

            <TabsContent value="recurring" forceMount className={activeTab === "recurring" ? "space-y-4" : "hidden"}>
              <RecurringContractsTab filters={filters} />
            </TabsContent>

            {canRhPj && (
              <TabsContent value="rh-pj" forceMount className={activeTab === "rh-pj" ? "space-y-4" : "hidden"}>
                <RhPjPanel />
              </TabsContent>
            )}
          </Tabs>
        }
        settings={<GovernanceTab filters={filters} />}
        reports={
          <Tabs defaultValue="cashflow" className="space-y-4">
            <TabsList className="flex h-auto flex-wrap gap-1">
              <TabsTrigger value="cashflow" className="gap-1.5"><TrendingUp className="h-4 w-4" />Fluxo de Caixa</TabsTrigger>
              <TabsTrigger value="dre" className="gap-1.5"><BarChart2 className="h-4 w-4" />DRE Gerencial</TabsTrigger>
              <TabsTrigger value="financial-result" className="gap-1.5"><DollarSign className="h-4 w-4" />Resultado Financeiro</TabsTrigger>
            </TabsList>
            <TabsContent value="cashflow"><CashflowTab filters={filters} onFiltersChange={setFilters} /></TabsContent>
            <TabsContent value="dre"><DRETab filters={filters} onFiltersChange={setFilters} /></TabsContent>
            <TabsContent value="financial-result"><FinancialResultTab filters={filters} /></TabsContent>
          </Tabs>
        }
      />
    </DashboardLayout>
  );
}
