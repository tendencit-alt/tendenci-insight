import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateProductDialog({ open, onOpenChange, onSuccess }: CreateProductDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    category_id: "",
    location_id: "",
    unit: "UN",
    current_stock: 0,
    min_stock: 0,
    max_stock: null as number | null,
    cost_price: 0,
    sale_price: 0,
    ncm: "",
    cfop_entrada: "",
    cfop_saida: ""
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("id, name")
        .eq("active", true)
        .order("position");
      if (error) throw error;
      return data;
    }
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["stock-locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_locations")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("products").insert({
        ...form,
        category_id: form.category_id || null,
        location_id: form.location_id || null
      });
      if (error) throw error;

      toast({ title: "Produto criado com sucesso!" });
      onSuccess();
      onOpenChange(false);
      setForm({
        code: "", name: "", description: "", category_id: "", location_id: "",
        unit: "UN", current_stock: 0, min_stock: 0, max_stock: null,
        cost_price: 0, sale_price: 0, ncm: "", cfop_entrada: "", cfop_saida: ""
      });
    } catch (error: any) {
      toast({ title: "Erro ao criar produto", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Produto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código (SKU)</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Local</Label>
              <Select value={form.location_id} onValueChange={(v) => setForm({ ...form, location_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc: any) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unidade</Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UN">UN</SelectItem>
                  <SelectItem value="KG">KG</SelectItem>
                  <SelectItem value="M">M</SelectItem>
                  <SelectItem value="M2">M²</SelectItem>
                  <SelectItem value="M3">M³</SelectItem>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="PC">PC</SelectItem>
                  <SelectItem value="CX">CX</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_stock">Estoque Inicial</Label>
              <Input
                id="current_stock"
                type="number"
                step="0.01"
                value={form.current_stock}
                onChange={(e) => setForm({ ...form, current_stock: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_stock">Estoque Mínimo</Label>
              <Input
                id="min_stock"
                type="number"
                step="0.01"
                value={form.min_stock}
                onChange={(e) => setForm({ ...form, min_stock: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_stock">Estoque Máximo</Label>
              <Input
                id="max_stock"
                type="number"
                step="0.01"
                value={form.max_stock || ""}
                onChange={(e) => setForm({ ...form, max_stock: e.target.value ? parseFloat(e.target.value) : null })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost_price">Preço de Custo (R$)</Label>
              <Input
                id="cost_price"
                type="number"
                step="0.01"
                value={form.cost_price}
                onChange={(e) => setForm({ ...form, cost_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale_price">Preço de Venda (R$)</Label>
              <Input
                id="sale_price"
                type="number"
                step="0.01"
                value={form.sale_price}
                onChange={(e) => setForm({ ...form, sale_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ncm">NCM</Label>
              <Input
                id="ncm"
                value={form.ncm}
                onChange={(e) => setForm({ ...form, ncm: e.target.value })}
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfop_entrada">CFOP Entrada</Label>
              <Input
                id="cfop_entrada"
                value={form.cfop_entrada}
                onChange={(e) => setForm({ ...form, cfop_entrada: e.target.value })}
                maxLength={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfop_saida">CFOP Saída</Label>
              <Input
                id="cfop_saida"
                value={form.cfop_saida}
                onChange={(e) => setForm({ ...form, cfop_saida: e.target.value })}
                maxLength={4}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
