import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Calendar, Clock } from 'lucide-react';
import { addBusinessDays, formatDateBR } from '@/utils/businessDays';

interface EditPrazoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  currentDiasUteis: number | null;
  createdAt: string | null;
  orderNumber: number;
}

export function EditPrazoDialog({
  open,
  onOpenChange,
  orderId,
  currentDiasUteis,
  createdAt,
  orderNumber,
}: EditPrazoDialogProps) {
  const queryClient = useQueryClient();
  const [diasUteis, setDiasUteis] = useState<string>(currentDiasUteis?.toString() || '');

  useEffect(() => {
    if (open) {
      setDiasUteis(currentDiasUteis?.toString() || '');
    }
  }, [open, currentDiasUteis]);

  const diasUteisNum = parseInt(diasUteis) || 0;
  const startDate = createdAt ? new Date(createdAt) : new Date();
  const previsaoEntrega = diasUteisNum > 0 ? addBusinessDays(startDate, diasUteisNum) : null;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (diasUteisNum <= 0) {
        throw new Error('Informe um número válido de dias úteis');
      }

      const newPlannedEndDate = addBusinessDays(startDate, diasUteisNum);

      // Atualizar prazo customizado e planned_end_date
      const { error } = await supabase
        .from('production_orders')
        .update({
          prazo_customizado_dias: diasUteisNum,
          planned_end_date: newPlannedEndDate.toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      // Registrar no log
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('production_logs').insert({
        production_order_id: orderId,
        action_type: 'prazo_update',
        description: `Prazo atualizado para ${diasUteisNum} dias úteis (Entrega: ${formatDateBR(newPlannedEndDate)})`,
        created_by: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      queryClient.invalidateQueries({ queryKey: ['production-order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['production-order-logs', orderId] });
      queryClient.invalidateQueries({ queryKey: ['production-timeline'] });
      queryClient.invalidateQueries({ queryKey: ['ops-orders'] });
      toast.success('Prazo atualizado com sucesso!');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar prazo');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Prazo de Produção
          </DialogTitle>
          <DialogDescription>
            OP-{String(orderNumber).padStart(4, '0')} - Defina o prazo em dias úteis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="diasUteis">Dias Úteis de Produção</Label>
            <Input
              id="diasUteis"
              type="number"
              min="1"
              placeholder="Ex: 25"
              value={diasUteis}
              onChange={(e) => setDiasUteis(e.target.value)}
              className="text-lg font-medium"
            />
            <p className="text-xs text-muted-foreground">
              Quantidade de dias úteis necessários para produção (excluindo finais de semana)
            </p>
          </div>

          {previsaoEntrega && diasUteisNum > 0 && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 text-primary">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Previsão de Entrega</span>
              </div>
              <p className="text-2xl font-bold mt-1">{formatDateBR(previsaoEntrega)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Baseado na data de criação: {formatDateBR(startDate)}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || diasUteisNum <= 0}
          >
            {saveMutation.isPending ? 'Salvando...' : 'Salvar Prazo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
