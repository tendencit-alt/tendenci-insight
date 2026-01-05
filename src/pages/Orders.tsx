import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { OrdersKPIs } from '@/components/orders/OrdersKPIs';
import { OrdersFilters } from '@/components/orders/OrdersFilters';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { CreateOrderDialog } from '@/components/orders/CreateOrderDialog';
import { OrderDetailSheet } from '@/components/orders/OrderDetailSheet';
import { EditOrderDialog } from '@/components/orders/EditOrderDialog';
import { DeleteOrderDialog } from '@/components/orders/DeleteOrderDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { subDays } from 'date-fns';

export default function Orders() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<{ id: string; orderNumber: number } | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    vendedorId: '',
    clientId: '',
    architectId: '',
    period: 'last30days',
    dateFrom: subDays(new Date(), 30),
    dateTo: new Date(),
    dateField: 'data_emissao' as 'data_emissao' | 'created_at',
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
      if (filters.architectId) {
        query = query.eq('architect_id', filters.architectId);
      }
      // Aplicar filtro de data baseado no campo selecionado
      const dateColumn = filters.dateField === 'created_at' ? 'created_at' : 'data_emissao';
      if (filters.dateFrom) {
        // Início do dia (00:00:00)
        const fromDate = new Date(filters.dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        query = query.gte(dateColumn, fromDate.toISOString());
      }
      if (filters.dateTo) {
        // Fim do dia (23:59:59.999) para incluir pedidos criados durante todo o dia
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        query = query.lte(dateColumn, toDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <PermissionGuard module="pedidos">
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
          onEditOrder={setEditingOrderId}
          onDeleteOrder={(id, orderNumber) => setDeletingOrder({ id, orderNumber })}
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

        {editingOrderId && (
          <EditOrderDialog
            orderId={editingOrderId}
            open={!!editingOrderId}
            onOpenChange={(open) => !open && setEditingOrderId(null)}
            onSuccess={() => {
              refetch();
              setEditingOrderId(null);
            }}
          />
        )}

        {deletingOrder && (
          <DeleteOrderDialog
            orderId={deletingOrder.id}
            orderNumber={deletingOrder.orderNumber}
            open={!!deletingOrder}
            onOpenChange={(open) => !open && setDeletingOrder(null)}
            onSuccess={() => {
              refetch();
              setDeletingOrder(null);
            }}
          />
        )}
      </div>
    </DashboardLayout>
    </PermissionGuard>
  );
}
