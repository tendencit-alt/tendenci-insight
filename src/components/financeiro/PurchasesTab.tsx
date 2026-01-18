import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import PurchasesKPIs from "@/components/purchases/PurchasesKPIs";
import PurchasesFilters from "@/components/purchases/PurchasesFilters";
import PurchaseOrdersTable from "@/components/purchases/PurchaseOrdersTable";
import CreatePurchaseOrderDialog from "@/components/purchases/CreatePurchaseOrderDialog";
import PurchaseOrderDetailSheet from "@/components/purchases/PurchaseOrderDetailSheet";

export function PurchasesTab() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    supplierId: "",
    period: "all"
  });

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["purchase-orders", filters],
    queryFn: async () => {
      let query = supabase
        .from("purchase_orders")
        .select(`
          *,
          supplier:suppliers(id, name, cpf_cnpj),
          created_by_profile:profiles!purchase_orders_created_by_fkey(id, full_name)
        `)
        .order("created_at", { ascending: false });

      if (filters.search) {
        query = query.or(`order_number.eq.${parseInt(filters.search) || 0}`);
      }

      if (filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.supplierId) {
        query = query.eq("supplier_id", filters.supplierId);
      }

      if (filters.period !== "all") {
        const now = new Date();
        let startDate: Date;
        
        switch (filters.period) {
          case "today":
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case "week":
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case "month":
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          default:
            startDate = new Date(0);
        }
        
        query = query.gte("created_at", startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Pedidos de Compra</h2>
          <p className="text-sm text-muted-foreground">Gerencie pedidos de compra e recebimentos</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Pedido de Compra
        </Button>
      </div>

      <PurchasesKPIs />

      <PurchasesFilters filters={filters} setFilters={setFilters} />

      <PurchaseOrdersTable 
        orders={orders} 
        isLoading={isLoading}
        onSelect={setSelectedOrder}
      />

      <CreatePurchaseOrderDialog 
        open={createOpen} 
        onOpenChange={setCreateOpen}
        onSuccess={refetch}
      />

      <PurchaseOrderDetailSheet
        order={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
        onUpdate={refetch}
      />
    </div>
  );
}
