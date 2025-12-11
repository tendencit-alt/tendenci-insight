import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import InventoryKPIs from "@/components/inventory/InventoryKPIs";
import InventoryFilters from "@/components/inventory/InventoryFilters";
import ProductsTable from "@/components/inventory/ProductsTable";
import StockMovementsTable from "@/components/inventory/StockMovementsTable";
import CategoriesManager from "@/components/inventory/CategoriesManager";
import LocationsManager from "@/components/inventory/LocationsManager";
import CreateProductDialog from "@/components/inventory/CreateProductDialog";
import ProductDetailSheet from "@/components/inventory/ProductDetailSheet";
import CreateMovementDialog from "@/components/inventory/CreateMovementDialog";
import LowStockAlerts from "@/components/inventory/LowStockAlerts";
import PurchaseSuggestions from "@/components/inventory/PurchaseSuggestions";
import InventoryAdvancedKPIs from "@/components/inventory/InventoryAdvancedKPIs";
import ABCAnalysis from "@/components/inventory/ABCAnalysis";

export default function Inventory() {
  const [activeTab, setActiveTab] = useState("products");
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [createMovementOpen, setCreateMovementOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [filters, setFilters] = useState({
    search: "",
    categoryId: "",
    locationId: "",
    status: "all"
  });

  const { data: products = [], isLoading: loadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ["products", filters],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(`
          *,
          category:product_categories(id, name, color),
          location:stock_locations(id, name)
        `)
        .order("name");

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      }

      if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }

      if (filters.locationId) {
        query = query.eq("location_id", filters.locationId);
      }

      if (filters.status !== "all") {
        query = query.eq("active", filters.status === "active");
      }

      const { data, error } = await query;
      if (error) throw error;
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Estoque</h1>
            <p className="text-sm text-muted-foreground">Controle de produtos e movimentações</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCreateMovementOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Movimentação
            </Button>
            <Button onClick={() => setCreateProductOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </div>
        </div>

        <InventoryKPIs />

        <LowStockAlerts />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="movements">Movimentações</TabsTrigger>
            <TabsTrigger value="suggestions">Sugestão Compras</TabsTrigger>
            <TabsTrigger value="abc">Curva ABC</TabsTrigger>
            <TabsTrigger value="advanced">KPIs Avançados</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="locations">Locais</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <InventoryFilters filters={filters} setFilters={setFilters} />
            <ProductsTable 
              products={products} 
              isLoading={loadingProducts}
              onSelect={setSelectedProduct}
            />
          </TabsContent>

          <TabsContent value="movements">
            <StockMovementsTable 
              movements={movements} 
              isLoading={loadingMovements}
            />
          </TabsContent>

          <TabsContent value="suggestions">
            <PurchaseSuggestions />
          </TabsContent>

          <TabsContent value="abc">
            <ABCAnalysis />
          </TabsContent>

          <TabsContent value="advanced">
            <InventoryAdvancedKPIs />
          </TabsContent>

          <TabsContent value="categories">
            <CategoriesManager />
          </TabsContent>

          <TabsContent value="locations">
            <LocationsManager />
          </TabsContent>
        </Tabs>

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

        <ProductDetailSheet
          product={selectedProduct}
          open={!!selectedProduct}
          onOpenChange={(open) => !open && setSelectedProduct(null)}
          onUpdate={refetchProducts}
        />
      </div>
    </DashboardLayout>
  );
}
