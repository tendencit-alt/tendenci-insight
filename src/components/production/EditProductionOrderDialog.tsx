import { useState, useEffect } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DateBrInput } from "@/components/ui/date-br-input";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
import CreateSupplierDialog from '@/components/suppliers/CreateSupplierDialog';

interface EditProductionOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
}

export function EditProductionOrderDialog({ open, onOpenChange, orderId }: EditProductionOrderDialogProps) {
  const queryClient = useQueryClient();
  const [showCreateSupplier, setShowCreateSupplier] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    production_type_id: '',
    client_id: '',
    deal_id: '',
    description: '',
    priority: 'normal',
    responsible_id: '',
    planned_start_date: '',
    planned_end_date: '',
    value: '',
    status: 'aguardando',
    notes: '',
    supplier_id: '',
    prazo_customizado_dias: ''
  });

  // Buscar dados da OP
  const { data: order } = useQuery({
    queryKey: ['production-order-edit', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const { data, error } = await supabase
        .from('production_orders')
        .select('*')
        .eq('id', orderId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId && open
  });

  // Buscar tipos de produção
  const { data: productionTypes = [] } = useQuery({
    queryKey: ['production-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_types')
        .select('id, name, color')
        .eq('active', true)
        .order('position');
      if (error) throw error;
      return data;
    }
  });

  // Buscar clientes
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Buscar deals
  const { data: deals = [] } = useQuery({
    queryKey: ['deals-for-production'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_deals')
        .select('id, title')
        .eq('status', 'won')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    }
  });

  // Buscar usuários
  const { data: users = [] } = useQuery({
    queryKey: ['users-for-production'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      if (error) throw error;
      return data;
    }
  });

  // Buscar fornecedores
  const { data: suppliers = [], refetch: refetchSuppliers } = useQuery({
    queryKey: ['suppliers-for-production'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Preencher form quando carregar dados
  useEffect(() => {
    if (order) {
      setFormData({
        title: order.title || '',
        production_type_id: order.production_type_id || '',
        client_id: order.client_id || '',
        deal_id: order.deal_id || '',
        description: order.description || '',
        priority: order.priority || 'normal',
        responsible_id: order.responsible_id || '',
        planned_start_date: order.planned_start_date?.split('T')[0] || '',
        planned_end_date: order.planned_end_date?.split('T')[0] || '',
        value: order.value?.toString() || '',
        status: order.status || 'aguardando',
        notes: order.notes || '',
        supplier_id: order.supplier_id || '',
        prazo_customizado_dias: order.prazo_customizado_dias?.toString() || ''
      });
    }
  }, [order]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!orderId || !formData.title) {
        throw new Error('Preencha os campos obrigatórios');
      }

      const previousStatus = order?.status;

      const { error } = await supabase
        .from('production_orders')
        .update({
          title: formData.title,
          client_id: formData.client_id || null,
          deal_id: formData.deal_id || null,
          description: formData.description || null,
          priority: formData.priority,
          responsible_id: formData.responsible_id || null,
          planned_start_date: formData.planned_start_date || null,
          planned_end_date: formData.planned_end_date || null,
          value: formData.value ? parseFloat(formData.value) : null,
          status: formData.status,
          notes: formData.notes || null,
          supplier_id: formData.supplier_id || null,
          prazo_customizado_dias: formData.prazo_customizado_dias ? parseInt(formData.prazo_customizado_dias) : null
        })
        .eq('id', orderId);

      if (error) throw error;

      // Sincronizar fases se status mudou para concluido
      if (formData.status === 'concluido' && previousStatus !== 'concluido') {
        await supabase
          .from('production_phases')
          .update({ 
            status: 'concluido', 
            completed_at: new Date().toISOString() 
          })
          .eq('production_order_id', orderId)
          .neq('status', 'concluido');
      }

      // Sincronizar fases se status mudou para cancelado
      if (formData.status === 'cancelado' && previousStatus !== 'cancelado') {
        await supabase
          .from('production_phases')
          .update({ status: 'cancelado' })
          .eq('production_order_id', orderId)
          .in('status', ['pendente', 'em_andamento']);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      queryClient.invalidateQueries({ queryKey: ['production-order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['production-order-edit', orderId] });
      toast.success('OP atualizada com sucesso');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar OP');
    }
  });

  const handleSupplierCreated = () => {
    refetchSuppliers();
    setShowCreateSupplier(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Ordem de Produção</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="edit-title">Título *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            {/* Tipo de Produção (readonly) */}
            <div className="space-y-2">
              <Label>Tipo de Produção</Label>
              <Select value={formData.production_type_id} disabled>
                <SelectTrigger className="bg-muted">
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  {productionTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: type.color }} />
                        {type.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aguardando">Aguardando</SelectItem>
                  <SelectItem value="em_producao">Em Produção</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cliente */}
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={formData.client_id || "_none"}
                onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value === "_none" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">-</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Negócio vinculado */}
            <div className="space-y-2">
              <Label>Negócio Vinculado</Label>
              <Select
                value={formData.deal_id || "_none"}
                onValueChange={(value) => setFormData(prev => ({ ...prev, deal_id: value === "_none" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">-</SelectItem>
                  {deals.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id}>
                      {deal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fornecedor */}
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.supplier_id || "_none"}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: value === "_none" ? "" : value }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">-</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={() => setShowCreateSupplier(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Prioridade e Responsável */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select
                  value={formData.responsible_id || "_none"}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, responsible_id: value === "_none" ? "" : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">-</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || 'Sem nome'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início Prevista</Label>
                <DateBrInput
                  value={formData.planned_start_date}
                  onChange={(e) =/> setFormData(prev => ({ ...prev, planned_start_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Data Fim Prevista</Label>
                <DateBrInput
                  value={formData.planned_end_date}
                  onChange={(e) =/> setFormData(prev => ({ ...prev, planned_end_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Prazo Customizado */}
            <div className="space-y-2">
              <Label>Prazo Customizado (dias úteis)</Label>
              <Input
                type="number"
                value={formData.prazo_customizado_dias}
                onChange={(e) => setFormData(prev => ({ ...prev, prazo_customizado_dias: e.target.value }))}
                placeholder="Sobrescreve prazo automático do SLA"
              />
              <p className="text-xs text-muted-foreground">
                Se preenchido, este prazo customizado será usado ao invés da soma do SLA das etapas
              </p>
            </div>

            {/* Valor */}
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                placeholder="0,00"
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label>Observações Internas</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas internas sobre a produção..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateSupplierDialog
        open={showCreateSupplier}
        onOpenChange={setShowCreateSupplier}
        onSuccess={handleSupplierCreated}
      />
    </>
  );
}