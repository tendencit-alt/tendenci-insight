import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { OrdersKPIs } from '@/components/orders/OrdersKPIs';
import { OrdersFilters } from '@/components/orders/OrdersFilters';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { CreateOrderDialog } from '@/components/orders/CreateOrderDialog';
import { OrderDetailSheet } from '@/components/orders/OrderDetailSheet';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { subDays } from 'date-fns';

export default function Orders() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    vendedorId: '',
    clientId: '',
    period: 'last30days',
    dateFrom: subDays(new Date(), 30),
    dateTo: new Date(),
  });

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          client:clients(id, name, cpf_cnpj, phone),
          vendedor:profiles!orders_vendedor_id_fkey(id, full_name),
          architect:architects(id, name),
          deal:crm_deals(id, title)
        `)
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.vendedorId) {
        query = query.eq('vendedor_id', filters.vendedorId);
      }
      if (filters.clientId) {
        query = query.eq('client_id', filters.clientId);
      }
      if (filters.dateFrom) {
        query = query.gte('data_emissao', filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        query = query.lte('data_emissao', filters.dateTo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Pedido
          </Button>
        </div>

        <OrdersKPIs filters={filters} />

        <OrdersFilters filters={filters} onFiltersChange={setFilters} />

        <OrdersTable
          orders={orders || []}
          isLoading={isLoading}
          onSelectOrder={setSelectedOrderId}
        />

        <CreateOrderDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={() => {
            refetch();
            setCreateOpen(false);
          }}
        />

        {selectedOrderId && (
          <OrderDetailSheet
            orderId={selectedOrderId}
            open={!!selectedOrderId}
            onOpenChange={(open) => !open && setSelectedOrderId(null)}
            onUpdate={refetch}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
