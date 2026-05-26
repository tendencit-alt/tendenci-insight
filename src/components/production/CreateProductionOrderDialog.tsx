import { useState } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { CreateClientDialog } from '@/components/crm/CreateClientDialog';
import { CreateDealDialog } from '@/components/crm/CreateDealDialog';

interface CreateProductionOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productionTypes: Array<{ id: string; name: string; color: string }>;
}

export function CreateProductionOrderDialog({ open, onOpenChange, productionTypes }: CreateProductionOrderDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateSupplier, setShowCreateSupplier] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    production_type_id: '',
    client_id: '',
    deal_id: '',
    description: '',
    notes: '',
    priority: 'normal',
    responsible_id: '',
    planned_start_date: '',
    planned_end_date: '',
    value: '',
    supplier_id: '',
    prazo_customizado_dias: ''
  });

  // Buscar clientes
  const { data: clients = [], refetch: refetchClients } = useQuery({
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

  // Buscar deals (para vincular OP a negócio existente)
  const { data: deals = [], refetch: refetchDeals } = useQuery({
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

  // Buscar usuários para responsável
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

  // Buscar pipeline para criação de deal
  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines-for-production'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_pipelines')
        .select('id, name')
        .order('created_at')
        .limit(1);
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!formData.title || !formData.production_type_id) {
        throw new Error('Preencha os campos obrigatórios');
      }

      const { error } = await supabase
        .from('production_orders')
        .insert({
          title: formData.title,
          production_type_id: formData.production_type_id,
          client_id: formData.client_id || null,
          deal_id: formData.deal_id || null,
          description: formData.description || null,
          notes: formData.notes || null,
          priority: formData.priority,
          responsible_id: formData.responsible_id || null,
          planned_start_date: formData.planned_start_date || null,
          planned_end_date: formData.planned_end_date || null,
          value: formData.value ? parseFloat(formData.value) : null,
          supplier_id: formData.supplier_id || null,
          prazo_customizado_dias: formData.prazo_customizado_dias ? parseInt(formData.prazo_customizado_dias) : null,
          created_by: user?.id,
          status: 'aguardando'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast.success('Ordem de produção criada com sucesso');
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar ordem de produção');
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      production_type_id: '',
      client_id: '',
      deal_id: '',
      description: '',
      notes: '',
      priority: 'normal',
      responsible_id: '',
      planned_start_date: '',
      planned_end_date: '',
      value: '',
      supplier_id: '',
      prazo_customizado_dias: ''
    });
  };

  const handleSupplierCreated = () => {
    refetchSuppliers();
    setShowCreateSupplier(false);
  };

  const handleClientCreated = (clientId?: string) => {
    refetchClients();
    setShowCreateClient(false);
    if (clientId) {
      setFormData(prev => ({ ...prev, client_id: clientId }));
    }
  };

  const handleDealCreated = () => {
    refetchDeals();
    setShowCreateDeal(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Ordem de Produção</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Mesa de jantar 6 lugares"
              />
            </div>

            {/* Tipo de Produção */}
            <div className="space-y-2">
              <Label>Tipo de Produção *</Label>
              <Select
                value={formData.production_type_id || "_placeholder"}
                onValueChange={(value) => setFormData(prev => ({ ...prev, production_type_id: value === "_placeholder" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_placeholder" disabled>-</SelectItem>
                  {productionTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: type.color }}
                        />
                        {type.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cliente */}
            <div className="space-y-2">
              <Label>Cliente</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.client_id || "_none"}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value === "_none" ? "" : value }))}
                >
                  <SelectTrigger className="flex-1">
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
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={() => setShowCreateClient(true)}
                  aria-label="Cadastrar novo cliente"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Negócio vinculado */}
            <div className="space-y-2">
              <Label>Negócio Vinculado</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.deal_id || "_none"}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, deal_id: value === "_none" ? "" : value }))}
                >
                  <SelectTrigger className="flex-1">
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
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={() => setShowCreateDeal(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
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
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || 'Sem nome'}
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
                  onChange={(iso) => setFormData(prev => ({ ...prev, planned_start_date: iso }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Data Fim Prevista</Label>
                <DateBrInput
                  value={formData.planned_end_date}
                  onChange={(iso) => setFormData(prev => ({ ...prev, planned_end_date: iso }))}
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
                placeholder="Detalhes adicionais da ordem de produção..."
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
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar OP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateSupplierDialog
        open={showCreateSupplier}
        onOpenChange={setShowCreateSupplier}
        onSuccess={handleSupplierCreated}
      />

      <CreateClientDialog
        open={showCreateClient}
        onOpenChange={setShowCreateClient}
        onSuccess={handleClientCreated}
      />

      {pipelines[0]?.id && (
        <CreateDealDialog
          open={showCreateDeal}
          onOpenChange={setShowCreateDeal}
          pipelineId={pipelines[0].id}
          onSuccess={handleDealCreated}
        />
      )}
    </>
  );
}