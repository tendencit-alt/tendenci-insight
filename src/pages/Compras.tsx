import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleShell } from "@/components/layout/ModuleShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Scale, ShoppingCart, Package, ShoppingBag, History, BarChart3 } from "lucide-react";
import { SupRequestsTab } from "@/components/supply/SupRequestsTab";
import { SupQuotationsTab } from "@/components/supply/SupQuotationsTab";
import { SupPurchaseOrdersTab } from "@/components/supply/SupPurchaseOrdersTab";
import { SupReceivingTab } from "@/components/supply/SupReceivingTab";
import { SupAnalyticsTab } from "@/components/supply/SupAnalyticsTab";
import { PurchasesHistoryTab } from "@/components/purchases/PurchasesHistoryTab";

export default function Compras() {
  return (
    <DashboardLayout>
      <ModuleShell
        moduleKey="suprimentos"
        title="Compras"
        description="Solicitações, cotações, pedidos de compra, recebimentos e indicadores"
        icon={<ShoppingBag className="h-5 w-5" />}
        records={
          <Tabs defaultValue="solicitacoes" className="space-y-4">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="solicitacoes" className="gap-1.5"><ClipboardList className="h-4 w-4" />Solicitações</TabsTrigger>
              <TabsTrigger value="pedidos" className="gap-1.5"><ShoppingCart className="h-4 w-4" />Pedidos de Compra</TabsTrigger>
              <TabsTrigger value="cotacoes" className="gap-1.5"><Scale className="h-4 w-4" />Cotações</TabsTrigger>
              <TabsTrigger value="recebimentos" className="gap-1.5"><Package className="h-4 w-4" />Recebimentos</TabsTrigger>
              <TabsTrigger value="historico" className="gap-1.5"><History className="h-4 w-4" />Histórico</TabsTrigger>
              <TabsTrigger value="kpis" className="gap-1.5"><BarChart3 className="h-4 w-4" />KPIs</TabsTrigger>
            </TabsList>
            <TabsContent value="solicitacoes"><SupRequestsTab /></TabsContent>
            <TabsContent value="pedidos"><SupPurchaseOrdersTab /></TabsContent>
            <TabsContent value="cotacoes"><SupQuotationsTab /></TabsContent>
            <TabsContent value="recebimentos"><SupReceivingTab /></TabsContent>
            <TabsContent value="historico"><PurchasesHistoryTab /></TabsContent>
            <TabsContent value="kpis"><SupAnalyticsTab /></TabsContent>
          </Tabs>
        }
      />
    </DashboardLayout>
  );
}
