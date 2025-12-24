import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  Calculator, 
  Package, 
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AddInsumoDialog } from './AddInsumoDialog';

interface ProductionFichaTecnicaProps {
  productionOrderId: string;
}

export function ProductionFichaTecnica({ productionOrderId }: ProductionFichaTecnicaProps) {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Buscar production_product vinculado à OP
  const { data: productionProduct, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['production-product', productionOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_products')
        .select('*')
        .eq('production_order_id', productionOrderId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });

  // Buscar itens da BOM
  const { data: bomItems = [], isLoading: isLoadingBom } = useQuery({
    queryKey: ['production-product-bom', productionProduct?.id],
    queryFn: async () => {
      if (!productionProduct?.id) return [];
      
      const { data, error } = await supabase
        .from('production_product_bom')
        .select(`
          *,
          insumo:products(name, code, current_stock)
        `)
        .eq('production_product_id', productionProduct.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!productionProduct?.id
  });

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
      queryClient.invalidateQueries({ queryKey: ['production-product-bom'] });
      queryClient.invalidateQueries({ queryKey: ['production-product'] });
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
      if (!productionProduct?.id) return;
      
      const { error } = await supabase
        .from('production_products')
        .update({ status: 'aprovado' })
        .eq('id', productionProduct.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-product'] });
      toast.success('Ficha técnica aprovada');
    },
    onError: () => {
      toast.error('Erro ao aprovar ficha técnica');
    }
  });

  const isLoading = isLoadingProduct || isLoadingBom;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!productionProduct) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p>Ficha técnica não encontrada</p>
        <p className="text-sm">Isso pode ocorrer em OPs antigas. Tente recriar a OP.</p>
      </div>
    );
  }

  const cmvTotal = productionProduct.cmv_total || 0;
  const totalItens = bomItems.length;

  const getStatusBadge = () => {
    switch (productionProduct.status) {
      case 'aprovado':
        return <Badge className="bg-green-100 text-green-800">Aprovado</Badge>;
      case 'finalizado':
        return <Badge className="bg-blue-100 text-blue-800">Finalizado</Badge>;
      default:
        return <Badge variant="secondary">Rascunho</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* KPIs da Ficha Técnica */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calculator className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CMV Total</p>
                <p className="text-xl font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cmvTotal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Package className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Insumos</p>
                <p className="text-xl font-bold">{totalItens}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header com Status e Ações */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-5 w-5" />
              Ficha Técnica
              {getStatusBadge()}
            </CardTitle>
            <div className="flex gap-2">
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
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Insumo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {bomItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Package className="h-10 w-10 mb-3 opacity-40" />
              <p className="font-medium">Nenhum insumo cadastrado</p>
              <p className="text-sm">Adicione insumos para calcular o CMV</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Primeiro Insumo
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Insumo</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead className="text-right">Custo Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bomItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.insumo_nome}</p>
                          {item.insumo?.code && (
                            <p className="text-xs text-muted-foreground">Código: {item.insumo.code}</p>
                          )}
                          {item.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.quantidade} {item.unidade}
                      </TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.custo_unitario)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.subtotal || 0)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Total */}
              <div className="mt-4 p-4 bg-muted rounded-lg flex items-center justify-between">
                <span className="font-medium">CMV Total</span>
                <span className="text-2xl font-bold text-primary">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cmvTotal)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Adicionar Insumo */}
      <AddInsumoDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        productionProductId={productionProduct.id}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['production-product-bom'] });
          queryClient.invalidateQueries({ queryKey: ['production-product'] });
        }}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Insumo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este insumo da ficha técnica?
              O CMV será recalculado automaticamente.
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
