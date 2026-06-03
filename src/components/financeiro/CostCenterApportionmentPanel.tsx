import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Divide, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ApportionmentItem {
  cost_center_id: string;
  cost_center_name: string;
  percentage: number;
  amount: number;
}

interface CostCenterApportionmentPanelProps {
  totalAmount: number;
  items: ApportionmentItem[];
  onChange: (items: ApportionmentItem[]) => void;
  readOnly?: boolean;
}

export function CostCenterApportionmentPanel({
  totalAmount,
  items,
  onChange,
  readOnly = false,
}: CostCenterApportionmentPanelProps) {
  const { activeTenantId } = useActiveTenant();
  const { data: costCenters } = useQuery({
    queryKey: ["fin-cost-centers-active-apportionment", activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_cost_centers")
        .select("id, name")
        .eq("tenant_id", activeTenantId!)
        .eq("active", true)
        .order("name");
      return data || [];
    },
  });

  // Initialize items when cost centers load
  useEffect(() => {
    if (costCenters && costCenters.length > 0 && items.length === 0) {
      onChange(
        costCenters.map((cc) => ({
          cost_center_id: cc.id,
          cost_center_name: cc.name,
          percentage: 0,
          amount: 0,
        }))
      );
    }
  }, [costCenters]);

  // Recalculate amounts when totalAmount changes
  useEffect(() => {
    if (items.length > 0) {
      onChange(
        items.map((item) => ({
          ...item,
          amount: Math.round((totalAmount * item.percentage) / 100 * 100) / 100,
        }))
      );
    }
  }, [totalAmount]);

  const totalPercentage = items.reduce((sum, item) => sum + item.percentage, 0);
  const isValid = Math.abs(totalPercentage - 100) < 0.05;

  const handlePercentageChange = (index: number, value: string) => {
    const pct = parseFloat(value) || 0;
    const updated = items.map((item, i) =>
      i === index
        ? { ...item, percentage: pct, amount: Math.round((totalAmount * pct) / 100 * 100) / 100 }
        : item
    );
    onChange(updated);
  };

  const distributeEqually = () => {
    const count = items.length;
    if (count === 0) return;
    const pct = Math.floor((10000 / count)) / 100;
    const remainder = Math.round((100 - pct * count) * 100) / 100;
    onChange(
      items.map((item, i) => {
        const finalPct = i === 0 ? pct + remainder : pct;
        return {
          ...item,
          percentage: finalPct,
          amount: Math.round((totalAmount * finalPct) / 100 * 100) / 100,
        };
      })
    );
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Rateio por Centro de Custo</Label>
        {!readOnly && (
          <Button type="button" variant="outline" size="sm" onClick={distributeEqually}>
            <Divide className="h-3 w-3 mr-1" />
            Distribuir Igual
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.cost_center_id} className="flex items-center gap-3">
            <span className="text-sm min-w-[120px] truncate">{item.cost_center_name}</span>
            {readOnly ? (
              <span className="text-sm font-medium w-20 text-right">{item.percentage.toFixed(2)}%</span>
            ) : (
              <div className="flex items-center gap-1 w-24">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={item.percentage || ""}
                  onChange={(e) => handlePercentageChange(index, e.target.value)}
                  className="h-8 text-sm text-right"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            )}
            <span className="text-sm text-muted-foreground ml-auto">
              {formatCurrency(item.amount)}
            </span>
          </div>
        ))}
      </div>

      <div
        className={cn(
          "flex items-center justify-between pt-2 border-t text-sm font-medium",
          isValid ? "text-green-600" : "text-destructive"
        )}
      >
        <div className="flex items-center gap-1">
          {isValid ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span>Total: {totalPercentage.toFixed(2)}%</span>
        </div>
        <span>{formatCurrency(items.reduce((s, i) => s + i.amount, 0))}</span>
      </div>
    </div>
  );
}
