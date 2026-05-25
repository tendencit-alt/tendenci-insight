import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleShell } from "@/components/layout/ModuleShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Package } from "lucide-react";
import InventoryKPIs from "@/components/inventory/InventoryKPIs";
import InventoryFilters from "@/components/inventory/InventoryFilters";
import ProductsTable from "@/components/inventory/ProductsTable";
import StockMovementsTable from "@/components/inventory/StockMovementsTable";
import CategoriesManager from "@/components/inventory/CategoriesManager";
import LocationsManager from "@/components/inventory/LocationsManager";
import CostCenterManager from "@/components/inventory/CostCenterManager";
import CreateProductDialog from "@/components/inventory/CreateProductDialog";
import CreateMovementDialog from "@/components/inventory/CreateMovementDialog";
import LowStockAlerts from "@/components/inventory/LowStockAlerts";
import PurchaseSuggestions from "@/components/inventory/PurchaseSuggestions";
import InventoryAdvancedKPIs from "@/components/inventory/InventoryAdvancedKPIs";
import ABCAnalysis from "@/components/inventory/ABCAnalysis";
import MaterialRequestsTable from "@/components/inventory/MaterialRequestsTable";
import InvReservationsTab from "@/components/inventory/InvReservationsTab";
import InvCostsTab from "@/components/inventory/InvCostsTab";
import InvAnalyticsTab from "@/components/inventory/InvAnalyticsTab";
import CategoryKPIsReport from "@/components/inventory/CategoryKPIsReport";

// Hook para debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useMemo(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
}

export default function Inventory() {
  const { activeTenantId } = useActiveTenant();
  const [activeTab, setActiveTab] = useState("products");

  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [createMovementOpen, setCreateMovementOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    categoryId: "",
    locationId: "",
    status: "all"
  });
  
  // Debounce da busca para evitar muitas requisições
  const debouncedSearch = useDebounce(filters.search, 300);
  const searchFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearch
  }), [filters.categoryId, filters.locationId, filters.status, debouncedSearch]);

  const { data: products = [], isLoading: loadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ["products", activeTenantId, searchFilters],
    enabled: !!activeTenantId,
    queryFn: async () => {
      console.log('[Inventory] Buscando produtos com filtros:', searchFilters);
      
      let query = supabase
        .from("products")
        .select(`
          *,
          category:product_categories(id, name, color),
          location:stock_locations(id, name),
          cost_centers:product_cost_centers(
          id,
            cost_center:cost_center_tags(id, name, color)
          ),
          ficha_tecnica:production_products!production_products_product_id_fkey(
            id, cmv_total, status
          )
        `)
        .eq("tenant_id", activeTenantId!)
        .order("name");


      if (searchFilters.search && searchFilters.search.trim()) {
        const searchTerm = searchFilters.search.trim();
        query = query.or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      if (searchFilters.categoryId) {
        query = query.eq("category_id", searchFilters.categoryId);
      }

      if (searchFilters.locationId) {
        query = query.eq("location_id", searchFilters.locationId);
      }

      if (searchFilters.status !== "all") {
        query = query.eq("active", searchFilters.status === "active");
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('[Inventory] Erro na busca:', error);
        throw error;
      }
      
      console.log('[Inventory] Produtos encontrados:', data?.length);
      return data;
    }
  });

  const { data: movements = [], isLoading: loadingMovements, refetch: refetchMovements } = useQuery({
    queryKey: ["stock-movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select(`
          *,
          product:products(id, name, code),
          supplier:suppliers(id, name),
          location:stock_locations(id, name),
          created_by_profile:profiles(id, full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    }
  });

  return (
    <DashboardLayout>
      <ModuleShell
        moduleKey="estoque"
        title="Estoque"
        description="Controle de itens e movimentações"
        icon={<Package className="h-5 w-5" />}
        headerActions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCreateMovementOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Movimentação
            </Button>
            <Button onClick={() => setCreateProductOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Item
            </Button>
          </div>
        }
        overview={
          <div className="space-y-4">
            <InventoryKPIs />
            <LowStockAlerts />
          </div>
        }
        records={
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="products">Cadastro Itens</TabsTrigger>
              <TabsTrigger value="movements">Movimentações</TabsTrigger>
              <TabsTrigger value="reservations">Reservas</TabsTrigger>
              <TabsTrigger value="costs">Custos Estoque</TabsTrigger>
              <TabsTrigger value="requests">Requisições</TabsTrigger>
              <TabsTrigger value="suggestions">Sugestão Compras</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-4">
              <InventoryFilters filters={filters} setFilters={setFilters} />
              <ProductsTable
                products={products}
                isLoading={loadingProducts}
                onSelect={() => {}}
                onRefresh={refetchProducts}
              />
            </TabsContent>

            <TabsContent value="movements">
              <StockMovementsTable
                movements={movements}
                isLoading={loadingMovements}
              />
            </TabsContent>

            <TabsContent value="reservations"><InvReservationsTab /></TabsContent>
            <TabsContent value="costs"><InvCostsTab /></TabsContent>
            <TabsContent value="requests"><MaterialRequestsTable /></TabsContent>
            <TabsContent value="suggestions"><PurchaseSuggestions /></TabsContent>
          </Tabs>
        }
        settings={
          <Tabs defaultValue="categories">
            <TabsList>
              <TabsTrigger value="categories">Categorias</TabsTrigger>
              <TabsTrigger value="locations">Locais</TabsTrigger>
            </TabsList>
            <TabsContent value="categories"><CategoriesManager /></TabsContent>
            <TabsContent value="locations"><LocationsManager /></TabsContent>
          </Tabs>
        }
        reports={
          <Tabs defaultValue="category-kpis">
            <TabsList>
              <TabsTrigger value="category-kpis">KPIs por Categoria</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="abc">Distribuição</TabsTrigger>
            </TabsList>
            <TabsContent value="category-kpis"><CategoryKPIsReport /></TabsContent>
            <TabsContent value="analytics"><InvAnalyticsTab /></TabsContent>
            <TabsContent value="abc"><ABCAnalysis /></TabsContent>
          </Tabs>
        }
      />

      <CreateProductDialog
        open={createProductOpen}
        onOpenChange={setCreateProductOpen}
        onSuccess={refetchProducts}
      />

      <CreateMovementDialog
        open={createMovementOpen}
        onOpenChange={setCreateMovementOpen}
        onSuccess={() => {
          refetchProducts();
          refetchMovements();
        }}
      />
    </DashboardLayout>
  );
}
