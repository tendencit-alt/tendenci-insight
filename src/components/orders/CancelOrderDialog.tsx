import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface CancelOrderDialogProps {
  orderId: string;
  orderNumber: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CancelOrderDialog({ orderId, orderNumber, open, onOpenChange, onSuccess }: CancelOrderDialogProps) {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    if (!motivo.trim()) {
      toast.error('Informe o motivo do cancelamento');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelado',
          motivo_cancelamento: motivo,
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success(`Pedido #${orderNumber} cancelado`);
      setMotivo('');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao cancelar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar Pedido #{orderNumber}</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. Informe o motivo do cancelamento.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="motivo">Motivo do Cancelamento *</Label>
          <Textarea
            id="motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Descreva o motivo do cancelamento..."
            rows={3}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={loading || !motivo.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar Cancelamento
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
