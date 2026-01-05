import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Package, Plus, Search, Palette } from 'lucide-react';

interface AddInsumoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productionProductId: string;
  onSuccess: () => void;
}

// Produtos que permitem variação (cor ou modelo)
const PRODUCTS_WITH_VARIATION = {
  cor: ['Vidro', 'MDF', 'Corda', 'Canvas'],
  modelo: ['Puxador']
};

// Categorias permitidas para ficha técnica (conforme planilha)
const ALLOWED_CATEGORIES = ['Móveis Rústico', 'Corda Náutica', 'Industrial', 'Quadro', 'Mão de Obra'];

// Ordem das categorias conforme planilha
const CATEGORY_ORDER = ['Móveis Rústico', 'Corda Náutica', 'Quadro', 'Industrial', 'Mão de Obra'];

export function AddInsumoDialog({ 
  open, 
  onOpenChange, 
  productionProductId,
  onSuccess 
}: AddInsumoDialogProps) {
  const [mode, setMode] = useState<'stock' | 'manual'>('stock');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [insumoNome, setInsumoNome] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [unidade, setUnidade] = useState('UN');
  const [custoUnitario, setCustoUnitario] = useState('');
  const [cor, setCor] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Buscar categorias (filtradas conforme planilha)
  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories-ficha'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name')
        .in('name', ALLOWED_CATEGORIES)
        .order('name');
      
      if (error) throw error;
      
      // Ordenar conforme planilha
      return data.sort((a, b) => {
        const orderA = CATEGORY_ORDER.indexOf(a.name);
        const orderB = CATEGORY_ORDER.indexOf(b.name);
        return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
      });
    },
    enabled: open
  });

  // Buscar produtos do estoque com categoria
  const { data: products = [] } = useQuery({
    queryKey: ['products-for-bom'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, code, cost_price, unit, current_stock, category_id, category:product_categories(name)')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  // Filtrar produtos por categoria e termo de busca
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategoryId === 'all' || p.category_id === selectedCategoryId;
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Verificar se o produto selecionado permite variação (cor ou modelo)
  const selectedProduct = products.find(p => p.id === selectedProductId);
  
  const allowsVariation = selectedProduct && (
    PRODUCTS_WITH_VARIATION.cor.some(name => 
      selectedProduct.name.toLowerCase().includes(name.toLowerCase())
    ) ||
    PRODUCTS_WITH_VARIATION.modelo.some(name => 
      selectedProduct.name.toLowerCase().includes(name.toLowerCase())
    )
  );
  
  const variationType = selectedProduct && PRODUCTS_WITH_VARIATION.modelo.some(name => 
    selectedProduct.name.toLowerCase().includes(name.toLowerCase())
  ) ? 'modelo' : 'cor';

  // Quando seleciona produto do estoque, preencher campos
  useEffect(() => {
    if (selectedProductId && mode === 'stock') {
      const product = products.find(p => p.id === selectedProductId);
      if (product) {
        setInsumoNome(product.name);
        setCustoUnitario(String(product.cost_price || 0));
        setUnidade(product.unit || 'UN');
        setCor(''); // Reset cor ao trocar produto
      }
    }
  }, [selectedProductId, products, mode]);

  // Reset form
  const resetForm = () => {
    setMode('stock');
    setSelectedProductId('');
    setSelectedCategoryId('all');
    setSearchTerm('');
    setInsumoNome('');
    setQuantidade('1');
    setUnidade('UN');
    setCustoUnitario('');
    setCor('');
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!insumoNome.trim()) {
      toast.error('Informe o nome do insumo');
      return;
    }
    if (!quantidade || parseFloat(quantidade) <= 0) {
      toast.error('Informe uma quantidade válida');
      return;
    }
    if (!custoUnitario || parseFloat(custoUnitario) < 0) {
      toast.error('Informe o custo unitário');
      return;
    }

    // Montar nome com cor se aplicável
    const nomeCompleto = cor.trim() 
      ? `${insumoNome.trim()} (${cor.trim()})`
      : insumoNome.trim();

    setLoading(true);
    try {
      const { error } = await supabase
        .from('production_product_bom')
        .insert({
          production_product_id: productionProductId,
          insumo_id: mode === 'stock' && selectedProductId ? selectedProductId : null,
          insumo_nome: nomeCompleto,
          quantidade: parseFloat(quantidade),
          unidade: unidade.trim() || 'UN',
          custo_unitario: parseFloat(custoUnitario),
          cor: cor.trim() || null,
          notes: notes.trim() || null
        });

      if (error) throw error;

      toast.success('Insumo adicionado com sucesso');
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao adicionar insumo:', error);
      toast.error('Erro ao adicionar insumo');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = (parseFloat(quantidade) || 0) * (parseFloat(custoUnitario) || 0);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Adicionar Insumo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tabs para modo */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'stock' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('stock')}
              className="flex-1"
            >
              <Package className="h-4 w-4 mr-2" />
              Do Estoque
            </Button>
            <Button
              variant={mode === 'manual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setMode('manual');
                setSelectedProductId('');
                setInsumoNome('');
                setCustoUnitario('');
                setCor('');
              }}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              Manual
            </Button>
          </div>

          {/* Seleção de produto do estoque */}
          {mode === 'stock' && (
            <>
              {/* Filtro por Categoria */}
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Buscar no Estoque</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProducts.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Nenhum produto encontrado
                      </div>
                    ) : (
                      filteredProducts.slice(0, 50).map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex items-center gap-2">
                            <span>{product.name}</span>
                            {product.code && (
                              <span className="text-xs text-muted-foreground">
                                ({product.code})
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">
                              {product.unit}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedProduct && (
                  <p className="text-xs text-muted-foreground">
                    Estoque atual: {selectedProduct.current_stock || 0} {selectedProduct.unit}
                    {selectedProduct.category && ` • ${(selectedProduct.category as any).name}`}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Nome do Insumo */}
          <div className="space-y-2">
            <Label htmlFor="insumo-nome">Nome do Insumo *</Label>
            <Input
              id="insumo-nome"
              value={insumoNome}
              onChange={(e) => setInsumoNome(e.target.value)}
              placeholder="Ex: MDF 15mm"
              disabled={mode === 'stock' && !!selectedProductId}
            />
          </div>

          {/* Campo de Cor/Variação - aparece quando aplicável */}
          {(allowsVariation || mode === 'manual') && (
            <div className="space-y-2">
              <Label htmlFor="cor" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                {variationType === 'modelo' ? 'Modelo / Variação' : 'Cor / Variação'}
              </Label>
              <Input
                id="cor"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                placeholder={variationType === 'modelo' 
                  ? "Ex: Alça, Quadrado, Redondo..." 
                  : "Ex: Branco, Fumê, Natural..."}
              />
              <p className="text-xs text-muted-foreground">
                {variationType === 'modelo' 
                  ? 'Especifique o modelo ou tipo (opcional)'
                  : 'Especifique a cor ou variação do material (opcional)'}
              </p>
            </div>
          )}

          {/* Quantidade e Unidade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade *</Label>
              <Input
                id="quantidade"
                type="number"
                step="0.01"
                min="0"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade</Label>
              <Select value={unidade} onValueChange={setUnidade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UN">UN - Unidade</SelectItem>
                  <SelectItem value="ML">ML - Metro Linear</SelectItem>
                  <SelectItem value="m2">M² - Metro Quad.</SelectItem>
                  <SelectItem value="m3">M³ - Metro Cúb.</SelectItem>
                  <SelectItem value="kg">KG - Quilograma</SelectItem>
                  <SelectItem value="ml">ml - Mililitro</SelectItem>
                  <SelectItem value="L">L - Litro</SelectItem>
                  <SelectItem value="peça">Peça</SelectItem>
                  <SelectItem value="un">un - Unidade</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custo Unitário */}
          <div className="space-y-2">
            <Label htmlFor="custo-unitario">Custo Unitário (R$) *</Label>
            <Input
              id="custo-unitario"
              type="number"
              step="0.01"
              min="0"
              value={custoUnitario}
              onChange={(e) => setCustoUnitario(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Subtotal Preview */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="font-semibold text-lg">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}
              </span>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre este insumo..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Adicionando...' : 'Adicionar Insumo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
