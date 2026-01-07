import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { 
  Trash2, 
  Calculator, 
  Package, 
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Palette,
  Users
} from 'lucide-react';
import { AddInsumoDialog } from '@/components/production/AddInsumoDialog';
import { AddMaoObraDialog } from '@/components/production/AddMaoObraDialog';

interface EmbeddedFichaTecnicaProps {
  productionProductId: string;
  productName?: string;
  onStatusChange?: (status: string) => void;
}

interface BOMItem {
  id: string;
  insumo_nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  subtotal: number;
  cor: string | null;
  notes: string | null;
  insumo_id: string | null;
  insumo?: {
    name: string;
    code: string;
    current_stock: number;
    category_id: string;
    category?: {
      name: string;
    };
  } | null;
}

interface GroupedBOM {
  category: string;
  items: BOMItem[];
  subtotal: number;
}

const CATEGORY_ORDER = ['Móveis Rústico', 'Corda Náutica', 'Quadro', 'Industrial', 'Mão de Obra', 'Outros'];

export function EmbeddedFichaTecnica({ productionProductId, productName, onStatusChange }: EmbeddedFichaTecnicaProps) {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addMaoObraOpen, setAddMaoObraOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Buscar production_product
  const { data: productionProduct, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['production-product-embedded', productionProductId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_products')
        .select('*')
        .eq('id', productionProductId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!productionProductId
  });

  // Notificar status quando mudar
  useEffect(() => {
    if (productionProduct?.status && onStatusChange) {
      onStatusChange(productionProduct.status);
    }
  }, [productionProduct?.status, onStatusChange]);

  // Buscar itens da BOM
  const { data: bomItems = [], isLoading: isLoadingBom } = useQuery({
    queryKey: ['production-product-bom-embedded', productionProductId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_product_bom')
        .select(`
          *,
          insumo:products(
            name, 
            code, 
            current_stock, 
            category_id,
            category:product_categories(name)
          )
        `)
        .eq('production_product_id', productionProductId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as BOMItem[];
    },
    enabled: !!productionProductId
  });

  // Agrupar itens por categoria
  const groupedItems = useMemo(() => {
    const groups: Record<string, GroupedBOM> = {};
    
    bomItems.forEach(item => {
      const categoryName = item.insumo?.category?.name || 'Outros';
      
      if (!groups[categoryName]) {
        groups[categoryName] = {
          category: categoryName,
          items: [],
          subtotal: 0
        };
      }
      
      groups[categoryName].items.push(item);
      groups[categoryName].subtotal += item.subtotal || 0;
    });

    const sortedGroups = Object.values(groups).sort((a, b) => {
      const orderA = CATEGORY_ORDER.indexOf(a.category);
      const orderB = CATEGORY_ORDER.indexOf(b.category);
      return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
    });

    return sortedGroups;
  }, [bomItems]);

  // Inicializar categorias como expandidas
  useMemo(() => {
    const initial: Record<string, boolean> = {};
    groupedItems.forEach(g => {
      if (expandedCategories[g.category] === undefined) {
        initial[g.category] = true;
      }
    });
    if (Object.keys(initial).length > 0) {
      setExpandedCategories(prev => ({ ...prev, ...initial }));
    }
  }, [groupedItems]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Mutation para deletar insumo
  const deleteMutation = useMutation({
    mutationFn: async (bomId: string) => {
      const { error } = await supabase
        .from('production_product_bom')
        .delete()
        .eq('id', bomId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-product-bom-embedded'] });
      queryClient.invalidateQueries({ queryKey: ['production-product-embedded'] });
      toast.success('Insumo removido');
      setDeleteId(null);
    },
    onError: () => {
      toast.error('Erro ao remover insumo');
    }
  });

  // Mutation para aprovar ficha técnica
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!productionProductId) return;
      
      const { error } = await supabase
        .from('production_products')
        .update({ status: 'aprovado' })
        .eq('id', productionProductId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-product-embedded'] });
      toast.success('Ficha técnica aprovada');
    },
    onError: () => {
      toast.error('Erro ao aprovar ficha técnica');
    }
  });

  const handleBOMSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['production-product-bom-embedded'] });
    queryClient.invalidateQueries({ queryKey: ['production-product-embedded'] });
  };

  const isLoading = isLoadingProduct || isLoadingBom;

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!productionProduct) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Package className="h-12 w-12 mb-4" />
        <p>Ficha técnica não encontrada</p>
      </div>
    );
  }

  const cmvTotal = productionProduct.cmv_total || 0;
  const totalItens = bomItems.length;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calculator className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CMV Total</p>
                <p className="text-lg font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cmvTotal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Package className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Insumos</p>
                <p className="text-lg font-bold">{totalItens}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações */}
      <div className="flex gap-2 flex-wrap">
        {productionProduct.status === 'rascunho' && bomItems.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Aprovar
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAddMaoObraOpen(true)}
        >
          <Users className="h-4 w-4 mr-1" />
          + Mão de Obra
        </Button>
        <Button
          size="sm"
          onClick={() => setAddDialogOpen(true)}
        >
          <Package className="h-4 w-4 mr-1" />
          + Matéria Prima
        </Button>
      </div>

      {/* Lista de Insumos */}
      {bomItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <Package className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium">Nenhum insumo cadastrado</p>
          <p className="text-sm">Adicione insumos para calcular o CMV</p>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddMaoObraOpen(true)}
            >
              <Users className="h-4 w-4 mr-1" />
              + Mão de Obra
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddDialogOpen(true)}
            >
              <Package className="h-4 w-4 mr-1" />
              + Matéria Prima
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedItems.map((group) => (
            <Collapsible
              key={group.category}
              open={expandedCategories[group.category] !== false}
              onOpenChange={() => toggleCategory(group.category)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                  <div className="flex items-center gap-2">
                    {expandedCategories[group.category] !== false ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-medium">{group.category}</span>
                    <Badge variant="outline" className="text-xs">
                      {group.items.length} {group.items.length === 1 ? 'item' : 'itens'}
                    </Badge>
                  </div>
                  <span className="font-semibold text-sm">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(group.subtotal)}
                  </span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Insumo</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{item.insumo_nome}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {item.insumo?.code && (
                                  <span className="text-xs text-muted-foreground">
                                    {item.insumo.code}
                                  </span>
                                )}
                                {item.cor && (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <Palette className="h-3 w-3" />
                                    {item.cor}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {item.quantidade} {item.unidade}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.custo_unitario)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.subtotal || 0)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}

          {/* Total */}
          <div className="mt-4 p-4 bg-muted rounded-lg flex items-center justify-between">
            <span className="font-medium">CMV Total</span>
            <span className="text-xl font-bold text-primary">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cmvTotal)}
            </span>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <AddInsumoDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        productionProductId={productionProductId}
        onSuccess={handleBOMSuccess}
      />

      <AddMaoObraDialog
        open={addMaoObraOpen}
        onOpenChange={setAddMaoObraOpen}
        productionProductId={productionProductId}
        onSuccess={handleBOMSuccess}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Insumo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este insumo da ficha técnica?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
