import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Target, FileText, BarChart3, TrendingUp, DollarSign } from "lucide-react";
import CRMProposalsTab from "@/components/crm-commercial/CRMProposalsTab";
import CRMPipelineTab from "@/components/crm-commercial/CRMPipelineTab";
import CRMForecastTab from "@/components/crm-commercial/CRMForecastTab";
import CRMAnalyticsTab from "@/components/crm-commercial/CRMAnalyticsTab";

export default function CRMCommercial() {
  const [activeTab, setActiveTab] = useState("pipeline");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">CRM & Pipeline Comercial</h1>
            <p className="text-muted-foreground">Pipeline com forecast automático de receita integrado ao financeiro</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card border border-border p-1 h-auto flex-wrap">
            <TabsTrigger value="pipeline" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Target className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="propostas" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="h-4 w-4" />
              Propostas
            </TabsTrigger>
            <TabsTrigger value="forecast" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <TrendingUp className="h-4 w-4" />
              Forecast Receita
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline"><CRMPipelineTab /></TabsContent>
          <TabsContent value="propostas"><CRMProposalsTab /></TabsContent>
          <TabsContent value="forecast"><CRMForecastTab /></TabsContent>
          <TabsContent value="analytics"><CRMAnalyticsTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
