import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleShell } from "@/components/layout/ModuleShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderOpen, Calendar, Play, DollarSign, LayoutDashboard } from "lucide-react";
import { PrjOverview } from "@/components/projects/PrjOverview";
import { PrjPlanningTab } from "@/components/projects/PrjPlanningTab";
import { PrjExecutionTab } from "@/components/projects/PrjExecutionTab";
import { PrjCostsTab } from "@/components/projects/PrjCostsTab";
import { PrjAnalyticsTab } from "@/components/projects/PrjAnalyticsTab";

export default function Projetos() {
  return (
    <DashboardLayout>
      <ModuleShell
        moduleKey="projetos"
        title="Projetos"
        description="Controle de margem, custo e prazo por obra/projeto"
        icon={<FolderOpen className="h-5 w-5" />}
        records={
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="overview" className="gap-1.5"><LayoutDashboard className="h-4 w-4" />Visão Geral</TabsTrigger>
              <TabsTrigger value="planejamento" className="gap-1.5"><Calendar className="h-4 w-4" />Planejamento</TabsTrigger>
              <TabsTrigger value="execucao" className="gap-1.5"><Play className="h-4 w-4" />Execução</TabsTrigger>
              <TabsTrigger value="custos" className="gap-1.5"><DollarSign className="h-4 w-4" />Custos</TabsTrigger>
            </TabsList>
            <TabsContent value="overview"><PrjOverview /></TabsContent>
            <TabsContent value="planejamento"><PrjPlanningTab /></TabsContent>
            <TabsContent value="execucao"><PrjExecutionTab /></TabsContent>
            <TabsContent value="custos"><PrjCostsTab /></TabsContent>
          </Tabs>
        }
        reports={<PrjAnalyticsTab />}
      />
    </DashboardLayout>
  );
}
