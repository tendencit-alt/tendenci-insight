import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, X } from "lucide-react";
import { KPIRenderer } from "./KPIRenderer";
import { DashboardFiltersData } from "./DashboardFilters";

interface WidgetData {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kpi_id: string;
  type: "card" | "graph" | "table";
  config?: any;
}

interface DashboardWidgetProps {
  widget: WidgetData;
  filters?: DashboardFiltersData;
  onRemove: () => void;
  isViewMode?: boolean;
}

export function DashboardWidget({ widget, filters, onRemove, isViewMode = false }: DashboardWidgetProps) {
  return (
    <Card className="h-full flex flex-col border-0 bg-transparent shadow-none">
      <CardHeader className={`p-4 flex-row items-center justify-between space-y-0 ${!isViewMode ? 'drag-handle cursor-move border-b border-border/50' : 'border-b border-border/30'}`}>
        <div className="flex items-center gap-3">
          {!isViewMode && (
            <div className="p-1.5 rounded-md bg-muted/50 hover:bg-muted transition-colors">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <CardTitle className="text-base font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {widget.kpi_id.replace(/_/g, " ").toUpperCase()}
          </CardTitle>
        </div>
        {!isViewMode && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-auto">
        <KPIRenderer kpiId={widget.kpi_id} type={widget.type} config={widget.config} filters={filters} />
      </CardContent>
    </Card>
  );
}
