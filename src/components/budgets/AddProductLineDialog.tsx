import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Calculator } from "lucide-react";

interface AddProductLineDialogProps {
  productId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const lineTypes = [
  { value: "material", label: "Material", unit: "m²" },
  { value: "maquina", label: "Máquina/Tempo", unit: "min" },
  { value: "mao_obra", label: "Mão de Obra", unit: "h" },
  { value: "ferragem", label: "Ferragem", unit: "un" }
];

export function AddProductLineDialog({ productId, open, onOpenChange, onSuccess }: AddProductLineDialogProps) {
  const [lineName, setLineName] = useState("");
  const [lineType, setLineType] = useState("material");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("m²");
  const [costRefId, setCostRefId] = useState<string>("manual");
  const [unitCost, setUnitCost] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Auto calculation states
  const [autoCalculate, setAutoCalculate] = useState(false);
  const [metersToProcess, setMetersToProcess] = useState(0);

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

  const selectedLineType = lineTypes.find(t => t.value === lineType);
  
  // Get machine speed and cost for calculations
  const machineSpeedCutting = globalCosts.find(c => c.code === 'velocidade_corte')?.value || 15;
  const machineCostCutting = globalCosts.find(c => c.code === 'custo_corte_min')?.value || 0.80;
  const machineSpeedTaping = globalCosts.find(c => c.code === 'velocidade_fitagem')?.value || 8;
  const machineCostTaping = globalCosts.find(c => c.code === 'custo_fitagem_m')?.value || 1.20;

  // Auto calculate time based on meters
  const calculatedTime = useMemo(() => {
    if (!autoCalculate || lineType !== 'maquina') return null;
    
    // Check if it's cutting or taping based on unit cost reference
    const selectedCost = globalCosts.find(c => c.id === costRefId);
    
    if (selectedCost?.code === 'custo_corte_min') {
      // Cutting: time = meters / speed
      const time = metersToProcess / machineSpeedCutting;
      return { time, unit: 'min', cost: time * machineCostCutting };
    } else if (selectedCost?.code === 'custo_fitagem_m') {
      // Taping: already in meters, cost per meter
      return { time: metersToProcess, unit: 'm', cost: metersToProcess * machineCostTaping };
    }
    
    return null;
  }, [autoCalculate, lineType, metersToProcess, costRefId, globalCosts, machineSpeedCutting, machineCostCutting, machineSpeedTaping, machineCostTaping]);

  const handleLineTypeChange = (value: string) => {
    setLineType(value);
    const type = lineTypes.find(t => t.value === value);
    if (type) {
      setUnit(type.unit);
    }
    setAutoCalculate(false);
    setCostRefId("manual");
  };

  const handleCostRefChange = (value: string) => {
    setCostRefId(value);
    if (value !== "manual") {
      const cost = globalCosts.find(c => c.id === value);
      if (cost) {
        setUnitCost(cost.value);
        setUnit(cost.unit);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!lineName.trim()) {
      toast.error("Nome da linha é obrigatório");
      return;
    }

    setLoading(true);
    try {
      // Get max position
      const { data: existingLines } = await supabase
        .from('budget_product_lines')
        .select('position')
        .eq('product_id', productId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = (existingLines?.[0]?.position || 0) + 1;

      const costRef = costRefId !== "manual" ? globalCosts.find(c => c.id === costRefId) : null;
      
      // Use calculated values if auto-calculate is enabled
      const finalQuantity = autoCalculate && calculatedTime ? calculatedTime.time : quantity;
      const finalUnit = autoCalculate && calculatedTime ? calculatedTime.unit : unit;
      const finalUnitCost = unitCost;

      const { error } = await supabase
        .from('budget_product_lines')
        .insert({
          product_id: productId,
          line_name: lineName.trim(),
          line_type: lineType,
          quantity: finalQuantity,
          unit: finalUnit,
          unit_cost: finalUnitCost,
          subtotal: finalQuantity * finalUnitCost,
          cost_ref_id: costRef?.id || null,
          cost_ref_code: costRef?.code || null,
          position: nextPosition
        });

      if (error) throw error;

      toast.success("Linha adicionada!");
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar linha");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setLineName("");
    setLineType("material");
    setQuantity(1);
    setUnit("m²");
    setCostRefId("manual");
    setUnitCost(0);
    setAutoCalculate(false);
    setMetersToProcess(0);
  };

  const subtotal = autoCalculate && calculatedTime 
    ? calculatedTime.cost 
    : quantity * unitCost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Linha de Custo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lineName">Nome da Linha *</Label>
            <Input
              id="lineName"
              placeholder="Ex: MDF Corpo 15mm"
              value={lineName}
              onChange={(e) => setLineName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={lineType} onValueChange={handleLineTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lineTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Custo Base</Label>
              <Select value={costRefId} onValueChange={handleCostRefChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Valor Manual</SelectItem>
                  {globalCosts
                    .filter(c => c.category === lineType || lineType === 'material')
                    .map(cost => (
                      <SelectItem key={cost.id} value={cost.id}>
                        {cost.code} - R$ {cost.value.toFixed(2)}/{cost.unit}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Auto-calculate toggle for machine time */}
          {lineType === 'maquina' && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="auto-calc" className="text-sm">Calcular tempo automaticamente</Label>
              </div>
              <Switch
                id="auto-calc"
                checked={autoCalculate}
                onCheckedChange={setAutoCalculate}
              />
            </div>
          )}

          {/* Auto-calculation inputs */}
          {autoCalculate && lineType === 'maquina' && (
            <div className="p-3 bg-primary/5 rounded-lg space-y-3 border border-primary/20">
              <div className="space-y-2">
                <Label htmlFor="metersToProcess">Metros a processar</Label>
                <Input
                  id="metersToProcess"
                  type="number"
                  step="0.01"
                  min={0}
                  value={metersToProcess}
                  onChange={(e) => setMetersToProcess(parseFloat(e.target.value) || 0)}
                  placeholder="Ex: 12.5"
                />
              </div>
              
              {calculatedTime && (
                <div className="text-sm text-muted-foreground">
                  <p>
                    Tempo calculado: <strong>{calculatedTime.time.toFixed(2)} {calculatedTime.unit}</strong>
                  </p>
                  <p>
                    Custo estimado: <strong>R$ {calculatedTime.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Manual quantity input */}
          {!autoCalculate && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade</Label>
                <div className="flex gap-1 items-center">
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    min={0}
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-sm text-muted-foreground">{unit}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitCost">Custo Unit. (R$)</Label>
                <MoneyInput
                  id="unitCost"
                  value={unitCost}
                  onChange={setUnitCost}
                  disabled={costRefId !== "manual"}
                />
              </div>

              <div className="space-y-2">
                <Label>Subtotal</Label>
                <div className="h-9 flex items-center px-3 bg-muted rounded-md">
                  <span className="font-semibold">
                    R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adicionando...
                </>
              ) : (
                "Adicionar Linha"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
