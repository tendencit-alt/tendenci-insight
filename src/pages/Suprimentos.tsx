import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Scale, ShoppingCart, Package, BarChart3 } from "lucide-react";
import { SupRequestsTab } from "@/components/supply/SupRequestsTab";
import { SupQuotationsTab } from "@/components/supply/SupQuotationsTab";
import { SupPurchaseOrdersTab } from "@/components/supply/SupPurchaseOrdersTab";
import { SupReceivingTab } from "@/components/supply/SupReceivingTab";
import { SupAnalyticsTab } from "@/components/supply/SupAnalyticsTab";

export default function Suprimentos() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Suprimentos</h1>
          <p className="text-muted-foreground text-sm">Solicitações, cotações, pedidos de compra e recebimentos</p>
        </div>
        <Tabs defaultValue="solicitacoes" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="solicitacoes" className="gap-1.5"><ClipboardList className="h-4 w-4" />Solicitações</TabsTrigger>
            <TabsTrigger value="cotacoes" className="gap-1.5"><Scale className="h-4 w-4" />Cotações</TabsTrigger>
            <TabsTrigger value="pedidos" className="gap-1.5"><ShoppingCart className="h-4 w-4" />Pedidos de Compra</TabsTrigger>
            <TabsTrigger value="recebimentos" className="gap-1.5"><Package className="h-4 w-4" />Recebimentos</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-4 w-4" />Analytics</TabsTrigger>
          </TabsList>
          <TabsContent value="solicitacoes"><SupRequestsTab /></TabsContent>
          <TabsContent value="cotacoes"><SupQuotationsTab /></TabsContent>
          <TabsContent value="pedidos"><SupPurchaseOrdersTab /></TabsContent>
          <TabsContent value="recebimentos"><SupReceivingTab /></TabsContent>
          <TabsContent value="analytics"><SupAnalyticsTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
