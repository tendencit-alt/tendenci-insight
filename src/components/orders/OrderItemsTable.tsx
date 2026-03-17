import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Edit2, Check, ChevronDown, ChevronUp, Package, X, Search, Import } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OrderItem {
  id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  especificacoes?: string;
  codigo_produto?: string;
  ncm?: string;
  cfop?: string;
  unidade?: string;
  centro_custo?: string;
}

interface OrderItemsTableProps {
  items: OrderItem[];
  onItemsChange: (items: OrderItem[]) => void;
  readOnly?: boolean;
  showFiscalFields?: boolean;
  requireCentroCusto?: boolean;
}

interface ProdutoEstoque {
  id: string;
  name: string;
  code: string | null;
  cost_price: number | null;
  current_stock: number | null;
  unit: string | null;
  active: boolean | null;
  image_url: string | null;
  category: {
    name: string;
  } | null;
}

const CENTROS_CUSTO = [
  { value: 'moveis_planejados', label: 'Móveis Planejados' },
  { value: 'producao_tendenci', label: 'Produção Tendenci' },
  { value: 'revenda', label: 'Revenda' },
];

const emptyItem = {
  descricao: '',
  quantidade: 1,
  valor_unitario: 0,
  codigo_produto: '',
  ncm: '',
  cfop: '',
  unidade: 'UN',
  especificacoes: '',
  centro_custo: '',
};

