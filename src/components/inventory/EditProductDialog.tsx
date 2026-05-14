import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileSpreadsheet } from "lucide-react";
import { CostCenterTagsSelector } from "./CostCenterTagsSelector";
import ProductMediaUploader, { VideoItem } from "./ProductMediaUploader";
import { TemplateFichaSelector } from "@/components/shared/TemplateFichaSelector";

// ID da categoria "Produto" para mostrar seção de mídia
const CATEGORIA_PRODUTO_ID = "2ca37a60-74b7-446c-9a67-fa5ff7f67731";

// Helper para parsear vídeos de JSON
const parseVideos = (data: unknown): VideoItem[] => {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.filter((v: any) => v && typeof v === "object" && v.url).map((v: any) => ({
      type: v.type || "url",
      url: v.url,
      nome: v.nome || ""
    }));
  }
  return [];
};

interface EditProductDialogProps {
  product: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EditProductDialog({ product, open, onOpenChange, onSuccess }: EditProductDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [selectedCostCenters, setSelectedCostCenters] = useState<string[]>([]);
  const [galeria, setGaleria] = useState<string[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [templateFichaId, setTemplateFichaId] = useState<string | null>(null);
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
    cor: "",
    medida: "",
    fornecedor_texto: "",
    image_url: "",
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

  // Carregar centros de custo do produto
  const { data: productCostCenters = [] } = useQuery({
    queryKey: ["product-cost-centers", product?.id],
    queryFn: async () => {
      if (!product?.id) return [];
      const { data, error } = await supabase
        .from("product_cost_centers")
        .select("cost_center_id")
        .eq("product_id", product.id);
      if (error) throw error;
      return data.map(item => item.cost_center_id);
    },
    enabled: !!product?.id
  });

  // Buscar mídias da IA se produto estiver vinculado
  const { data: iaProduct } = useQuery({
    queryKey: ["ia-product-media", product?.ia_produto_id],
    queryFn: async () => {
      if (!product?.ia_produto_id) return null;
      const { data, error } = await supabase
        .from("tendenci_ia_produtos")
        .select("imagem_url, galeria, video_url, videos")
        .eq("id", product.ia_produto_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!product?.ia_produto_id && open
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
        image_url: product.image_url || "",
      });
      
      // Combinar galeria própria + da IA (sem duplicatas)
      const productGaleria = Array.isArray(product.galeria) ? product.galeria : [];
      const iaGaleria = Array.isArray(iaProduct?.galeria) ? iaProduct.galeria : [];
      const iaMainImage = iaProduct?.imagem_url;
      
      const combinedGaleria = [...productGaleria];
      iaGaleria.forEach((url: string) => {
        if (!combinedGaleria.includes(url)) combinedGaleria.push(url);
      });
      if (iaMainImage && !combinedGaleria.includes(iaMainImage) && iaMainImage !== product.image_url) {
        combinedGaleria.unshift(iaMainImage);
      }
      setGaleria(combinedGaleria);
      
      // Combinar vídeos próprios + da IA
      const productVideos = parseVideos(product.videos);
      const iaVideos = parseVideos(iaProduct?.videos);
      const iaVideoUrl = iaProduct?.video_url;
      
      const combinedVideos = [...productVideos];
      iaVideos.forEach((v) => {
        if (!combinedVideos.some(cv => cv.url === v.url)) combinedVideos.push(v);
      });
      if (iaVideoUrl && !combinedVideos.some(v => v.url === iaVideoUrl)) {
        combinedVideos.push({ type: "url", url: iaVideoUrl, nome: "Vídeo IA" });
      }
      setVideos(combinedVideos);
    }
  }, [product, iaProduct]);

  useEffect(() => {
    setSelectedCostCenters(productCostCenters);
  }, [productCostCenters]);

  useEffect(() => {
    if (product) {
      setTemplateFichaId(product.template_ficha_id || null);
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    if (!form.category_id) {
      toast({ title: "Categoria é obrigatória", description: "Selecione uma categoria para o produto.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const isProdutoCategory = form.category_id === CATEGORIA_PRODUTO_ID;
      
      // Atualizar o produto
      const updateData = {
        code: form.code || null,
        name: form.name,
        description: form.description || null,
        category_id: form.category_id,
        location_id: form.location_id || null,
        unit: form.unit,
        min_stock: form.min_stock,
        max_stock: form.max_stock,
        cost_price: form.cost_price,
        sale_price: form.sale_price,
        ncm: form.ncm || null,
        cfop_entrada: form.cfop_entrada || null,
        cfop_saida: form.cfop_saida || null,
        active: form.active,
        barcode: form.barcode || null,
        reorder_point: form.reorder_point,
        reorder_quantity: form.reorder_quantity,
        cor: form.cor || null,
        medida: form.medida || null,
        fornecedor_texto: form.fornecedor_texto || null,
        image_url: form.image_url || null,
        galeria: isProdutoCategory ? galeria : [],
        videos: isProdutoCategory ? videos : [],
        template_ficha_id: templateFichaId,
      };
      
      const { error } = await supabase
        .from("products")
        .update(updateData as any)
        .eq("id", product.id);

      if (error) throw error;

      // Atualizar centros de custo
      // 1. Remover todos os existentes
      await supabase
        .from("product_cost_centers")
        .delete()
        .eq("product_id", product.id);

      // 2. Inserir os novos
      if (selectedCostCenters.length > 0) {
        const inserts = selectedCostCenters.map(ccId => ({
          product_id: product.id,
          cost_center_id: ccId
        }));
        
        const { error: insertError } = await supabase
          .from("product_cost_centers")
          .insert(inserts);
        
        if (insertError) throw insertError;
      }

      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-cost-centers", product.id] });
      
      toast({ title: "Produto atualizado!" });
      onSuccess();
      onOpenChange(false);
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

          {/* Categoria e Centro de Custo */}
          <div className="grid grid-cols-2 gap-4">
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
              <Label>Centro de Custo</Label>
              <CostCenterTagsSelector
                selectedIds={selectedCostCenters}
                onChange={setSelectedCostCenters}
              />
            </div>
          </div>

          {/* NCM e CFOP */}
          <div className="grid grid-cols-2 gap-4">
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

          {/* Seção de Mídia - apenas para categoria "Produto" */}
          {form.category_id === CATEGORIA_PRODUTO_ID && (
            <ProductMediaUploader
              imageUrl={form.image_url}
              galeria={galeria}
              videos={videos}
              onImageUrlChange={(url) => setForm({ ...form, image_url: url })}
              onGaleriaChange={setGaleria}
              onVideosChange={setVideos}
              disabled={loading}
            />
          )}

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

          {/* Ficha Técnica Padrão */}
          <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <Label>Ficha Técnica Padrão (Opcional)</Label>
            </div>
            <TemplateFichaSelector
              value={templateFichaId}
              onChange={setTemplateFichaId}
              placeholder="Vincular a uma ficha técnica padrão..."
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Vincule a uma ficha técnica padrão para usar como referência de custo e composição
            </p>
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