import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { DateBrInput } from "@/components/ui/date-br-input";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useCompanyName } from '@/hooks/useCompanySettings';

const STATUS_OPTIONS = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'em_negociacao', label: 'Em Negociação' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'liberado_producao', label: 'Lib. Produção' },
  { value: 'em_producao', label: 'Em Produção' },
  { value: 'producao_concluida', label: 'Prod. Concluída' },
  { value: 'liberado_faturamento', label: 'Lib. Faturamento' },
  { value: 'faturado', label: 'Faturado' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'encerrado', label: 'Encerrado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const getDeliveryOptions = (companyName: string) => [
  { value: 'A combinar', label: 'A combinar' },
  { value: 'Entrega Tendenci', label: `Entrega ${companyName}` },
  { value: 'Transportadora', label: 'Transportadora' },
  { value: 'Retirada', label: 'Retirada' },
  { value: 'Terceirizada', label: 'Terceirizada' },
];

interface BulkEditOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onSuccess: () => void;
}

export function BulkEditOrdersDialog({ open, onOpenChange, selectedIds, onSuccess }: BulkEditOrdersDialogProps) {
  const queryClient = useQueryClient();
  const companyName = useCompanyName();
  const DELIVERY_OPTIONS = getDeliveryOptions(companyName);
  const [fields, setFields] = useState<{
    status?: string;
    vendedor_id?: string;
    data_entrega_prevista?: string;
    tipo_entrega?: string;
  }>({});

  const { data: vendedores } = useQuery({
    queryKey: ['profiles-vendedores'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').order('full_name');
      return data || [];
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const updates: Record<string, any> = {};
      if (fields.status) updates.status = fields.status;
      if (fields.vendedor_id) updates.vendedor_id = fields.vendedor_id;
      if (fields.data_entrega_prevista) updates.data_entrega_prevista = fields.data_entrega_prevista;
      if (fields.tipo_entrega) updates.tipo_entrega = fields.tipo_entrega;

      if (Object.keys(updates).length === 0) throw new Error('Selecione ao menos um campo para alterar.');

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .in('id', selectedIds);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${selectedIds.length} pedido(s) atualizado(s) com sucesso`);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setFields({});
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao atualizar pedidos');
    },
  });

  const hasChanges = Object.values(fields).some(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edição em Massa</DialogTitle>
          <DialogDescription>
            Altere os campos desejados para {selectedIds.length} pedido{selectedIds.length !== 1 ? 's' : ''} selecionado{selectedIds.length !== 1 ? 's' : ''}.
            Apenas os campos preenchidos serão atualizados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-sm">Status</Label>
            <Select value={fields.status || '__clear__'} onValueChange={(v) => setFields({ ...fields, status: v === '__clear__' ? undefined : v })}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Não alterar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear__">Não alterar</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vendedor */}
          <div className="space-y-1.5">
            <Label className="text-sm">Vendedor</Label>
            <Select value={fields.vendedor_id || '__clear__'} onValueChange={(v) => setFields({ ...fields, vendedor_id: v === '__clear__' ? undefined : v })}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Não alterar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear__">Não alterar</SelectItem>
                {vendedores?.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data Entrega */}
          <div className="space-y-1.5">
            <Label className="text-sm">Data de Entrega Prevista</Label>
            <DateBrInput
              className="h-9"
              value={fields.data_entrega_prevista || ''}
              onChange={(e) =/> setFields({ ...fields, data_entrega_prevista: e.target.value || undefined })}
            />
          </div>

          {/* Tipo Entrega */}
          <div className="space-y-1.5">
            <Label className="text-sm">Tipo de Entrega</Label>
            <Select value={fields.tipo_entrega || '__clear__'} onValueChange={(v) => setFields({ ...fields, tipo_entrega: v === '__clear__' ? undefined : v })}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Não alterar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear__">Não alterar</SelectItem>
                {DELIVERY_OPTIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!hasChanges || mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aplicar a {selectedIds.length} pedido{selectedIds.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
