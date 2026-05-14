import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/currency-input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProductLine {
  id: string;
  line_name: string;
  line_type: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  subtotal: number | null;
  cost_ref_id: string | null;
  cost_ref_code: string | null;
}

interface GlobalCost {
  id: string;
  code: string;
  name: string;
  value: number;
  unit: string;
  category: string;
}

interface BudgetProductLineEditorProps {
  line: ProductLine;
  globalCosts: GlobalCost[];
  onUpdate: (lineId: string, data: Partial<ProductLine>) => void;
  onDelete: (lineId: string) => void;
}

const lineTypeLabels: Record<string, string> = {
  material: "Material",
  maquina: "Máquina/Tempo",
  mao_obra: "Mão de Obra",
  ferragem: "Ferragem"
};

export function BudgetProductLineEditor({ line, globalCosts, onUpdate, onDelete }: BudgetProductLineEditorProps) {
  const [quantity, setQuantity] = useState(line.quantity);
  const [unitCost, setUnitCost] = useState(line.unit_cost);
  const [selectedCostRef, setSelectedCostRef] = useState(line.cost_ref_id || "manual");

  useEffect(() => {
    setQuantity(line.quantity);
    setUnitCost(line.unit_cost);
    setSelectedCostRef(line.cost_ref_id || "manual");
  }, [line]);

  const handleCostRefChange = (costRefId: string) => {
    setSelectedCostRef(costRefId);
    
    if (costRefId === "manual") {
      onUpdate(line.id, { 
        cost_ref_id: null, 
        cost_ref_code: null 
      });
    } else {
      const costRef = globalCosts.find(c => c.id === costRefId);
      if (costRef) {
        setUnitCost(costRef.value);
        onUpdate(line.id, {
          cost_ref_id: costRef.id,
          cost_ref_code: costRef.code,
          unit_cost: costRef.value,
          unit: costRef.unit
        });
      }
    }
  };

  const handleQuantityChange = (value: number) => {
    setQuantity(value);
    onUpdate(line.id, { quantity: value });
  };

  const handleUnitCostChange = (value: number) => {
    setUnitCost(value);
    onUpdate(line.id, { unit_cost: value, cost_ref_id: null, cost_ref_code: null });
    setSelectedCostRef("manual");
  };

  const subtotal = quantity * unitCost;
  const linkedCost = globalCosts.find(c => c.id === line.cost_ref_id);

  return (
    <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
      {/* Nome da Linha */}
      <td className="py-2 px-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-sm">{line.line_name}</span>
          <span className="text-xs text-muted-foreground">
            {lineTypeLabels[line.line_type] || line.line_type}
          </span>
        </div>
      </td>

      {/* Quantidade */}
      <td className="py-2 px-2 w-24">
        <Input
          type="number"
          step="0.01"
          min={0}
          value={quantity}
          onChange={(e) => handleQuantityChange(parseFloat(e.target.value) || 0)}
          className="h-8 text-right text-sm"
        />
      </td>

      {/* Unidade */}
      <td className="py-2 px-2 w-14 text-center">
        <span className="text-sm text-muted-foreground">{line.unit}</span>
      </td>

      {/* Custo Base */}
      <td className="py-2 px-2 w-40">
        <Select value={selectedCostRef} onValueChange={handleCostRefChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Custo base" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual</SelectItem>
            {globalCosts.map(cost => (
              <SelectItem key={cost.id} value={cost.id}>
                <span className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    {cost.code}
                  </Badge>
                  <span className="text-xs">R$ {cost.value.toFixed(2)}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>

      {/* Valor Unitário */}
      <td className="py-2 px-2 w-28">
        <MoneyInput
          value={unitCost}
          onChange={handleUnitCostChange}
          className="h-8 text-right text-sm"
          disabled={selectedCostRef !== "manual"}
        />
      </td>

      {/* Subtotal */}
      <td className="py-2 px-3 w-32 text-right">
        <span className="font-semibold text-sm text-primary">
          R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      </td>

      {/* Ações */}
      <td className="py-2 px-2 w-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(line.id)}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}

// Table header component for reuse
export function BudgetProductLinesTableHeader() {
  return (
    <thead className="bg-muted/50 border-b">
      <tr>
        <th className="py-2 px-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Linha
        </th>
        <th className="py-2 px-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">
          Qtd
        </th>
        <th className="py-2 px-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-14">
          Und
        </th>
        <th className="py-2 px-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-40">
          Base
        </th>
        <th className="py-2 px-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">
          Custo
        </th>
        <th className="py-2 px-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32">
          Subtotal
        </th>
        <th className="py-2 px-2 w-10"></th>
      </tr>
    </thead>
  );
}
