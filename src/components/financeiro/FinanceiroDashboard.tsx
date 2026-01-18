import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { DashboardBI } from "./DashboardBI";

interface FinanceiroDashboardProps {
  filters: FinanceiroFiltersState;
}

export function FinanceiroDashboard({ filters }: FinanceiroDashboardProps) {
  return <DashboardBI filters={filters} />;
}
