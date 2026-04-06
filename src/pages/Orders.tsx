import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { OrdersKPIs } from '@/components/orders/OrdersKPIs';
import { OrdersFilters } from '@/components/orders/OrdersFilters';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { CreateOrderDialog } from '@/components/orders/CreateOrderDialog';
import { BulkEditOrdersDialog } from '@/components/orders/BulkEditOrdersDialog';
import { OrderDetailSheet } from '@/components/orders/OrderDetailSheet';
import { EditOrderDialog } from '@/components/orders/EditOrderDialog';
import { DeleteOrderDialog } from '@/components/orders/DeleteOrderDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { startOfMonth } from 'date-fns';

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<{ id: string; orderNumber: number } | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Auto-open order from URL query param (e.g. from BI drill-down)
  useEffect(() => {
    const orderId = searchParams.get('orderId');
    if (orderId) {
      setSelectedOrderId(orderId);
      setSearchParams((prev) => {
        prev.delete('orderId');
        return prev;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const now = new Date();
  const [filters, setFilters] = useState({
    status: '',
    vendedorId: '',
    centroCusto: '',
    clientId: '',
    period: 'all',
    dateFrom: new Date(2020, 0, 1),
    dateTo: now,
    dateField: 'created_at',
  });

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['orders', filters],
    queryFn: async () => {
      // If filtering by centro_custo, first get order IDs that have items with that centro_custo
      let orderIdsWithCentroCusto: string[] | null = null;
      if (filters.centroCusto) {
        const { data: matchingItems } = await supabase
          .from('order_items')
          .select('order_id')
          .eq('centro_custo', filters.centroCusto);
        orderIdsWithCentroCusto = [...new Set((matchingItems || []).map(i => i.order_id))];
        if (orderIdsWithCentroCusto.length === 0) return [];
      }

      let query = supabase
        .from('orders')
        .select(`
          *,
          client:clients(id, name, cpf_cnpj, phone),
          vendedor:profiles!orders_vendedor_id_fkey(id, full_name),
          architect:architects(id, name),
          deal:crm_deals(id, title),
          project:fin_projects(id, name),
          order_items(centro_custo)
        `)
        .order('created_at', { ascending: false });

      if (filters.status) query = query.eq('status', filters.status);
      if (filters.vendedorId) query = query.eq('vendedor_id', filters.vendedorId);
      if (filters.clientId) query = query.eq('client_id', filters.clientId);
      if (orderIdsWithCentroCusto) query = query.in('id', orderIdsWithCentroCusto);

      const dateColumn = 'data_emissao';

      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        const year = fromDate.getFullYear();
        const month = String(fromDate.getMonth() + 1).padStart(2, '0');
        const day = String(fromDate.getDate()).padStart(2, '0');
        query = query.gte(dateColumn, `${year}-${month}-${day}T03:00:00.000Z`);
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setDate(toDate.getDate() + 1);
        const year = toDate.getFullYear();
        const month = String(toDate.getMonth() + 1).padStart(2, '0');
        const day = String(toDate.getDate()).padStart(2, '0');
        query = query.lte(dateColumn, `${year}-${month}-${day}T02:59:59.999Z`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <PermissionGuard module="pedidos">
      <DashboardLayout>
        <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 md:p-6">
          {/* Header compacto */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Pedidos</h1>
              <p className="text-xs text-muted-foreground">
                Gerencie seus pedidos em um só lugar.
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)} size="sm" className="h-9 px-4 shadow-sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Novo Pedido
            </Button>
          </div>

          {/* KPIs compactos */}
          <OrdersKPIs
            orders={orders || []}
            isLoading={isLoading}
            selectedIds={selectedOrderIds}
          />

          {/* Filtros inline */}
          <OrdersFilters filters={filters} onFiltersChange={setFilters} />

          {/* Tabela */}
          <OrdersTable
            orders={orders || []}
            isLoading={isLoading}
            onSelectOrder={setSelectedOrderId}
            onEditOrder={setEditingOrderId}
            onDeleteOrder={(id, orderNumber) => setDeletingOrder({ id, orderNumber })}
            selectedIds={selectedOrderIds}
            onSelectedIdsChange={setSelectedOrderIds}
            onBulkEdit={() => setBulkEditOpen(true)}
          />

          <CreateOrderDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSuccess={() => { refetch(); setCreateOpen(false); }}
          />

          <BulkEditOrdersDialog
            open={bulkEditOpen}
            onOpenChange={setBulkEditOpen}
            selectedIds={selectedOrderIds}
            onSuccess={() => { refetch(); setBulkEditOpen(false); setSelectedOrderIds([]); }}
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
              onSuccess={() => { refetch(); setEditingOrderId(null); }}
            />
          )}

          {deletingOrder && (
            <DeleteOrderDialog
              orderId={deletingOrder.id}
              orderNumber={deletingOrder.orderNumber}
              open={!!deletingOrder}
              onOpenChange={(open) => !open && setDeletingOrder(null)}
              onSuccess={() => { refetch(); setDeletingOrder(null); }}
            />
          )}
        </div>
      </DashboardLayout>
    </PermissionGuard>
  );
}
