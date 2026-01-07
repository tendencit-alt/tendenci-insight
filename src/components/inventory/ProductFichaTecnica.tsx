import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileSpreadsheet, Plus, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { EmbeddedFichaTecnica } from '@/components/ia-config/EmbeddedFichaTecnica';

interface ProductFichaTecnicaProps {
  productId: string;
  productName: string;
}

export default function ProductFichaTecnica({ productId, productName }: ProductFichaTecnicaProps) {
  const queryClient = useQueryClient();

  // Buscar ficha técnica existente (is_template = true)
  const { data: fichaTecnica, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['product-ficha-tecnica', productId],
    queryFn: async () => {
      if (!productId) {
        throw new Error('Product ID é obrigatório');
      }
      
      console.log('[ProductFichaTecnica] Buscando ficha técnica para product_id:', productId);
      
      // Usar limit(1) para evitar erro de múltiplas linhas
      const { data, error } = await supabase
        .from('production_products')
        .select('*')
        .eq('product_id', productId)
        .eq('is_template', true)
        .order('created_at', { ascending: true })
        .limit(1);
      
      if (error) {
        console.error('[ProductFichaTecnica] Erro na busca:', error);
        throw error;
      }
      
      // Retornar o primeiro resultado ou null
      const result = data?.[0] || null;
      console.log('[ProductFichaTecnica] Ficha encontrada:', result);
      return result;
    },
    enabled: !!productId
  });

  // Mutation para criar ficha técnica
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!productId) {
        throw new Error('Product ID é obrigatório para criar ficha técnica');
      }
      
      console.log('[ProductFichaTecnica] Criando ficha técnica para:', { productId, productName });
      
      const insertData = {
        name: productName,
        product_id: productId,
        is_template: true,
        status: 'rascunho',
        cmv_total: 0
      };
      
      console.log('[ProductFichaTecnica] Dados do insert:', insertData);
      
      const { data, error } = await supabase
        .from('production_products')
        .insert(insertData)
        .select()
        .single();
      
      if (error) {
        console.error('[ProductFichaTecnica] Erro ao criar:', error);
        throw error;
      }
      
      console.log('[ProductFichaTecnica] Ficha criada com sucesso:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product-ficha-tecnica', productId] });
      toast.success('Ficha técnica criada com sucesso!');
    },
    onError: (error: any) => {
      console.error('[ProductFichaTecnica] Erro completo:', error);
      toast.error(`Erro ao criar ficha técnica: ${error.message}`);
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (queryError) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar ficha técnica: {(queryError as Error).message}
            </AlertDescription>
          </Alert>
          <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!fichaTecnica) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="font-semibold text-lg mb-2">Nenhuma ficha técnica cadastrada</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Crie uma ficha técnica para definir a composição e custo de produção deste produto
          </p>
          
          {createMutation.error && (
            <Alert variant="destructive" className="mb-4 max-w-md mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {(createMutation.error as Error).message}
              </AlertDescription>
            </Alert>
          )}
          
          <Button 
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Criar Ficha Técnica
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <EmbeddedFichaTecnica
      productionProductId={fichaTecnica.id}
      productName={productName}
    />
  );
}
