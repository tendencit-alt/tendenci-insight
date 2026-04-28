import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleShell } from "@/components/layout/ModuleShell";
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
      <ModuleShell
        moduleKey="rh"
        title="Recursos Humanos"
        description="Gestão de colaboradores, jornadas e custos de mão de obra"
        icon={<Users className="h-5 w-5" />}
        records={
          <Tabs defaultValue="colaboradores" className="space-y-4">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="colaboradores" className="gap-1.5"><Users className="h-4 w-4" />Colaboradores</TabsTrigger>
              <TabsTrigger value="organizacao" className="gap-1.5"><Building2 className="h-4 w-4" />Estrutura</TabsTrigger>
              <TabsTrigger value="jornadas" className="gap-1.5"><Clock className="h-4 w-4" />Jornadas</TabsTrigger>
              <TabsTrigger value="custos" className="gap-1.5"><DollarSign className="h-4 w-4" />Custos MO</TabsTrigger>
              <TabsTrigger value="performance" className="gap-1.5"><TrendingUp className="h-4 w-4" />Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="colaboradores"><HREmployeesTab /></TabsContent>
            <TabsContent value="organizacao"><HROrganizationTab /></TabsContent>
            <TabsContent value="jornadas"><HRTimesheetsTab /></TabsContent>
            <TabsContent value="custos"><HRLaborCostsTab /></TabsContent>
            <TabsContent value="performance"><HRPerformanceTab /></TabsContent>
          </Tabs>
        }
        reports={<HRAnalyticsTab />}
      />
    </DashboardLayout>
  );
}
