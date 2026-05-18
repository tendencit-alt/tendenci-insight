import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Calendar, Play, DollarSign, BarChart3, FolderKanban } from "lucide-react";
import { OpsOrdersTab } from "@/components/ops/OpsOrdersTab";
import { OpsPlanningTab } from "@/components/ops/OpsPlanningTab";
import { OpsExecutionTab } from "@/components/ops/OpsExecutionTab";
import { OpsCostsTab } from "@/components/ops/OpsCostsTab";
import { OpsAnalyticsTab } from "@/components/ops/OpsAnalyticsTab";
import { OpsProjectsTab } from "@/components/ops/OpsProjectsTab";

const VALID_TABS = ["ordens", "projetos", "planejamento", "execucao", "custos", "analytics"];

export default function ProducaoOperacoes() {
  const [params, setParams] = useSearchParams();
  const tabFromUrl = params.get("tab");
  const activeTab = VALID_TABS.includes(tabFromUrl ?? "") ? (tabFromUrl as string) : "ordens";

  useEffect(() => {
    if (tabFromUrl && !VALID_TABS.includes(tabFromUrl)) {
      params.delete("tab");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabFromUrl]);

  const handleChange = (v: string) => {
    const next = new URLSearchParams(params);
    if (v === "ordens") next.delete("tab"); else next.set("tab", v);
    setParams(next, { replace: true });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produção e Operações</h1>
          <p className="text-muted-foreground text-sm">Planejamento, execução e custo real das ordens operacionais</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleChange} className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="ordens" className="gap-1.5"><ClipboardList className="h-4 w-4" />Ordens</TabsTrigger>
            <TabsTrigger value="projetos" className="gap-1.5"><FolderKanban className="h-4 w-4" />Projetos</TabsTrigger>
            <TabsTrigger value="planejamento" className="gap-1.5"><Calendar className="h-4 w-4" />Planejamento</TabsTrigger>
            <TabsTrigger value="execucao" className="gap-1.5"><Play className="h-4 w-4" />Execução</TabsTrigger>
            <TabsTrigger value="custos" className="gap-1.5"><DollarSign className="h-4 w-4" />Custos</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-4 w-4" />Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="ordens"><OpsOrdersTab /></TabsContent>
          <TabsContent value="projetos"><OpsProjectsTab /></TabsContent>
          <TabsContent value="planejamento"><OpsPlanningTab /></TabsContent>
          <TabsContent value="execucao"><OpsExecutionTab /></TabsContent>
          <TabsContent value="custos"><OpsCostsTab /></TabsContent>
          <TabsContent value="analytics"><OpsAnalyticsTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
