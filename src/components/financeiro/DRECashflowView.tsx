import { useState } from "react";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { DRETab } from "./DRETab";
import { CashflowTab } from "./CashflowTab";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Columns, PanelLeft, PanelRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

interface DRECashflowViewProps {
  filters: FinanceiroFiltersState;
}

type ViewMode = "both" | "dre" | "cashflow";

export function DRECashflowView({ filters }: DRECashflowViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("both");

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Visualização:</span>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            <Button
              variant={viewMode === "both" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("both")}
              className="gap-2"
            >
              <Columns className="h-4 w-4" />
              <span className="hidden sm:inline">Lado a Lado</span>
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <PanelLeft className="h-4 w-4" />
            <span>Arraste o divisor para redimensionar</span>
            <PanelRight className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Content Area */}
      {viewMode === "both" ? (
        <ResizablePanelGroup
          direction="horizontal"
          className="min-h-[600px] rounded-lg border"
        >
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full overflow-auto p-4 bg-background">
              <DRETab filters={filters} />
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full overflow-auto p-4 bg-background">
              <CashflowTab filters={filters} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : viewMode === "dre" ? (
        <DRETab filters={filters} />
      ) : (
        <CashflowTab filters={filters} />
      )}
    </div>
  );
}
