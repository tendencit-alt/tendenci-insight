import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Layers, Database, AlertTriangle, TrendingUp, BarChart3 } from "lucide-react";
import { SubscriptionControlTab } from "@/components/billing-ops/SubscriptionControlTab";
import { PlanEngineTab } from "@/components/billing-ops/PlanEngineTab";
import { UsageTrackingTab } from "@/components/billing-ops/UsageTrackingTab";
import { InadimplenciaTab } from "@/components/billing-ops/InadimplenciaTab";
import { UpgradeSignalsTab } from "@/components/billing-ops/UpgradeSignalsTab";
import { BillingAnalyticsAdvancedTab } from "@/components/billing-ops/BillingAnalyticsAdvancedTab";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Navigate } from "react-router-dom";

export default function BillingOps() {
  const { isOwner, isMaster, isLoading } = usePermissions();
  if (isLoading) return null;
  if (!isOwner && !isMaster) return <Navigate to="/" replace />;

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
            💰 Smart Billing Ops
          </h1>
          <p className="text-muted-foreground text-lg">
            Centro operacional financeiro do SaaS Tendenci — assinaturas, planos, inadimplência e crescimento.
          </p>
        </div>

        <Tabs defaultValue="subscriptions" className="w-full">
          <TabsList className="flex flex-wrap gap-1 h-auto">
            <TabsTrigger value="subscriptions" className="gap-1.5"><CreditCard className="h-4 w-4" />Assinaturas</TabsTrigger>
            <TabsTrigger value="plans" className="gap-1.5"><Layers className="h-4 w-4" />Planos</TabsTrigger>
            <TabsTrigger value="usage" className="gap-1.5"><Database className="h-4 w-4" />Consumo</TabsTrigger>
            <TabsTrigger value="dunning" className="gap-1.5"><AlertTriangle className="h-4 w-4" />Inadimplência</TabsTrigger>
            <TabsTrigger value="upgrade" className="gap-1.5"><TrendingUp className="h-4 w-4" />Upgrade Signals</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-4 w-4" />Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="subscriptions" className="pt-6"><SubscriptionControlTab /></TabsContent>
          <TabsContent value="plans" className="pt-6"><PlanEngineTab /></TabsContent>
          <TabsContent value="usage" className="pt-6"><UsageTrackingTab /></TabsContent>
          <TabsContent value="dunning" className="pt-6"><InadimplenciaTab /></TabsContent>
          <TabsContent value="upgrade" className="pt-6"><UpgradeSignalsTab /></TabsContent>
          <TabsContent value="analytics" className="pt-6"><BillingAnalyticsAdvancedTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
