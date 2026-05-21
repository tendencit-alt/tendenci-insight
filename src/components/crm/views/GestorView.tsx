import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Target, TrendingUp, Award, BarChart3 } from "lucide-react";
import { PrjOverview } from "@/components/projects/PrjOverview";
import { ArchitectPerformance } from "@/components/projects/ArchitectPerformance";
import { PrjAnalyticsTab } from "@/components/projects/PrjAnalyticsTab";
import CRMPipelineTab from "@/components/crm-commercial/CRMPipelineTab";
import CRMForecastTab from "@/components/crm-commercial/CRMForecastTab";

export function GestorView({ initialTab }: { initialTab?: string } = {}) {
  const allowed = ["overview", "pipeline", "forecast", "performance", "analytics"];
  const defaultTab = initialTab && allowed.includes(initialTab) ? initialTab : "overview";
  return (
    <Tabs defaultValue={defaultTab} className="space-y-4">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="overview" className="gap-1.5"><LayoutDashboard className="h-4 w-4" />Visão Geral</TabsTrigger>
        <TabsTrigger value="pipeline" className="gap-1.5"><Target className="h-4 w-4" />Pipeline</TabsTrigger>
        <TabsTrigger value="forecast" className="gap-1.5"><TrendingUp className="h-4 w-4" />Forecast</TabsTrigger>
        <TabsTrigger value="performance" className="gap-1.5"><Award className="h-4 w-4" />Performance</TabsTrigger>
        <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-4 w-4" />Analytics</TabsTrigger>
      </TabsList>

      <TabsContent value="overview"><PrjOverview /></TabsContent>
      <TabsContent value="pipeline"><CRMPipelineTab /></TabsContent>
      <TabsContent value="forecast"><CRMForecastTab /></TabsContent>
      <TabsContent value="performance"><ArchitectPerformance /></TabsContent>
      <TabsContent value="analytics"><PrjAnalyticsTab /></TabsContent>
    </Tabs>
  );
}
