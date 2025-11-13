import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, Settings, RefreshCcw, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CRMKPIs } from "@/components/crm/CRMKPIs";
import { CRMSLAAlerts } from "@/components/crm/CRMSLAAlerts";
import { CRMTasksPanel } from "@/components/crm/CRMTasksPanel";
import { CRMBoard } from "@/components/crm/CRMBoard";
import { CRMFilters } from "@/components/crm/CRMFilters";
import { CreateDealDialog } from "@/components/crm/CreateDealDialog";
import { ManagePipelineDialog } from "@/components/crm/ManagePipelineDialog";

export default function CRM() {
  const { toast } = useToast();
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchPipelines();
  }, []);

  const fetchPipelines = async () => {
    const { data, error } = await supabase
      .from("crm_pipelines")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      toast({
        title: "Erro ao carregar funis",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setPipelines(data || []);
    if (data && data.length > 0 && !selectedPipeline) {
      setSelectedPipeline(data[0].id);
    }
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    fetchPipelines();
    toast({
      title: "Atualizado",
      description: "Dados do CRM atualizados com sucesso.",
    });
  };

  const handleExport = () => {
    toast({
      title: "Exportação",
      description: "Funcionalidade de exportação em desenvolvimento.",
    });
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">🗂️ CRM Kanban</h1>
          <p className="text-xs lg:text-sm text-muted-foreground">
            Funis e cadências personalizadas, com métricas, SLA e integrações
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Novo Negócio
          </Button>
          <Button variant="outline" onClick={() => setIsManageDialogOpen(true)} size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Funis/Etapas
          </Button>
          <Button variant="outline" onClick={handleRefresh} size="sm">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button variant="outline" onClick={handleExport} size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>

        {/* Filters */}
        <CRMFilters
          pipelines={pipelines}
          selectedPipeline={selectedPipeline}
          onPipelineChange={setSelectedPipeline}
        />

        {selectedPipeline && (
          <>
            {/* KPIs */}
            <CRMKPIs pipelineId={selectedPipeline} key={`kpi-${refreshKey}`} />

            {/* SLA Alerts */}
            <CRMSLAAlerts pipelineId={selectedPipeline} key={`sla-${refreshKey}`} />

            {/* Tarefas Pendentes */}
            <CRMTasksPanel pipelineId={selectedPipeline} key={`tasks-${refreshKey}`} />

            {/* Kanban Board */}
            <CRMBoard 
              pipelineId={selectedPipeline} 
              key={`board-${refreshKey}`}
              onRefresh={handleRefresh}
            />
          </>
        )}
        
        {!selectedPipeline && pipelines.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Nenhum funil cadastrado. Crie seu primeiro funil de vendas!</p>
          </div>
        )}

        {/* Dialogs */}
        <CreateDealDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          pipelineId={selectedPipeline}
          onSuccess={handleRefresh}
        />

        <ManagePipelineDialog
          open={isManageDialogOpen}
          onOpenChange={setIsManageDialogOpen}
          selectedPipeline={selectedPipeline}
          onSuccess={handleRefresh}
        />
      </div>
    </DashboardLayout>
  );
}
