import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, Gauge, Boxes, Heart, BarChart3 } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { CompaniesTab } from "@/components/saas-admin/CompaniesTab";
import { UsersTab } from "@/components/saas-admin/UsersTab";
import { PlansLimitsTab } from "@/components/saas-admin/PlansLimitsTab";
import { ModulesTab } from "@/components/saas-admin/ModulesTab";
import { HealthOverviewTab } from "@/components/saas-admin/HealthOverviewTab";
import { AdminAnalyticsTab } from "@/components/saas-admin/AdminAnalyticsTab";

export default function SmartAdmin() {
  const { isOwner, isMaster } = usePermissions();
  if (!isOwner && !isMaster) return <Navigate to="/" replace />;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            🛠️ Smart Admin Layer
          </h1>
          <p className="text-muted-foreground mt-1">Centro operacional do SaaS Tendenci — empresas, usuários, planos e saúde</p>
        </div>

        <Tabs defaultValue="companies">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="companies" className="gap-1.5"><Building2 className="h-4 w-4" />Empresas</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5"><Users className="h-4 w-4" />Usuários</TabsTrigger>
            <TabsTrigger value="plans" className="gap-1.5"><Gauge className="h-4 w-4" />Planos & Limites</TabsTrigger>
            <TabsTrigger value="modules" className="gap-1.5"><Boxes className="h-4 w-4" />Módulos</TabsTrigger>
            <TabsTrigger value="health" className="gap-1.5"><Heart className="h-4 w-4" />Saúde</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-4 w-4" />Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="pt-6"><CompaniesTab /></TabsContent>
          <TabsContent value="users" className="pt-6"><UsersTab /></TabsContent>
          <TabsContent value="plans" className="pt-6"><PlansLimitsTab /></TabsContent>
          <TabsContent value="modules" className="pt-6"><ModulesTab /></TabsContent>
          <TabsContent value="health" className="pt-6"><HealthOverviewTab /></TabsContent>
          <TabsContent value="analytics" className="pt-6"><AdminAnalyticsTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
