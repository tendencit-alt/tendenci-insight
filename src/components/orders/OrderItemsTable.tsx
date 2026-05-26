import { useState, useEffect } from 'react';
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
import { useCostCenters } from '@/hooks/useCostCenters';
import { useProjects } from '@/hooks/useProjects';
import { CurrencyInput, MoneyInput, parseCurrencyToNumber, formatToCurrencyDisplay } from '@/components/ui/currency-input';

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
  project_id?: string;
}

interface OrderItemsTableProps {
  items: OrderItem[];
  onItemsChange: (items: OrderItem[]) => void;
  readOnly?: boolean;
  showFiscalFields?: boolean;
  requireCentroCusto?: boolean;
  requireProject?: boolean;
  clientName?: string;
  draftStorageKey?: string;
}

interface ProdutoEstoque {
  id: string;
  name: string;
  code: string | null;
  sale_price: number | null;
  current_stock: number | null;
  unit: string | null;
  active: boolean | null;
  image_url: string | null;
  category: {
    name: string;
  } | null;
}

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
  project_id: '',
};

export function OrderItemsTable({ items, onItemsChange, readOnly = false, showFiscalFields = false, requireCentroCusto = false, requireProject = false, clientName, draftStorageKey }: OrderItemsTableProps) {
  const { costCenters: CENTROS_CUSTO } = useCostCenters();
  const { projects: PROJETOS } = useProjects();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItem, setNewItem] = useState<Partial<OrderItem>>(emptyItem);
  const [autoProjectDone, setAutoProjectDone] = useState(false);
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [customProjectName, setCustomProjectName] = useState('');
  const [showNewProjectInputInline, setShowNewProjectInputInline] = useState<string | null>(null);
  const [customProjectNameInline, setCustomProjectNameInline] = useState('');

  const NEW_PROJECT_VALUE = '__new_from_client__';
  const CUSTOM_PROJECT_PREFIX = '__custom_project__';

  useEffect(() => {
    if (!draftStorageKey || typeof window === 'undefined') return;

    const raw = window.localStorage.getItem(draftStorageKey);
    if (!raw) return;

    try {
      const draft = JSON.parse(raw);
      if (draft.orderItemsTable) {
        if (typeof draft.orderItemsTable.isAddingItem === 'boolean') setIsAddingItem(draft.orderItemsTable.isAddingItem);
        if (draft.orderItemsTable.newItem) setNewItem(draft.orderItemsTable.newItem);
        if (typeof draft.orderItemsTable.autoProjectDone === 'boolean') setAutoProjectDone(draft.orderItemsTable.autoProjectDone);
        if (typeof draft.orderItemsTable.showNewProjectInput === 'boolean') setShowNewProjectInput(draft.orderItemsTable.showNewProjectInput);
        if (typeof draft.orderItemsTable.customProjectName === 'string') setCustomProjectName(draft.orderItemsTable.customProjectName);
        if (typeof draft.orderItemsTable.showNewProjectInputInline === 'string' || draft.orderItemsTable.showNewProjectInputInline === null) setShowNewProjectInputInline(draft.orderItemsTable.showNewProjectInputInline);
        if (typeof draft.orderItemsTable.customProjectNameInline === 'string') setCustomProjectNameInline(draft.orderItemsTable.customProjectNameInline);
        if (typeof draft.orderItemsTable.editingId === 'string' || draft.orderItemsTable.editingId === null) setEditingId(draft.orderItemsTable.editingId);
        if (typeof draft.orderItemsTable.expandedId === 'string' || draft.orderItemsTable.expandedId === null) setExpandedId(draft.orderItemsTable.expandedId);
      }
    } catch {
      // noop: the parent draft handler already cleans invalid payloads
    }
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftStorageKey || typeof window === 'undefined') return;

    const raw = window.localStorage.getItem(draftStorageKey);
    if (!raw) return;

    try {
      const draft = JSON.parse(raw);
      window.localStorage.setItem(
        draftStorageKey,
        JSON.stringify({
          ...draft,
          orderItemsTable: {
            isAddingItem,
            newItem,
            autoProjectDone,
            showNewProjectInput,
            customProjectName,
            showNewProjectInputInline,
            customProjectNameInline,
            editingId,
            expandedId,
          },
        })
      );
    } catch {
      // noop: parent draft is source of truth
    }
  }, [draftStorageKey, isAddingItem, newItem, autoProjectDone, showNewProjectInput, customProjectName, showNewProjectInputInline, customProjectNameInline, editingId, expandedId]);

  useEffect(() => {
    if (!isAddingItem || !clientName || autoProjectDone) return;

    const normalizedClientName = clientName.trim().toLowerCase();
    const existing = PROJETOS.find((project) => project.label.trim().toLowerCase() === normalizedClientName);

    if (existing) {
      setNewItem((prev) => ({ ...prev, project_id: existing.value }));
    } else {
      // Pre-fill with marker to create new project from client name
      setNewItem((prev) => ({ ...prev, project_id: NEW_PROJECT_VALUE }));
    }

    setAutoProjectDone(true);
  }, [isAddingItem, clientName, PROJETOS, autoProjectDone]);

  useEffect(() => {
    if (!isAddingItem) setAutoProjectDone(false);
  }, [isAddingItem]);
  
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
          sale_price,
          current_stock, 
          unit, 
          active,
          image_url,
          ia_produto_id,
          category:product_categories(name)
        `)
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      
      // Se produto tem ia_produto_id e sale_price = 0/null, buscar preco_base da IA como fallback
      const produtosComIA = (data || []).filter(p => p.ia_produto_id && (p.sale_price === 0 || p.sale_price === null));
      
      if (produtosComIA.length > 0) {
        const iaIds = produtosComIA.map(p => p.ia_produto_id);
        const { data: iaData } = await supabase
          .from('tendenci_ia_produtos')
          .select('id, preco_base')
          .in('id', iaIds);
        
        const iaPrecos = new Map((iaData || []).map(ia => [ia.id, ia.preco_base]));
        
        const produtosAtualizados = (data || []).map(p => {
          if (p.ia_produto_id && (p.sale_price === 0 || p.sale_price === null)) {
            const precoIA = iaPrecos.get(p.ia_produto_id);
            if (precoIA) {
              return { ...p, sale_price: precoIA };
            }
          }
          return p;
        });
        
        setProdutosEstoque(produtosAtualizados as ProdutoEstoque[]);
      } else {
        setProdutosEstoque((data || []) as ProdutoEstoque[]);
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
    // Pré-preenche o formulário de novo item com os dados do produto importado
    setNewItem({
      descricao: produto.name,
      quantidade: 1,
      valor_unitario: produto.sale_price || 0,
      codigo_produto: produto.code || '',
      unidade: produto.unit || 'UN',
      especificacoes: '',
      centro_custo: '',
      project_id: '',
    });
    setAutoProjectDone(false);
    setShowProductSelector(false);
    setIsAddingItem(true);
    toast.success(`${produto.name} importado — preencha Centro de Custo e confirme`);
  };

  const handleAddItem = () => {
    if (!newItem.descricao || !newItem.valor_unitario) return;
    if (requireCentroCusto && !newItem.centro_custo) return;
    if (requireProject && !newItem.project_id) return;

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
      project_id: newItem.project_id,
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

  const getCentroCustoLabel = (value?: string) => {
    return CENTROS_CUSTO.find((cc) => cc.value === value)?.label || '-';
  };

  return (
    <div className="space-y-4 min-w-0">
      {!readOnly && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Package className="h-5 w-5 shrink-0 text-primary" />
            <span className="min-w-0 font-medium">Itens do Pedido ({items.length})</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <Button variant="outline" onClick={() => setShowProductSelector(true)} className="w-full gap-2 sm:w-auto">
              <Import className="h-4 w-4" />
              Importar Produto
            </Button>
            <Button onClick={() => setIsAddingItem(true)} disabled={isAddingItem} className="w-full gap-2 sm:w-auto">
              <Plus className="h-4 w-4" />
              Adicionar Manual
            </Button>
          </div>
        </div>
      )}

      <Dialog open={showProductSelector} onOpenChange={setShowProductSelector}>
        <DialogContent className="max-h-[80vh] w-[calc(100vw-2rem)] max-w-3xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Selecionar Produto Cadastrado
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <ScrollArea className="h-[400px] pr-4">
              {loadingProdutos ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-muted-foreground">Carregando...</span>
                </div>
              ) : produtosFiltrados.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Package className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>Nenhum produto encontrado</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {produtosFiltrados.map(produto => (
                    <Card
                      key={produto.id}
                      className="cursor-pointer transition-colors hover:border-primary"
                      onClick={() => addProdutoToOrder(produto)}
                    >
                      <div className="flex items-center gap-3 p-3">
                        {produto.image_url ? (
                          <img 
                            src={produto.image_url} 
                            alt={produto.name}
                            className="h-12 w-12 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{produto.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {produto.code || 'Sem código'}
                          </p>
                        </div>
                        <div className="shrink-0 text-right space-y-1">
                          <p className="font-medium">{formatCurrency(produto.sale_price || 0)}</p>
                          {(() => {
                            const s = produto.current_stock ?? 0;
                            if (s < 0) return <Badge variant="destructive">Negativo: {s} {produto.unit || 'UN'}</Badge>;
                            if (s === 0) return <Badge variant="secondary">Sem estoque</Badge>;
                            return <Badge variant="default">{s} {produto.unit || 'UN'}</Badge>;
                          })()}
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

      {isAddingItem && !readOnly && (
        <Card className="overflow-hidden border-primary/50 bg-primary/5">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Plus className="h-4 w-4" />
                Novo Item
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { setIsAddingItem(false); setNewItem(emptyItem); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 min-w-0">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
              <div className="space-y-1 sm:col-span-2 xl:col-span-2">
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
                <MoneyInput
                  value={newItem.valor_unitario ?? 0}
                  onChange={(n) => setNewItem({ ...newItem, valor_unitario: n })}
                  className={!newItem.valor_unitario ? 'border-destructive/50' : ''}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Total</Label>
                <div className="flex h-10 items-center rounded-md bg-muted px-3 font-medium">
                  {formatCurrency((newItem.quantidade || 0) * (newItem.valor_unitario || 0))}
                </div>
              </div>
            </div>

            {requireCentroCusto && (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="space-y-1 min-w-0">
                  <Label className="text-xs">Centro de Custo *</Label>
                  <Select
                    value={newItem.centro_custo || '_placeholder'}
                    onValueChange={(v) => setNewItem({ ...newItem, centro_custo: v === '_placeholder' ? '' : v })}
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

                <div className="space-y-1 min-w-0">
                  <Label className="text-xs">Projeto {requireProject ? '*' : ''}</Label>
                  {showNewProjectInput ? (
                    <div className="flex items-center gap-2">
                      <Input
                        className="flex-1"
                        placeholder="Nome do novo projeto"
                        value={customProjectName}
                        onChange={(e) => setCustomProjectName(e.target.value)}
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="shrink-0"
                        disabled={!customProjectName.trim()}
                        onClick={() => {
                          setNewItem({ ...newItem, project_id: `${CUSTOM_PROJECT_PREFIX}${customProjectName.trim()}` });
                          setShowNewProjectInput(false);
                        }}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        OK
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => { setShowNewProjectInput(false); setCustomProjectName(''); }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Select
                        value={newItem.project_id || '_placeholder'}
                        onValueChange={(v) => setNewItem({ ...newItem, project_id: v === '_placeholder' ? '' : v })}
                      >
                        <SelectTrigger className={`flex-1 ${requireProject && !newItem.project_id ? 'border-destructive/50' : ''}`}>
                          <SelectValue placeholder={requireProject ? 'Selecione o projeto' : 'Selecionar agora ou gerar no salvamento'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_placeholder" disabled>{requireProject ? 'Selecione' : 'Gerar automaticamente ao salvar'}</SelectItem>
                          {clientName && (
                            <SelectItem value={NEW_PROJECT_VALUE}>
                              Novo projeto: {clientName}
                            </SelectItem>
                          )}
                          {newItem.project_id?.startsWith(CUSTOM_PROJECT_PREFIX) && (
                            <SelectItem value={newItem.project_id}>
                              Novo projeto: {newItem.project_id.replace(CUSTOM_PROJECT_PREFIX, '')}
                            </SelectItem>
                          )}
                          {PROJETOS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        title="Criar novo projeto com nome personalizado"
                        onClick={() => { setCustomProjectName(clientName || ''); setShowNewProjectInput(true); }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
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

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => { setIsAddingItem(false); setNewItem(emptyItem); }} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button onClick={handleAddItem} disabled={!newItem.descricao || !newItem.valor_unitario || (requireCentroCusto && !newItem.centro_custo) || (requireProject && !newItem.project_id)} className="w-full sm:w-auto">
                <Plus className="mr-1 h-4 w-4" />
                Adicionar Item
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3 xl:hidden">
        {items.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Package className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>Nenhum item adicionado</p>
              {!readOnly && <p className="mt-1 text-xs">Clique em "Adicionar Manual" para começar</p>}
            </CardContent>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="break-words font-medium">{item.descricao}</p>
                    {showFiscalFields && item.codigo_produto && (
                      <p className="text-xs text-muted-foreground">Código: {item.codigo_produto}</p>
                    )}
                  </div>
                  {!readOnly && (
                    <div className="flex shrink-0 gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditingId(editingId === item.id ? null : item.id)}>
                        {editingId === item.id ? <Check className="h-4 w-4 text-primary" /> : <Edit2 className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleRemoveItem(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>

                {editingId === item.id ? (
                  <div className="grid grid-cols-1 gap-3">
                    <Input value={item.descricao} onChange={(e) => handleUpdateItem(item.id, { descricao: e.target.value })} />
                    {showFiscalFields && (
                      <div className="grid grid-cols-2 gap-3">
                        <Input value={item.codigo_produto || ''} onChange={(e) => handleUpdateItem(item.id, { codigo_produto: e.target.value })} placeholder="Código" />
                        <Input value={item.unidade || 'UN'} onChange={(e) => handleUpdateItem(item.id, { unidade: e.target.value })} placeholder="Unidade" />
                        <Input value={item.ncm || ''} onChange={(e) => handleUpdateItem(item.id, { ncm: e.target.value })} placeholder="NCM" />
                        <Input value={item.cfop || ''} onChange={(e) => handleUpdateItem(item.id, { cfop: e.target.value })} placeholder="CFOP" />
                      </div>
                    )}
                    {requireCentroCusto && (
                      <Select
                        value={item.centro_custo || '_placeholder'}
                        onValueChange={(v) => handleUpdateItem(item.id, { centro_custo: v === '_placeholder' ? '' : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Centro de custo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_placeholder" disabled>Selecione</SelectItem>
                          {CENTROS_CUSTO.map((cc) => (
                            <SelectItem key={cc.value} value={cc.value}>{cc.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <Input type="number" value={item.quantidade} onChange={(e) => handleUpdateItem(item.id, { quantidade: Number(e.target.value) })} min={1} placeholder="Quantidade" />
                      <CurrencyInput value={formatToCurrencyDisplay(item.valor_unitario)} onChange={(v) => handleUpdateItem(item.id, { valor_unitario: parseCurrencyToNumber(v) })} />
                    </div>
                    <Textarea value={item.especificacoes || ''} onChange={(e) => handleUpdateItem(item.id, { especificacoes: e.target.value })} placeholder="Especificações / observações" rows={2} />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/30 p-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Quantidade</p>
                        <p className="font-medium">{item.quantidade}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Unidade</p>
                        <p className="font-medium">{item.unidade || 'UN'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Valor unitário</p>
                        <p className="font-medium">{formatCurrency(item.valor_unitario)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-medium">{formatCurrency(item.valor_total)}</p>
                      </div>
                      {requireCentroCusto && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">Centro de custo</p>
                          <p className="font-medium break-words">{getCentroCustoLabel(item.centro_custo)}</p>
                        </div>
                      )}
                      {requireProject && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">Projeto</p>
                          <p className="font-medium break-words">{item.project_id === NEW_PROJECT_VALUE ? `Novo: ${clientName}` : item.project_id?.startsWith(CUSTOM_PROJECT_PREFIX) ? `Novo: ${item.project_id.replace(CUSTOM_PROJECT_PREFIX, '')}` : (PROJETOS.find((project) => project.value === item.project_id)?.label || '-')}</p>
                        </div>
                      )}
                      {showFiscalFields && (item.ncm || item.cfop) && (
                        <div className="col-span-2 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">NCM</p>
                            <p className="font-medium">{item.ncm || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">CFOP</p>
                            <p className="font-medium">{item.cfop || '-'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {item.especificacoes && (
                      <div className="rounded-lg bg-muted/20 p-3 text-sm">
                        <p className="text-xs text-muted-foreground">Especificações</p>
                        <p className="break-words">{item.especificacoes}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border xl:block">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              {showFiscalFields && <TableHead className="w-[90px]">Código</TableHead>}
              <TableHead className={showFiscalFields ? 'w-[30%]' : 'w-[40%]'}>Descrição</TableHead>
              {showFiscalFields && (
                <>
                  <TableHead className="w-[80px]">NCM</TableHead>
                  <TableHead className="w-[60px]">CFOP</TableHead>
                  <TableHead className="w-[50px]">UN</TableHead>
                </>
              )}
              {requireCentroCusto && <TableHead className="w-[130px]">Centro de Custo</TableHead>}
              {requireProject && <TableHead className="w-[140px]">Projeto</TableHead>}
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
                              value={item.centro_custo || '_placeholder'}
                              onValueChange={(v) => handleUpdateItem(item.id, { centro_custo: v === '_placeholder' ? '' : v })}
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
                        {requireProject && (
                          <TableCell>
                            {showNewProjectInputInline === item.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  className="h-8 flex-1"
                                  placeholder="Nome do projeto"
                                  value={customProjectNameInline}
                                  onChange={(e) => setCustomProjectNameInline(e.target.value)}
                                  autoFocus
                                />
                                <Button
                                  type="button"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  disabled={!customProjectNameInline.trim()}
                                  onClick={() => {
                                    handleUpdateItem(item.id, { project_id: `${CUSTOM_PROJECT_PREFIX}${customProjectNameInline.trim()}` });
                                    setShowNewProjectInputInline(null);
                                    setCustomProjectNameInline('');
                                  }}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  onClick={() => { setShowNewProjectInputInline(null); setCustomProjectNameInline(''); }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Select
                                  value={item.project_id || '_placeholder'}
                                  onValueChange={(v) => handleUpdateItem(item.id, { project_id: v === '_placeholder' ? '' : v })}
                                >
                                  <SelectTrigger className="h-8 flex-1">
                                    <SelectValue placeholder="Projeto" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_placeholder" disabled>Selecione</SelectItem>
                                    {clientName && (
                                      <SelectItem value={NEW_PROJECT_VALUE}>Novo projeto: {clientName}</SelectItem>
                                    )}
                                    {item.project_id?.startsWith(CUSTOM_PROJECT_PREFIX) && (
                                      <SelectItem value={item.project_id}>Novo projeto: {item.project_id.replace(CUSTOM_PROJECT_PREFIX, '')}</SelectItem>
                                    )}
                                    {PROJETOS.map((project) => (
                                      <SelectItem key={project.value} value={project.value}>{project.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  title="Criar novo projeto"
                                  onClick={() => { setCustomProjectNameInline(clientName || ''); setShowNewProjectInputInline(item.id); }}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <Input type="number" className="h-8 w-16" value={item.quantidade} onChange={(e) => handleUpdateItem(item.id, { quantidade: Number(e.target.value) })} min={1} />
                        </TableCell>
                        <TableCell>
                          <CurrencyInput className="h-8" value={formatToCurrencyDisplay(item.valor_unitario)} onChange={(v) => handleUpdateItem(item.id, { valor_unitario: parseCurrencyToNumber(v) })} />
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.valor_total)}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                            <Check className="h-4 w-4 text-primary" />
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
                              <p className="flex items-center gap-1 font-medium">
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
                              {getCentroCustoLabel(item.centro_custo)}
                            </span>
                          </TableCell>
                        )}
                        {requireProject && (
                          <TableCell>
                            <span className="text-xs">
                              {item.project_id === NEW_PROJECT_VALUE ? `Novo: ${clientName}` : item.project_id?.startsWith(CUSTOM_PROJECT_PREFIX) ? `Novo: ${item.project_id.replace(CUSTOM_PROJECT_PREFIX, '')}` : (PROJETOS.find((project) => project.value === item.project_id)?.label || '-')}
                            </span>
                          </TableCell>
                        )}
                        <TableCell className="text-center">{item.quantidade}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.valor_unitario)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.valor_total)}</TableCell>
                        {!readOnly && (
                          <TableCell>
                            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
                        <TableCell colSpan={showFiscalFields ? (requireCentroCusto && requireProject ? 11 : requireCentroCusto || requireProject ? 10 : 9) : (requireCentroCusto && requireProject ? 7 : requireCentroCusto || requireProject ? 6 : 5)} className="py-2">
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
                <TableCell colSpan={showFiscalFields ? (requireCentroCusto && requireProject ? 11 : requireCentroCusto || requireProject ? 10 : 9) : (requireCentroCusto && requireProject ? 7 : requireCentroCusto || requireProject ? 6 : 5)} className="py-8 text-center text-muted-foreground">
                  <Package className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>Nenhum item adicionado</p>
                  {!readOnly && <p className="mt-1 text-xs">Clique em "Adicionar Item" para começar</p>}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {items.length > 0 && (
        <div className="flex justify-end">
          <div className="rounded-lg bg-muted/50 px-4 py-2 text-right">
            <span className="mr-2 text-sm text-muted-foreground">Total dos Itens:</span>
            <span className="text-lg font-bold break-words">{formatCurrency(totalItems)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
