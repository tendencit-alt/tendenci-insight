import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2, Clock, DollarSign, TrendingUp, BarChart3 } from "lucide-react";
import { HREmployeesTab } from "@/components/hr/HREmployeesTab";
import { HROrganizationTab } from "@/components/hr/HROrganizationTab";
import { HRTimesheetsTab } from "@/components/hr/HRTimesheetsTab";
import { HRLaborCostsTab } from "@/components/hr/HRLaborCostsTab";
import { HRPerformanceTab } from "@/components/hr/HRPerformanceTab";
import { HRAnalyticsTab } from "@/components/hr/HRAnalyticsTab";

export default function RecursosHumanos() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recursos Humanos</h1>
          <p className="text-muted-foreground text-sm">Gestão de colaboradores, jornadas e custos de mão de obra</p>
        </div>

        <Tabs defaultValue="colaboradores" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="colaboradores" className="gap-1.5"><Users className="h-4 w-4" />Colaboradores</TabsTrigger>
            <TabsTrigger value="organizacao" className="gap-1.5"><Building2 className="h-4 w-4" />Estrutura</TabsTrigger>
            <TabsTrigger value="jornadas" className="gap-1.5"><Clock className="h-4 w-4" />Jornadas</TabsTrigger>
            <TabsTrigger value="custos" className="gap-1.5"><DollarSign className="h-4 w-4" />Custos MO</TabsTrigger>
            <TabsTrigger value="performance" className="gap-1.5"><TrendingUp className="h-4 w-4" />Performance</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-4 w-4" />Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="colaboradores"><HREmployeesTab /></TabsContent>
          <TabsContent value="organizacao"><HROrganizationTab /></TabsContent>
          <TabsContent value="jornadas"><HRTimesheetsTab /></TabsContent>
          <TabsContent value="custos"><HRLaborCostsTab /></TabsContent>
          <TabsContent value="performance"><HRPerformanceTab /></TabsContent>
          <TabsContent value="analytics"><HRAnalyticsTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
