import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Users, Package, Layers } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UnifyOpsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedClientId?: string;
}

export function UnifyOpsDialog({ open, onOpenChange, preSelectedClientId }: UnifyOpsDialogProps) {
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState<string>(preSelectedClientId || '');
  const [selectedOps, setSelectedOps] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Buscar clientes com OPs
  const { data: clientsWithOps = [] } = useQuery({
    queryKey: ['clients-with-ops'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_orders')
        .select(`
          client_id,
          client:clients!production_orders_client_id_fkey(id, name)
        `)
        .not('client_id', 'is', null)
        .neq('status', 'cancelado');

      if (error) throw error;

      // Agrupar por cliente e contar OPs
      const clientsMap = new Map<string, { id: string; name: string; opCount: number }>();
      data?.forEach((op) => {
        if (op.client) {
          const existing = clientsMap.get(op.client.id);
          if (existing) {
            existing.opCount++;
          } else {
            clientsMap.set(op.client.id, {
              id: op.client.id,
              name: op.client.name,
              opCount: 1
            });
          }
        }
      });

      // Filtrar clientes com mais de 1 OP
      return Array.from(clientsMap.values())
        .filter(c => c.opCount > 1)
        .sort((a, b) => b.opCount - a.opCount);
    }
  });

  // Buscar OPs do cliente selecionado
  const { data: clientOps = [] } = useQuery({
    queryKey: ['client-ops', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];

      const { data, error } = await supabase
        .from('production_orders')
        .select(`
          id,
          order_number,
          title,
          status,
          priority,
          value,
          group_id,
          current_phase:production_phases!production_orders_current_phase_id_fkey(
            phase_template:production_phase_templates(name, color)
          ),
          production_type:production_types!production_orders_production_type_id_fkey(name)
        `)
        .eq('client_id', selectedClientId)
        .neq('status', 'cancelado')
        .is('group_id', null)
        .order('order_number', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedClientId
  });

  // Filtrar OPs por busca
  const filteredOps = useMemo(() => {
    if (!searchTerm.trim()) return clientOps;
    const search = searchTerm.toLowerCase();
    return clientOps.filter(op =>
      op.title?.toLowerCase().includes(search) ||
      op.order_number?.toString().includes(search)
    );
  }, [clientOps, searchTerm]);

  // Sugestão de nome do grupo
  const selectedClient = clientsWithOps.find(c => c.id === selectedClientId);
  const suggestedName = selectedClient ? `${selectedClient.name} - ${selectedOps.length} OPs` : '';

  // Toggle seleção de OP
  const toggleOp = (opId: string) => {
    setSelectedOps(prev =>
      prev.includes(opId)
        ? prev.filter(id => id !== opId)
        : [...prev, opId]
    );
  };

  // Selecionar todas
  const selectAll = () => {
    setSelectedOps(filteredOps.map(op => op.id));
  };

  // Limpar seleção
  const clearSelection = () => {
    setSelectedOps([]);
  };

  // Mutation para criar grupo
  const createGroup = useMutation({
    mutationFn: async () => {
      if (selectedOps.length < 2) {
        throw new Error('Selecione pelo menos 2 OPs para unificar');
      }

      // Calcular valor total
      const totalValue = clientOps
        .filter(op => selectedOps.includes(op.id))
        .reduce((sum, op) => sum + (op.value || 0), 0);

      // Criar grupo
      const { data: group, error: groupError } = await supabase
        .from('production_order_groups')
        .insert({
          group_name: groupName || suggestedName,
          client_id: selectedClientId,
          total_value: totalValue
        })
        .select('id')
        .single();

      if (groupError) throw groupError;

      // Atualizar OPs com o group_id
      const { error: updateError } = await supabase
        .from('production_orders')
        .update({ group_id: group.id })
        .in('id', selectedOps);

      if (updateError) throw updateError;

      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      queryClient.invalidateQueries({ queryKey: ['production-order-groups'] });
      queryClient.invalidateQueries({ queryKey: ['client-ops'] });
      toast.success(`${selectedOps.length} OPs unificadas com sucesso!`);
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao unificar OPs');
    }
  });

  const resetForm = () => {
    setSelectedClientId(preSelectedClientId || '');
    setSelectedOps([]);
    setGroupName('');
    setSearchTerm('');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgente': return 'bg-red-500/10 text-red-500';
      case 'alta': return 'bg-orange-500/10 text-orange-500';
      case 'normal': return 'bg-blue-500/10 text-blue-500';
      case 'baixa': return 'bg-gray-500/10 text-gray-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Unificar OPs por Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Seleção de cliente */}
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select
              value={selectedClientId}
              onValueChange={(value) => {
                setSelectedClientId(value);
                setSelectedOps([]);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente com múltiplas OPs" />
              </SelectTrigger>
              <SelectContent>
                {clientsWithOps.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {client.name}
                      <Badge variant="secondary" className="ml-2">
                        {client.opCount} OPs
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedClientId && (
            <>
              {/* Nome do grupo */}
              <div className="space-y-2">
                <Label>Nome do Grupo (opcional)</Label>
                <Input
                  placeholder={suggestedName}
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>

              {/* Busca e ações */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar OP..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Selecionar Todas
                </Button>
                {selectedOps.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Limpar ({selectedOps.length})
                  </Button>
                )}
              </div>

              {/* Lista de OPs */}
              <ScrollArea className="flex-1 max-h-[300px] border rounded-lg p-2">
                <div className="space-y-2">
                  {filteredOps.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma OP disponível para unificar</p>
                      <p className="text-xs">OPs já agrupadas não aparecem aqui</p>
                    </div>
                  ) : (
                    filteredOps.map((op) => (
                      <div
                        key={op.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                          selectedOps.includes(op.id)
                            ? 'bg-primary/5 border-primary'
                            : 'bg-card hover:bg-muted/50'
                        }`}
                        onClick={() => toggleOp(op.id)}
                      >
                        <Checkbox
                          checked={selectedOps.includes(op.id)}
                          onCheckedChange={() => toggleOp(op.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              OP-{String(op.order_number).padStart(4, '0')}
                            </span>
                            <Badge variant="outline" className={getPriorityColor(op.priority)}>
                              {op.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {op.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {op.current_phase?.phase_template && (
                              <Badge
                                variant="secondary"
                                style={{
                                  backgroundColor: `${op.current_phase.phase_template.color}20`,
                                  color: op.current_phase.phase_template.color
                                }}
                              >
                                {op.current_phase.phase_template.name}
                              </Badge>
                            )}
                            {op.production_type && (
                              <span className="text-xs text-muted-foreground">
                                {op.production_type.name}
                              </span>
                            )}
                          </div>
                        </div>
                        {op.value && (
                          <span className="text-sm font-medium">
                            R$ {op.value.toLocaleString('pt-BR')}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Resumo da seleção */}
              {selectedOps.length > 0 && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {selectedOps.length} OPs selecionadas
                    </span>
                    <span className="text-sm">
                      Valor total: R${' '}
                      {clientOps
                        .filter(op => selectedOps.includes(op.id))
                        .reduce((sum, op) => sum + (op.value || 0), 0)
                        .toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => createGroup.mutate()}
            disabled={selectedOps.length < 2 || createGroup.isPending}
          >
            {createGroup.isPending ? 'Unificando...' : `Unificar ${selectedOps.length} OPs`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
