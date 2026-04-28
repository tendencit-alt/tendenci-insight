import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleShell } from "@/components/layout/ModuleShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, FileText, BarChart3, TrendingUp } from "lucide-react";
import CRMProposalsTab from "@/components/crm-commercial/CRMProposalsTab";
import CRMPipelineTab from "@/components/crm-commercial/CRMPipelineTab";
import CRMForecastTab from "@/components/crm-commercial/CRMForecastTab";
import CRMAnalyticsTab from "@/components/crm-commercial/CRMAnalyticsTab";

export default function CRMCommercial() {
  const [activeTab, setActiveTab] = useState("pipeline");

  return (
    <DashboardLayout>
      <ModuleShell
        moduleKey="crm-comercial"
        title="CRM & Pipeline Comercial"
        description="Pipeline com forecast automático de receita integrado ao financeiro"
        icon={<Target className="h-5 w-5" />}
        records={
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-card border border-border p-1 h-auto flex-wrap">
              <TabsTrigger value="pipeline" className="gap-2">
                <Target className="h-4 w-4" />
                Pipeline
              </TabsTrigger>
              <TabsTrigger value="propostas" className="gap-2">
                <FileText className="h-4 w-4" />
                Propostas
              </TabsTrigger>
              <TabsTrigger value="forecast" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Forecast Receita
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pipeline"><CRMPipelineTab /></TabsContent>
            <TabsContent value="propostas"><CRMProposalsTab /></TabsContent>
            <TabsContent value="forecast"><CRMForecastTab /></TabsContent>
          </Tabs>
        }
        reports={<CRMAnalyticsTab />}
      />
    </DashboardLayout>
  );
}
