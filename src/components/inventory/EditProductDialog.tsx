import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { TemplateFichaSelector } from "@/components/shared/TemplateFichaSelector";

interface EditProductDialogProps {
  product: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EditProductDialog({ product, open, onOpenChange, onSuccess }: EditProductDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    category_id: "",
    location_id: "",
    unit: "UN",
    min_stock: 0,
    max_stock: null as number | null,
    cost_price: 0,
    sale_price: 0,
    ncm: "",
    cfop_entrada: "",
    cfop_saida: "",
    active: true,
    barcode: "",
    reorder_point: null as number | null,
    reorder_quantity: null as number | null,
    // Novos campos abertos
    cor: "",
    medida: "",
    fornecedor_texto: "",
    template_ficha_id: null as string | null,
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

  useEffect(() => {
    if (product) {
      setForm({
        code: product.code || "",
        name: product.name || "",
        description: product.description || "",
        category_id: product.category_id || "",
        location_id: product.location_id || "",
        unit: product.unit || "UN",
        min_stock: product.min_stock || 0,
        max_stock: product.max_stock,
        cost_price: product.cost_price || 0,
        sale_price: product.sale_price || 0,
        ncm: product.ncm || "",
        cfop_entrada: product.cfop_entrada || "",
        cfop_saida: product.cfop_saida || "",
        active: product.active ?? true,
        barcode: product.barcode || "",
        reorder_point: product.reorder_point,
        reorder_quantity: product.reorder_quantity,
        cor: product.cor || "",
        medida: product.medida || "",
        fornecedor_texto: product.fornecedor_texto || "",
        template_ficha_id: product.template_ficha_id || null,
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({
          ...form,
          category_id: form.category_id || null,
          location_id: form.location_id || null,
          cor: form.cor || null,
          medida: form.medida || null,
          fornecedor_texto: form.fornecedor_texto || null,
          template_ficha_id: form.template_ficha_id || null,
        })
        .eq("id", product.id);

      if (error) throw error;

      toast({ title: "Produto atualizado!" });
      onSuccess();
    } catch (error: any) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <Label htmlFor="active">Item Ativo</Label>
            <Switch
              id="active"
              checked={form.active}
              onCheckedChange={(checked) => setForm({ ...form, active: checked })}
            />
          </div>

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

          {/* Campos Base: Categoria, CFOP, NCM */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select value={form.category_id || "_placeholder"} onValueChange={(v) => setForm({ ...form, category_id: v === "_placeholder" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_placeholder" disabled>-</SelectItem>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ncm">NCM</Label>
              <Input
                id="ncm"
                value={form.ncm}
                onChange={(e) => setForm({ ...form, ncm: e.target.value })}
                maxLength={10}
                placeholder="Ex: 9403.50.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfop_saida">CFOP</Label>
              <Input
                id="cfop_saida"
                value={form.cfop_saida}
                onChange={(e) => setForm({ ...form, cfop_saida: e.target.value })}
                maxLength={4}
                placeholder="Ex: 5102"
              />
            </div>
          </div>

          {/* Campos Abertos: Fornecedor, Cor, Medida */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fornecedor_texto">Fornecedor</Label>
              <Input
                id="fornecedor_texto"
                value={form.fornecedor_texto}
                onChange={(e) => setForm({ ...form, fornecedor_texto: e.target.value })}
                placeholder="Nome do fornecedor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cor">Cor</Label>
              <Input
                id="cor"
                value={form.cor}
                onChange={(e) => setForm({ ...form, cor: e.target.value })}
                placeholder="Ex: Branco, Preto, Mogno"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medida">Medida</Label>
              <Input
                id="medida"
                value={form.medida}
                onChange={(e) => setForm({ ...form, medida: e.target.value })}
                placeholder="Ex: 2m x 1,5m, P/M/G"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Local</Label>
              <Select value={form.location_id || "_none"} onValueChange={(v) => setForm({ ...form, location_id: v === "_none" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">-</SelectItem>
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
            <div className="space-y-2">
              <Label htmlFor="barcode">Código de Barras</Label>
              <Input
                id="barcode"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                placeholder="EAN/GTIN"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reorder_point">Ponto de Reposição</Label>
              <Input
                id="reorder_point"
                type="number"
                step="0.01"
                value={form.reorder_point || ""}
                onChange={(e) => setForm({ ...form, reorder_point: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="Qtd para recompra automática"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorder_quantity">Quantidade de Reposição</Label>
              <Input
                id="reorder_quantity"
                type="number"
                step="0.01"
                value={form.reorder_quantity || ""}
                onChange={(e) => setForm({ ...form, reorder_quantity: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="Qtd sugerida para comprar"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cfop_entrada">CFOP Entrada</Label>
              <Input
                id="cfop_entrada"
                value={form.cfop_entrada}
                onChange={(e) => setForm({ ...form, cfop_entrada: e.target.value })}
                maxLength={4}
              />
            </div>
          </div>

          {/* Ficha Técnica Padrão */}
          <TemplateFichaSelector
            value={form.template_ficha_id}
            onChange={(value) => setForm({ ...form, template_ficha_id: value })}
          />

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