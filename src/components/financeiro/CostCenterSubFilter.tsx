import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CostCenterSubFilterProps {
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}

export function CostCenterSubFilter({ value, onChange, className }: CostCenterSubFilterProps) {
  const { activeTenantId } = useActiveTenant();
  const { data: costCenters, isLoading } = useQuery({
    queryKey: ["fin-cost-centers-filter", activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_cost_centers")
        .select("id, code, name")
        .eq("tenant_id", activeTenantId!)
        .eq("active", true)
        .order("code");
      return data || [];
    },
  });

  const selectedCenter = costCenters?.find(cc => cc.id === value);

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Building2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Centro de Custo:</span>
      </div>
      
      <Select
        value={value || "all"}
        onValueChange={(v) => onChange(v === "all" ? null : v)}
      >
        <SelectTrigger className="h-8 w-[180px] sm:w-[220px] text-xs">
          <SelectValue placeholder={isLoading ? "Carregando..." : "Todos os centros"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">
            <span className="flex items-center gap-2">
              <Building2 className="h-3 w-3" />
              Todos os centros
            </span>
          </SelectItem>
          {costCenters?.map((center) => (
            <SelectItem key={center.id} value={center.id} className="text-xs">
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground font-mono">{center.code}</span>
                {center.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value && selectedCenter && (
        <Badge 
          variant="secondary" 
          className="gap-1 h-6 text-xs cursor-pointer hover:bg-destructive/10"
          onClick={() => onChange(null)}
        >
          {selectedCenter.code} - {selectedCenter.name}
          <X className="h-3 w-3" />
        </Badge>
      )}
    </div>
  );
}
