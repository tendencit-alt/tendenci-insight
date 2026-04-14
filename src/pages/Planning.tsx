import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, DollarSign, FlaskConical, BarChart3, GitCompareArrows } from "lucide-react";
import PlanGoalsTab from "@/components/planning/PlanGoalsTab";
import PlanBudgetTab from "@/components/planning/PlanBudgetTab";
import PlanScenariosTab from "@/components/planning/PlanScenariosTab";
import PlanTrackingTab from "@/components/planning/PlanTrackingTab";
import PlanAnalyticsTab from "@/components/planning/PlanAnalyticsTab";

export default function Planning() {
  const [activeTab, setActiveTab] = useState("goals");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Metas & Orçamento Corporativo</h1>
            <p className="text-muted-foreground">Planejamento estratégico com Meta vs Forecast vs Realizado</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card border border-border p-1 h-auto flex-wrap">
            <TabsTrigger value="goals" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Target className="h-4 w-4" />
              Metas
            </TabsTrigger>
            <TabsTrigger value="budget" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <DollarSign className="h-4 w-4" />
              Orçamento
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FlaskConical className="h-4 w-4" />
              Simulações
            </TabsTrigger>
            <TabsTrigger value="tracking" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <GitCompareArrows className="h-4 w-4" />
              Acompanhamento
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-4 w-4" />
              Planning Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="goals"><PlanGoalsTab /></TabsContent>
          <TabsContent value="budget"><PlanBudgetTab /></TabsContent>
          <TabsContent value="scenarios"><PlanScenariosTab /></TabsContent>
          <TabsContent value="tracking"><PlanTrackingTab /></TabsContent>
          <TabsContent value="analytics"><PlanAnalyticsTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
