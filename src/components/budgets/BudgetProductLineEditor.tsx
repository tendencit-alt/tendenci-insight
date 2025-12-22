import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, GripVertical } from "lucide-react";

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

interface BudgetProductLineEditorProps {
  line: ProductLine;
  onUpdate: (lineId: string, data: Partial<ProductLine>) => void;
  onDelete: (lineId: string) => void;
}

const lineTypes = [
  { value: "corpo", label: "Corpo (MDF)" },
  { value: "porta", label: "Porta/Frente" },
  { value: "tamponamento", label: "Tamponamento" },
  { value: "prateleira", label: "Prateleira" },
  { value: "gaveta", label: "Gaveta" },
  { value: "fundo", label: "Fundo (MDF 6mm)" },
  { value: "fita_borda", label: "Fita de Borda" },
  { value: "corte", label: "Corte (máquina)" },
  { value: "fitagem", label: "Fitagem (coladeira)" },
  { value: "ferragem", label: "Ferragem" },
  { value: "mao_obra", label: "Mão de Obra" },
  { value: "outro", label: "Outro" }
];

export function BudgetProductLineEditor({ line, onUpdate, onDelete }: BudgetProductLineEditorProps) {
  const [quantity, setQuantity] = useState(line.quantity);
  const [unitCost, setUnitCost] = useState(line.unit_cost);
  const [selectedCostRef, setSelectedCostRef] = useState(line.cost_ref_id || "manual");

  const { data: globalCosts = [] } = useQuery({
    queryKey: ['budget-global-costs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_global_costs')
        .select('*')
        .eq('active', true)
        .order('category')
        .order('name');

      if (error) throw error;
      return data;
    }
  });

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

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg group">
      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{line.line_name}</p>
        <p className="text-xs text-muted-foreground">
          {lineTypes.find(t => t.value === line.line_type)?.label || line.line_type}
        </p>
      </div>

      <Select value={selectedCostRef} onValueChange={handleCostRefChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Custo base" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="manual">Manual</SelectItem>
          {globalCosts.map(cost => (
            <SelectItem key={cost.id} value={cost.id}>
              {cost.code} - R$ {cost.value.toFixed(2)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        <Input
          type="number"
          step="0.01"
          min={0}
          value={quantity}
          onChange={(e) => handleQuantityChange(parseFloat(e.target.value) || 0)}
          className="w-20 text-right"
        />
        <span className="text-xs text-muted-foreground w-8">{line.unit}</span>
      </div>

      <div className="text-center">
        <span className="text-xs text-muted-foreground">×</span>
      </div>

      <Input
        type="number"
        step="0.01"
        min={0}
        value={unitCost}
        onChange={(e) => handleUnitCostChange(parseFloat(e.target.value) || 0)}
        className="w-24 text-right"
        disabled={selectedCostRef !== "manual"}
      />

      <div className="text-center">
        <span className="text-xs text-muted-foreground">=</span>
      </div>

      <div className="w-28 text-right">
        <span className="font-semibold text-sm">
          R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(line.id)}
        className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
