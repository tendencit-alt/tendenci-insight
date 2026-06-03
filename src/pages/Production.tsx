import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ModuleShell } from '@/components/layout/ModuleShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Zap, Factory } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProductionKanban } from '@/components/production/ProductionKanban';
import { ProductionKPIs } from '@/components/production/ProductionKPIs';
import { CreateProductionOrderDialog } from '@/components/production/CreateProductionOrderDialog';
import { ProductionFilters } from '@/components/production/ProductionFilters';
import { ProductionOrderDetailSheet } from '@/components/production/ProductionOrderDetailSheet';
import { ManageProductionStagesDialog } from '@/components/production/ManageProductionStagesDialog';
import { ManageStatusChecklistsDialog } from '@/components/production/ManageStatusChecklistsDialog';
import { ClipboardCheck } from 'lucide-react';
import { ManageProductionAutomationsDialog } from '@/components/production/ManageProductionAutomationsDialog';
import { UnifyOpsDialog } from '@/components/production/UnifyOpsDialog';
import { ProductionListView } from '@/components/production/ProductionListView';
import { LayoutGrid, List as ListIcon } from 'lucide-react';

import { getTailwindColor } from '@/utils/tailwindColors';
import { toast } from 'sonner';
import { format, subDays, startOfMonth } from 'date-fns';
import { usePermissions } from '@/hooks/usePermissions';
import { useActiveTenant } from '@/hooks/useActiveTenant';
import { Can } from '@/components/auth/Can';


