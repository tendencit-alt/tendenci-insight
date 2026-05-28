import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleShell } from "@/components/layout/ModuleShell";
import { Button } from "@/components/ui/button";
import { Plus, Building2 } from "lucide-react";
import SuppliersKPIs from "@/components/suppliers/SuppliersKPIs";
import SuppliersFilters from "@/components/suppliers/SuppliersFilters";
import SuppliersTable from "@/components/suppliers/SuppliersTable";
import CreateSupplierDialog from "@/components/suppliers/CreateSupplierDialog";
import SupplierDetailSheet from "@/components/suppliers/SupplierDetailSheet";
import { ClientesFornecedoresTabs } from "@/components/layout/ClientesFornecedoresTabs";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { OwnerTenantEmptyState, MASTER_OWNER_TENANT_ID } from "@/components/tenant/OwnerTenantEmptyState";

export default function Suppliers() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    city: ""
  });
  const { activeTenantId, isOwner, homeTenantId } = useActiveTenant();
  const onMasterOwner =
    isOwner && (activeTenantId === MASTER_OWNER_TENANT_ID || activeTenantId === homeTenantId);

  const { data: suppliers = [], isLoading, refetch } = useQuery({
    queryKey: ["suppliers", filters, activeTenantId],
    enabled: !!activeTenantId && !onMasterOwner,
    queryFn: async () => {
      let query = supabase
        .from("suppliers")
        .select("*")
        .eq("tenant_id", activeTenantId!)
        .order("name");

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,cpf_cnpj.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      if (filters.status !== "all") {
        query = query.eq("active", filters.status === "active");
      }

      if (filters.city) {
        query = query.ilike("city", `%${filters.city}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1600px] p-4 md:p-6">
        <ClientesFornecedoresTabs />
        <ModuleShell
          moduleKey="fornecedores"
          title="Clientes / Fornecedores"
        description="Gerencie seus fornecedores e parceiros comerciais"
        icon={<Building2 className="h-5 w-5" />}
        headerActions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Fornecedor
          </Button>
        }
        filters={<SuppliersFilters filters={filters} setFilters={setFilters} />}
        overview={<SuppliersKPIs />}
        records={
          <SuppliersTable
            suppliers={suppliers}
            isLoading={isLoading}
            onSelect={setSelectedSupplier}
          />
        }
      />

      <CreateSupplierDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={refetch}
      />

      <SupplierDetailSheet
        supplier={selectedSupplier}
        open={!!selectedSupplier}
        onOpenChange={(open) => !open && setSelectedSupplier(null)}
        onUpdate={refetch}
      />
      </div>
    </DashboardLayout>
  );
}
