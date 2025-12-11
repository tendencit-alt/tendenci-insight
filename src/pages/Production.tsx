import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Factory } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProductionKanban } from '@/components/production/ProductionKanban';
import { CreateProductionOrderDialog } from '@/components/production/CreateProductionOrderDialog';
import { ProductionFilters } from '@/components/production/ProductionFilters';
import { ProductionKPIs } from '@/components/production/ProductionKPIs';
import { ProductionSLAAlerts } from '@/components/production/ProductionSLAAlerts';
import { ProductionOrderDetailSheet } from '@/components/production/ProductionOrderDetailSheet';

export default function Production() {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    search: '',
    responsible: 'all'
  });

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

  const currentTypeId = selectedType !== 'all' ? selectedType : undefined;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Factory className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Produção</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie as ordens de produção por tipo de móvel
              </p>
            </div>
          </div>
          
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova OP
          </Button>
        </div>

        {/* KPIs Dashboard */}
        <ProductionKPIs 
          productionTypeId={currentTypeId}
          filters={filters}
        />

        {/* Alertas de SLA */}
        <ProductionSLAAlerts 
          productionTypeId={currentTypeId}
          onOrderClick={(orderId) => setSelectedOrderId(orderId)}
        />

        {/* Filtros */}
        <ProductionFilters filters={filters} onFiltersChange={setFilters} />

        {/* Tabs por tipo de produção */}
        <Tabs value={selectedType} onValueChange={setSelectedType} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all" className="min-w-fit">
              Todos
            </TabsTrigger>
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

          <TabsContent value="all" className="mt-4">
            <ProductionKanban 
              filters={filters} 
              onOrderClick={(orderId) => setSelectedOrderId(orderId)}
            />
          </TabsContent>

          {productionTypes.map((type) => (
            <TabsContent key={type.id} value={type.id} className="mt-4">
              <ProductionKanban 
                productionTypeId={type.id} 
                filters={filters}
                onOrderClick={(orderId) => setSelectedOrderId(orderId)}
              />
            </TabsContent>
          ))}
        </Tabs>

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
      </div>
    </DashboardLayout>
  );
}