export default function Production() {
  const [selectedType, setSelectedType] = useState<string>('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [automationsDialogOpen, setAutomationsDialogOpen] = useState(false);
  const [checklistsDialogOpen, setChecklistsDialogOpen] = useState(false);
  const [unifyDialogOpen, setUnifyDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban');
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    search: '',
    responsible: 'all',
    period: 'all'
  });
  
  const { isMaster } = usePermissions();
  const { activeTenantId } = useActiveTenant();


  const { data: productionTypes = [] } = useQuery({
    queryKey: ['production-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_types')
        .select('*')
        .eq('active', true)
        .order('position');
      
      if (error) throw error;
      return data;
    }
  });

  const currentTypeId = selectedType || productionTypes[0]?.id;

  // Função para exportar OPs para Excel
  const handleExport = async () => {
    if (!activeTenantId) {
      toast.error('Selecione uma empresa ativa antes de exportar.');
      return;
    }
    try {
      let query = supabase
        .from('production_orders')
        .select(`
          order_number,
          title,
          status,
          priority,
          value,
          planned_start_date,
          planned_end_date,
          created_at,
          production_type:production_types(name),
          client:clients(name),
          responsible:profiles!production_orders_responsible_id_fkey(full_name)
        `)
        .eq('tenant_id', activeTenantId)
        .order('order_number', { ascending: false });


      // Aplicar filtros
      if (currentTypeId) {
        query = query.eq('production_type_id', currentTypeId);
      }
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }
      if (filters.responsible !== 'all') {
        query = query.eq('responsible_id', filters.responsible);
      }
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }
      if (filters.period !== 'all') {
        let dateFrom: Date;
        const today = new Date();
        
        switch (filters.period) {
          case 'last7days':
            dateFrom = subDays(today, 7);
            break;
          case 'last30days':
            dateFrom = subDays(today, 30);
            break;
          case 'last60days':
            dateFrom = subDays(today, 60);
            break;
          case 'last90days':
            dateFrom = subDays(today, 90);
            break;
          case 'thisMonth':
            dateFrom = startOfMonth(today);
            break;
          default:
            dateFrom = new Date(0);
        }
        
        query = query.gte('created_at', dateFrom.toISOString());
      }

      const { data, error } = await query;
      
      if (error) throw error;

      if (!data || data.length === 0) {
        toast.info('Nenhuma OP encontrada para exportar');
        return;
      }

      // Converter para CSV
      const statusLabels: Record<string, string> = {
        aguardando: 'Aguardando',
        em_andamento: 'Em Andamento',
        pausado: 'Pausado',
        concluido: 'Concluído',
        cancelado: 'Cancelado'
      };

      const priorityLabels: Record<string, string> = {
        baixa: 'Baixa',
        normal: 'Normal',
        alta: 'Alta',
        urgente: 'Urgente'
      };

      const headers = ['Número', 'Título', 'Tipo', 'Status', 'Prioridade', 'Cliente', 'Responsável', 'Valor', 'Data Início', 'Data Fim', 'Criado em'];
      const rows = data.map(op => [
        `OP-${String(op.order_number).padStart(4, '0')}`,
        op.title,
        op.production_type?.name || '-',
        statusLabels[op.status] || op.status,
        priorityLabels[op.priority] || op.priority,
        op.client?.name || '-',
        op.responsible?.full_name || '-',
        op.value ? `R$ ${op.value.toFixed(2)}` : '-',
        op.planned_start_date ? format(new Date(op.planned_start_date), 'dd/MM/yyyy') : '-',
        op.planned_end_date ? format(new Date(op.planned_end_date), 'dd/MM/yyyy') : '-',
        op.created_at ? format(new Date(op.created_at), 'dd/MM/yyyy HH:mm') : '-'
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      // Download CSV
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `ordens-producao-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      
      toast.success(`${data.length} OPs exportadas com sucesso`);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar ordens de produção');
    }
  };

  return (
    <DashboardLayout>
      <ModuleShell
        moduleKey="producao"
        title="Produção"
        description="Ordens de produção, kanban e automações"
        icon={<Factory className="h-5 w-5" />}
        headerActions={
          <Can module="producao" action="create">
            <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Nova OP
            </Button>
          </Can>
        }
        filters={
          <ProductionFilters
            filters={filters}
            onFiltersChange={setFilters}
            onExport={handleExport}
            onUnifyOps={() => setUnifyDialogOpen(true)}
          />
        }
        overview={<ProductionKPIs productionTypeId={currentTypeId} filters={filters} />}
        records={
          <div className="space-y-3">
            <div className="flex items-center justify-end gap-1 border-b pb-2">
              <Button
                size="sm"
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                onClick={() => setViewMode('kanban')}
                className="gap-1.5"
              >
                <LayoutGrid className="h-4 w-4" /> Kanban
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'lista' ? 'default' : 'ghost'}
                onClick={() => setViewMode('lista')}
                className="gap-1.5"
              >
                <ListIcon className="h-4 w-4" /> Lista
              </Button>
            </div>
            <Tabs value={selectedType || productionTypes[0]?.id || ''} onValueChange={setSelectedType} className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto">
                {productionTypes.map((type) => (
                  <TabsTrigger key={type.id} value={type.id} className="min-w-fit gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getTailwindColor(type.color) }}
                    />
                    {type.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {productionTypes.map((type) => (
                <TabsContent key={type.id} value={type.id} className="mt-3">
                  {viewMode === 'kanban' ? (
                    <ProductionKanban
                      productionTypeId={type.id}
                      filters={filters}
                      onOrderClick={(orderId) => setSelectedOrderId(orderId)}
                    />
                  ) : (
                    <ProductionListView
                      productionTypeId={type.id}
                      filters={filters}
                      onOrderClick={(orderId) => setSelectedOrderId(orderId)}
                    />
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        }
        actions={
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Operações em massa de ordens de produção.</p>
            <Button variant="outline" onClick={() => setUnifyDialogOpen(true)} className="gap-1.5">
              <Zap className="h-4 w-4" />
              Unificar OPs
            </Button>
          </div>
        }
        settings={
          isMaster ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setConfigDialogOpen(true)} className="gap-1.5">
                <Settings className="h-4 w-4" />
                Etapas de produção
              </Button>
              <Button variant="outline" onClick={() => setAutomationsDialogOpen(true)} className="gap-1.5">
                <Zap className="h-4 w-4" />
                Automações
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Dialog de criação */}
      <CreateProductionOrderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        productionTypes={productionTypes}
      />

      {/* Sheet de detalhes */}
      <ProductionOrderDetailSheet
        orderId={selectedOrderId}
        open={!!selectedOrderId}
        onOpenChange={(open) => !open && setSelectedOrderId(null)}
      />

      {/* Dialog de unificar OPs */}
      <UnifyOpsDialog
        open={unifyDialogOpen}
        onOpenChange={setUnifyDialogOpen}
      />

      {/* Dialog de configuração de etapas */}
      <ManageProductionStagesDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
      />

      {/* Dialog de automações - apenas MASTER */}
      {isMaster && (
        <ManageProductionAutomationsDialog
          open={automationsDialogOpen}
          onOpenChange={setAutomationsDialogOpen}
        />
      )}
    </DashboardLayout>
  );
}