export function OrderItemsTable({ items, onItemsChange, readOnly = false, showFiscalFields = false, requireCentroCusto = false }: OrderItemsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItem, setNewItem] = useState<Partial<OrderItem>>(emptyItem);
  
  // Estados para seletor de produtos
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [produtosEstoque, setProdutosEstoque] = useState<ProdutoEstoque[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [buscaProduto, setBuscaProduto] = useState("");

  const loadProdutosEstoque = async () => {
    setLoadingProdutos(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, 
          name, 
          code, 
          cost_price, 
          current_stock, 
          unit, 
          active,
          image_url,
          ia_produto_id,
          category:product_categories!inner(name)
        `)
        .eq('active', true)
        .eq('category.name', 'Produto')
        .order('name');
      
      if (error) throw error;
      
      // Se produto tem ia_produto_id e cost_price = 0, buscar preco_base da IA
      const produtosComIA = (data || []).filter(p => p.ia_produto_id && (p.cost_price === 0 || p.cost_price === null));
      
      if (produtosComIA.length > 0) {
        const iaIds = produtosComIA.map(p => p.ia_produto_id);
        const { data: iaData } = await supabase
          .from('tendenci_ia_produtos')
          .select('id, preco_base')
          .in('id', iaIds);
        
        // Mapear preços da IA
        const iaPrecos = new Map((iaData || []).map(ia => [ia.id, ia.preco_base]));
        
        // Atualizar produtos com preço da IA
        const produtosAtualizados = (data || []).map(p => {
          if (p.ia_produto_id && (p.cost_price === 0 || p.cost_price === null)) {
            const precoIA = iaPrecos.get(p.ia_produto_id);
            if (precoIA) {
              return { ...p, cost_price: precoIA };
            }
          }
          return p;
        });
        
        setProdutosEstoque(produtosAtualizados);
      } else {
        setProdutosEstoque(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar produtos do estoque:', error);
      toast.error('Erro ao carregar produtos do estoque');
    } finally {
      setLoadingProdutos(false);
    }
  };

  useEffect(() => {
    if (showProductSelector && produtosEstoque.length === 0) {
      loadProdutosEstoque();
    }
  }, [showProductSelector]);

  const produtosFiltrados = produtosEstoque.filter(p => {
    return !buscaProduto || p.name.toLowerCase().includes(buscaProduto.toLowerCase());
  });

  const addProdutoToOrder = (produto: ProdutoEstoque) => {
    const newOrderItem: OrderItem = {
      id: crypto.randomUUID(),
      descricao: produto.name,
      quantidade: 1,
      valor_unitario: produto.cost_price || 0,
      valor_total: produto.cost_price || 0,
      codigo_produto: produto.code || '',
      unidade: produto.unit || 'UN',
    };
    
    onItemsChange([...items, newOrderItem]);
    toast.success(`${produto.name} adicionado ao pedido`);
  };

  const handleAddItem = () => {
    if (!newItem.descricao || !newItem.valor_unitario) return;
    if (requireCentroCusto && !newItem.centro_custo) return;

    const item: OrderItem = {
      id: crypto.randomUUID(),
      descricao: newItem.descricao,
      quantidade: newItem.quantidade || 1,
      valor_unitario: newItem.valor_unitario,
      valor_total: (newItem.quantidade || 1) * newItem.valor_unitario,
      especificacoes: newItem.especificacoes,
      codigo_produto: newItem.codigo_produto,
      ncm: newItem.ncm,
      cfop: newItem.cfop,
      unidade: newItem.unidade || 'UN',
      centro_custo: newItem.centro_custo,
    };

    onItemsChange([...items, item]);
    setNewItem(emptyItem);
    setIsAddingItem(false);
  };

  const handleRemoveItem = (id: string) => {
    onItemsChange(items.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<OrderItem>) => {
    onItemsChange(
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          updated.valor_total = updated.quantidade * updated.valor_unitario;
          return updated;
        }
        return item;
      })
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const totalItems = items.reduce((sum, item) => sum + item.valor_total, 0);

  return (
    <div className="space-y-4">
      {/* Header com botão de adicionar */}
      {!readOnly && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <span className="font-medium">Itens do Pedido ({items.length})</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowProductSelector(true)} className="gap-2">
              <Import className="h-4 w-4" />
              Importar Produto
            </Button>
            <Button onClick={() => setIsAddingItem(true)} disabled={isAddingItem} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Manual
            </Button>
          </div>
        </div>
      )}

      {/* Modal de seleção de produtos */}
      <Dialog open={showProductSelector} onOpenChange={setShowProductSelector}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Selecionar Produto Cadastrado
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Lista de produtos */}
            <ScrollArea className="h-[400px] pr-4">
              {loadingProdutos ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-muted-foreground">Carregando...</span>
                </div>
              ) : produtosFiltrados.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum produto encontrado</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {produtosFiltrados.map(produto => (
                    <Card
                      key={produto.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => addProdutoToOrder(produto)}
                    >
                      <div className="flex items-center gap-3 p-3">
                        {produto.image_url ? (
                          <img 
                            src={produto.image_url} 
                            alt={produto.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{produto.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {produto.code || 'Sem código'}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="font-medium">{formatCurrency(produto.cost_price || 0)}</p>
                          <Badge variant={(produto.current_stock ?? 0) > 0 ? "default" : "secondary"}>
                            {(produto.current_stock ?? 0) > 0 ? `${produto.current_stock} ${produto.unit || 'UN'}` : "Sem estoque"}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Formulário expandido para adicionar item */}
      {isAddingItem && !readOnly && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Novo Item
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { setIsAddingItem(false); setNewItem(emptyItem); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {showFiscalFields && (
                <div className="space-y-1">
                  <Label className="text-xs">Código</Label>
                  <Input
                    placeholder="SKU/Código"
                    value={newItem.codigo_produto || ''}
                    onChange={(e) => setNewItem({ ...newItem, codigo_produto: e.target.value })}
                  />
                </div>
              )}
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Descrição *</Label>
                <Input
                  placeholder="Nome/descrição do item"
                  value={newItem.descricao || ''}
                  onChange={(e) => setNewItem({ ...newItem, descricao: e.target.value })}
                  className={!newItem.descricao ? 'border-destructive/50' : ''}
                />
              </div>
              {showFiscalFields && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">NCM</Label>
                    <Input
                      placeholder="00000000"
                      value={newItem.ncm || ''}
                      onChange={(e) => setNewItem({ ...newItem, ncm: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">CFOP</Label>
                    <Input
                      placeholder="0000"
                      value={newItem.cfop || ''}
                      onChange={(e) => setNewItem({ ...newItem, cfop: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unidade</Label>
                    <Input
                      placeholder="UN"
                      value={newItem.unidade || ''}
                      onChange={(e) => setNewItem({ ...newItem, unidade: e.target.value })}
                    />
                  </div>
                </>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Quantidade</Label>
                <Input
                  type="number"
                  placeholder="1"
                  value={newItem.quantidade || ''}
                  onChange={(e) => setNewItem({ ...newItem, quantidade: Number(e.target.value) })}
                  min={1}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valor Unitário *</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={newItem.valor_unitario || ''}
                  onChange={(e) => setNewItem({ ...newItem, valor_unitario: Number(e.target.value) })}
                  min={0}
                  step={0.01}
                  className={!newItem.valor_unitario ? 'border-destructive/50' : ''}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Total</Label>
                <div className="h-10 flex items-center px-3 bg-muted rounded-md font-medium">
                  {formatCurrency((newItem.quantidade || 0) * (newItem.valor_unitario || 0))}
                </div>
              </div>
            </div>

            {requireCentroCusto && (
              <div className="space-y-1">
                <Label className="text-xs">Centro de Custo *</Label>
                <Select
                  value={newItem.centro_custo || "_placeholder"}
                  onValueChange={(v) => setNewItem({ ...newItem, centro_custo: v === "_placeholder" ? "" : v })}
                >
                  <SelectTrigger className={!newItem.centro_custo ? 'border-destructive/50' : ''}>
                    <SelectValue placeholder="Selecione o centro de custo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_placeholder" disabled>Selecione</SelectItem>
                    {CENTROS_CUSTO.map((cc) => (
                      <SelectItem key={cc.value} value={cc.value}>{cc.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Especificações / Observações</Label>
              <Textarea
                placeholder="Cores, tamanhos, detalhes técnicos..."
                value={newItem.especificacoes || ''}
                onChange={(e) => setNewItem({ ...newItem, especificacoes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setIsAddingItem(false); setNewItem(emptyItem); }}>
                Cancelar
              </Button>
              <Button onClick={handleAddItem} disabled={!newItem.descricao || !newItem.valor_unitario || (requireCentroCusto && !newItem.centro_custo)}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Item
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de itens */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {showFiscalFields && <TableHead className="w-[90px]">Código</TableHead>}
              <TableHead className={showFiscalFields ? "w-[30%]" : "w-[40%]"}>Descrição</TableHead>
              {showFiscalFields && (
                <>
                  <TableHead className="w-[80px]">NCM</TableHead>
                  <TableHead className="w-[60px]">CFOP</TableHead>
                  <TableHead className="w-[50px]">UN</TableHead>
                </>
              )}
              {requireCentroCusto && <TableHead className="w-[130px]">Centro de Custo</TableHead>}
              <TableHead className="w-[60px] text-center">Qtd</TableHead>
              <TableHead className="w-[100px] text-right">V.Unit.</TableHead>
              <TableHead className="w-[100px] text-right">Total</TableHead>
              {!readOnly && <TableHead className="w-[80px]">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <Collapsible key={item.id} open={expandedId === item.id} onOpenChange={(open) => setExpandedId(open ? item.id : null)} asChild>
                <>
                  <TableRow className="group">
                    {editingId === item.id ? (
                      <>
                        {showFiscalFields && (
                          <TableCell>
                            <Input className="h-8" value={item.codigo_produto || ''} onChange={(e) => handleUpdateItem(item.id, { codigo_produto: e.target.value })} placeholder="Código" />
                          </TableCell>
                        )}
                        <TableCell>
                          <Input className="h-8" value={item.descricao} onChange={(e) => handleUpdateItem(item.id, { descricao: e.target.value })} />
                        </TableCell>
                        {showFiscalFields && (
                          <>
                            <TableCell>
                              <Input className="h-8" value={item.ncm || ''} onChange={(e) => handleUpdateItem(item.id, { ncm: e.target.value })} />
                            </TableCell>
                            <TableCell>
                              <Input className="h-8" value={item.cfop || ''} onChange={(e) => handleUpdateItem(item.id, { cfop: e.target.value })} />
                            </TableCell>
                            <TableCell>
                              <Input className="h-8 w-12" value={item.unidade || 'UN'} onChange={(e) => handleUpdateItem(item.id, { unidade: e.target.value })} />
                            </TableCell>
                          </>
                        )}
                        {requireCentroCusto && (
                          <TableCell>
                            <Select
                              value={item.centro_custo || "_placeholder"}
                              onValueChange={(v) => handleUpdateItem(item.id, { centro_custo: v === "_placeholder" ? "" : v })}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_placeholder" disabled>-</SelectItem>
                                {CENTROS_CUSTO.map((cc) => (
                                  <SelectItem key={cc.value} value={cc.value}>{cc.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}
                        <TableCell>
                          <Input type="number" className="h-8 w-16" value={item.quantidade} onChange={(e) => handleUpdateItem(item.id, { quantidade: Number(e.target.value) })} min={1} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" className="h-8" value={item.valor_unitario} onChange={(e) => handleUpdateItem(item.id, { valor_unitario: Number(e.target.value) })} min={0} step={0.01} />
                        </TableCell>
                        <TableCell className="font-medium text-right">{formatCurrency(item.valor_total)}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        {showFiscalFields && (
                          <TableCell className="font-mono text-xs">{item.codigo_produto || '-'}</TableCell>
                        )}
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <div className="cursor-pointer">
                              <p className="font-medium flex items-center gap-1">
                                {item.descricao}
                                {item.especificacoes && (
                                  expandedId === item.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                )}
                              </p>
                            </div>
                          </CollapsibleTrigger>
                        </TableCell>
                        {showFiscalFields && (
                          <>
                            <TableCell className="font-mono text-xs">{item.ncm || '-'}</TableCell>
                            <TableCell className="font-mono text-xs">{item.cfop || '-'}</TableCell>
                            <TableCell className="text-xs">{item.unidade || 'UN'}</TableCell>
                          </>
                        )}
                        {requireCentroCusto && (
                          <TableCell>
                            <span className="text-xs">
                              {CENTROS_CUSTO.find(cc => cc.value === item.centro_custo)?.label || '-'}
                            </span>
                          </TableCell>
                        )}
                        <TableCell className="text-center">{item.quantidade}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.valor_unitario)}</TableCell>
                        <TableCell className="font-medium text-right">{formatCurrency(item.valor_total)}</TableCell>
                        {!readOnly && (
                          <TableCell>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button size="icon" variant="ghost" onClick={() => setEditingId(item.id)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => handleRemoveItem(item.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </>
                    )}
                  </TableRow>
                  {item.especificacoes && (
                    <CollapsibleContent asChild>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={showFiscalFields ? 9 : 5} className="py-2">
                          <p className="text-xs text-muted-foreground"><strong>Especificações:</strong> {item.especificacoes}</p>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  )}
                </>
              </Collapsible>
            ))}

            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={showFiscalFields ? 9 : 5} className="text-center text-muted-foreground py-8">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum item adicionado</p>
                  {!readOnly && <p className="text-xs mt-1">Clique em "Adicionar Item" para começar</p>}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Total dos itens */}
      {items.length > 0 && (
        <div className="flex justify-end">
          <div className="bg-muted/50 rounded-lg px-4 py-2">
            <span className="text-sm text-muted-foreground mr-2">Total dos Itens:</span>
            <span className="font-bold text-lg">{formatCurrency(totalItems)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
