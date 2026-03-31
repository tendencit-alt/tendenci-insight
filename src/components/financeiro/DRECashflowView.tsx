import { useState } from "react";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { DRETab } from "./DRETab";
import { CashflowTab } from "./CashflowTab";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Columns } from "lucide-react";
import { cn } from "@/lib/utils";

interface DRECashflowViewProps {
  filters: FinanceiroFiltersState;
  onFiltersChange: (filters: FinanceiroFiltersState) => void;
}

type ViewMode = "both" | "dre" | "cashflow";

export function DRECashflowView({ filters, onFiltersChange }: DRECashflowViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("both");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Visualização:</span>
          <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
            <Button
              variant={viewMode === "both" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("both")}
              className="gap-2"
            >
              <Columns className="h-4 w-4" />
              <span className="hidden sm:inline">Lado a lado</span>
            </Button>
            <Button
              variant={viewMode === "dre" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("dre")}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Apenas DRE</span>
            </Button>
            <Button
              variant={viewMode === "cashflow" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("cashflow")}
              className="gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Apenas Fluxo</span>
            </Button>
          </div>
        </div>

        {viewMode === "both" && (
          <span className="text-xs text-muted-foreground">
            Exibição lado a lado no desktop e empilhada no mobile.
          </span>
        )}
      </div>

      {viewMode === "both" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className={cn("min-w-0 rounded-lg border bg-background p-4") }>
            <DRETab filters={filters} onFiltersChange={onFiltersChange} />
          </div>
          <div className={cn("min-w-0 rounded-lg border bg-background p-4") }>
            <CashflowTab filters={filters} onFiltersChange={onFiltersChange} />
          </div>
        </div>
      ) : viewMode === "dre" ? (
        <DRETab filters={filters} onFiltersChange={onFiltersChange} />
      ) : (
        <CashflowTab filters={filters} onFiltersChange={onFiltersChange} />
      )}
    </div>
  );
}
