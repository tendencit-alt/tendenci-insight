import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AddProductLineDialogProps {
  productId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const lineTypes = [
  { value: "corpo", label: "Corpo (MDF)", unit: "m²" },
  { value: "porta", label: "Porta/Frente", unit: "m²" },
  { value: "tamponamento", label: "Tamponamento", unit: "m²" },
  { value: "prateleira", label: "Prateleira", unit: "m²" },
  { value: "gaveta", label: "Gaveta", unit: "un" },
  { value: "fundo", label: "Fundo (MDF 6mm)", unit: "m²" },
  { value: "fita_borda", label: "Fita de Borda", unit: "m" },
  { value: "corte", label: "Corte (máquina)", unit: "min" },
  { value: "fitagem", label: "Fitagem (coladeira)", unit: "m" },
  { value: "ferragem", label: "Ferragem", unit: "un" },
  { value: "mao_obra", label: "Mão de Obra", unit: "h" },
  { value: "outro", label: "Outro", unit: "un" }
];

export function AddProductLineDialog({ productId, open, onOpenChange, onSuccess }: AddProductLineDialogProps) {
  const [lineName, setLineName] = useState("");
  const [lineType, setLineType] = useState("corpo");
  const [quantity, setQuantity] = useState(1);
  const [costRefId, setCostRefId] = useState<string>("manual");
  const [unitCost, setUnitCost] = useState(0);
  const [loading, setLoading] = useState(false);

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
  const unit = selectedLineType?.unit || "un";

  const handleCostRefChange = (value: string) => {
    setCostRefId(value);
    if (value !== "manual") {
      const cost = globalCosts.find(c => c.id === value);
      if (cost) {
        setUnitCost(cost.value);
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

      const { error } = await supabase
        .from('budget_product_lines')
        .insert({
          product_id: productId,
          line_name: lineName.trim(),
          line_type: lineType,
          quantity,
          unit,
          unit_cost: unitCost,
          subtotal: quantity * unitCost,
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
    setLineType("corpo");
    setQuantity(1);
    setCostRefId("manual");
    setUnitCost(0);
  };

  const subtotal = quantity * unitCost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
              <Select value={lineType} onValueChange={setLineType}>
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
                  {globalCosts.map(cost => (
                    <SelectItem key={cost.id} value={cost.id}>
                      {cost.code} - R$ {cost.value.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
              <Input
                id="unitCost"
                type="number"
                step="0.01"
                min={0}
                value={unitCost}
                onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
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
