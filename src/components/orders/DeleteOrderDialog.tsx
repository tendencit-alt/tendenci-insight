import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
import { Loader2, Trash2 } from 'lucide-react';
import { useDeleteWithTracking } from '@/hooks/useDeleteWithTracking';

interface DeleteOrderDialogProps {
  orderId: string;
  orderNumber: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteOrderDialog({
  orderId,
  orderNumber,
  open,
  onOpenChange,
  onSuccess,
}: DeleteOrderDialogProps) {
  const [loading, setLoading] = useState(false);
  const { logDeletion } = useDeleteWithTracking();

  const handleDelete = async () => {
    setLoading(true);
    try {
      // Fetch order data before deletion for tracking
      const { data: orderData } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .single();

      // Log the deletion for traceability
      if (orderData) {
        await logDeletion({
          table: 'orders',
          id: orderId,
          data: orderData,
          type: 'order',
          identifier: `#PED-${String(orderNumber).padStart(4, '0')}`,
        });
      }

      // Cascade delete: removes order + all derived records
      // (projects, production orders, financial entries, quotes, contracts, etc.)
      const { error: cascadeError } = await supabase.rpc('delete_order_cascade', {
        _order_id: orderId,
      });

      if (cascadeError) throw cascadeError;

      toast.success(`Pedido #${orderNumber} e registros vinculados excluídos`);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error('Erro ao excluir pedido: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Excluir Pedido #{orderNumber}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. O pedido e todos os seus itens serão
            permanentemente excluídos do sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Pedido
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
