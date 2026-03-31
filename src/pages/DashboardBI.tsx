import { useState } from "react";
import { useFinanceiroRealtime } from "@/hooks/useFinanceiroRealtime";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FinanceiroFilters, FinanceiroFiltersState } from "@/components/financeiro/FinanceiroFilters";
import { DashboardBI as DashboardBIComponent } from "@/components/financeiro/DashboardBI";
import { LayoutDashboard } from "lucide-react";

export default function DashboardBI() {
  useFinanceiroRealtime();
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

        {/* Filtros */}
        <FinanceiroFilters filters={filters} onChange={setFilters} />

        {/* Dashboard BI */}
        <DashboardBIComponent filters={filters} />
      </div>
    </DashboardLayout>
  );
}
