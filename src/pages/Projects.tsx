import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { ProjectsBoard } from "@/components/projects/ProjectsBoard";
import { ProjectsTable } from "@/components/projects/ProjectsTable";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { ProjectsFilters } from "@/components/projects/ProjectsFilters";
import { DeadlineAlerts } from "@/components/projects/DeadlineAlerts";

const Projects = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState({
    period: "last_30_days",
    stage: "Todos",
    architect: "Todos",
    origin: "Todas",
    search: ""
  });
  const [metrics, setMetrics] = useState({
    captado_count: 0,
    orcamento_count: 0,
    aprovado_count: 0,
    perdido_count: 0
  });
  const [alerts, setAlerts] = useState({
    near_due_count: 0,
    overdue_count: 0
  });

  useEffect(() => {
    fetchMetrics();
    fetchAlerts();
  }, [refreshKey]);

  const fetchMetrics = async () => {
    const { data, error } = await supabase.rpc('projects_aggregates');
    if (!error && data) {
      setMetrics(data as any);
    }
  };

  const fetchAlerts = async () => {
    const { data, error } = await supabase.rpc('project_deadline_alerts');
    if (!error && data) {
      setAlerts(data as any);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleExport = () => {
    console.log("Exportando projetos...");
  };

  const handleCreateSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
            📦 Projetos
          </h1>
          <p className="text-muted-foreground text-lg">
            Visão consolidada de Captados, Orçamentos, Aprovados e Perdidos, com controle de arquivos, orçamentos e prazos.
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <ProjectsFilters filters={filters} onFiltersChange={setFilters} />
          <div className="flex gap-3">
            <Button onClick={() => window.location.href = '/projects/settings'} variant="outline" className="gap-2">
              ⚙️ Configurações
            </Button>
            <Button onClick={handleRefresh} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
            <Button onClick={handleExport} variant="ghost" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-lg shadow-primary/25">
              <Plus className="w-4 h-4" />
              Novo Projeto
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Captados</span>
              <span className="text-2xl">🟦</span>
            </div>
            <p className="text-3xl font-bold text-blue-600">{metrics.captado_count}</p>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-yellow-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Em Orçamento</span>
              <span className="text-2xl">🟨</span>
            </div>
            <p className="text-3xl font-bold text-yellow-600">{metrics.orcamento_count}</p>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-green-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Aprovados</span>
              <span className="text-2xl">🟩</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{metrics.aprovado_count}</p>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-red-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Perdidos</span>
              <span className="text-2xl">🟥</span>
            </div>
            <p className="text-3xl font-bold text-red-600">{metrics.perdido_count}</p>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-orange-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Prazos Próximos</span>
              <span className="text-2xl">📅</span>
            </div>
            <p className="text-3xl font-bold text-orange-600">{alerts.near_due_count}</p>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Prazos Vencidos</span>
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-3xl font-bold text-purple-600">{alerts.overdue_count}</p>
          </Card>
        </div>

        {/* Deadline Alerts */}
        <DeadlineAlerts refreshKey={refreshKey} />

        {/* Tabs */}
        <Tabs defaultValue="board" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="board">Board Visual</TabsTrigger>
            <TabsTrigger value="table">Tabela Completa</TabsTrigger>
          </TabsList>
          
          <TabsContent value="board" className="mt-6">
            <ProjectsBoard filters={filters} key={refreshKey} />
          </TabsContent>
          
          <TabsContent value="table" className="mt-6">
            <ProjectsTable filters={filters} key={refreshKey} />
          </TabsContent>
        </Tabs>

        {/* Create Project Dialog */}
        <CreateProjectDialog 
          open={isCreateOpen} 
          onOpenChange={setIsCreateOpen}
          onSuccess={handleCreateSuccess}
        />
      </div>
    </DashboardLayout>
  );
};

export default Projects;
