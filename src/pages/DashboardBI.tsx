import { useState } from "react";
import { useFinanceiroRealtime } from "@/hooks/useFinanceiroRealtime";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinanceiroFilters, FinanceiroFiltersState } from "@/components/financeiro/FinanceiroFilters";
import { DashboardBI as DashboardBIComponent } from "@/components/financeiro/DashboardBI";
import { DRECashflowView } from "@/components/financeiro/DRECashflowView";
import { PlanejamentoFinanceiro } from "@/components/financeiro/PlanejamentoFinanceiro";
import { LayoutDashboard, BarChart3, Target } from "lucide-react";

export default function DashboardBI() {
  useFinanceiroRealtime();
  const [activeTab, setActiveTab] = useState("bi-dashboard");
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

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">BI / Dashboard</h1>
              <p className="text-muted-foreground text-sm">
                Visão geral de métricas, KPIs e indicadores financeiros do sistema
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="w-full rounded-xl bg-card border border-border p-1.5 flex items-center gap-1">
            <TabsList className="flex h-auto justify-start gap-1 rounded-none bg-transparent p-0 flex-1">
              <TabsTrigger
                value="bi-dashboard"
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm"
              >
                <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
                <span>BI / Dashboard</span>
              </TabsTrigger>
              <TabsTrigger
                value="dre-cashflow"
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm"
              >
                <BarChart3 className="h-4 w-4 flex-shrink-0" />
                <span>DRE / Fluxo de Caixa</span>
              </TabsTrigger>
              <TabsTrigger
                value="planejamento"
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm"
              >
                <Target className="h-4 w-4 flex-shrink-0" />
                <span>Planejamento Financeiro</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Filtros */}
          <FinanceiroFilters filters={filters} onChange={setFilters} />

          <TabsContent value="bi-dashboard" forceMount className={activeTab === "bi-dashboard" ? "space-y-4" : "hidden"}>
            <DashboardBIComponent filters={filters} />
          </TabsContent>

          <TabsContent value="dre-cashflow" forceMount className={activeTab === "dre-cashflow" ? "space-y-4" : "hidden"}>
            <DRECashflowView filters={filters} onFiltersChange={setFilters} />
          </TabsContent>

          <TabsContent value="planejamento" forceMount className={activeTab === "planejamento" ? "space-y-4" : "hidden"}>
            <PlanejamentoFinanceiro filters={filters} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
