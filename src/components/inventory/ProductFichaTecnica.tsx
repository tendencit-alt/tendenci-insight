import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileSpreadsheet, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { EmbeddedFichaTecnica } from '@/components/ia-config/EmbeddedFichaTecnica';

interface ProductFichaTecnicaProps {
  productId: string;
  productName: string;
}

export default function ProductFichaTecnica({ productId, productName }: ProductFichaTecnicaProps) {
  const queryClient = useQueryClient();

  // Buscar ficha técnica existente (is_template = true)
  const { data: fichaTecnica, isLoading } = useQuery({
    queryKey: ['product-ficha-tecnica', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_products')
        .select('*')
        .eq('product_id', productId)
        .eq('is_template', true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!productId
  });

  // Mutation para criar ficha técnica
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('production_products')
        .insert({
          name: productName,
          product_id: productId,
          is_template: true,
          status: 'rascunho',
          cmv_total: 0
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-ficha-tecnica', productId] });
      toast.success('Ficha técnica criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar ficha técnica: ' + error.message);
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

  if (!fichaTecnica) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="font-semibold text-lg mb-2">Nenhuma ficha técnica cadastrada</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Crie uma ficha técnica para definir a composição e custo de produção deste produto
          </p>
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
