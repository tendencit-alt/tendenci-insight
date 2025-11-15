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
}

export function DashboardWidget({ widget, filters, onRemove }: DashboardWidgetProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="drag-handle cursor-move p-3 flex-row items-center justify-between space-y-0 border-b">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm">
            {widget.kpi_id.replace(/_/g, " ").toUpperCase()}
          </CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-auto">
        <KPIRenderer kpiId={widget.kpi_id} type={widget.type} config={widget.config} filters={filters} />
      </CardContent>
    </Card>
  );
}
