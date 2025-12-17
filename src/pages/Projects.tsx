import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Download, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { ProjectsBoard } from "@/components/projects/ProjectsBoard";
import { ProjectsTable } from "@/components/projects/ProjectsTable";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { ProjectsFilters } from "@/components/projects/ProjectsFilters";
import { DeadlineAlerts } from "@/components/projects/DeadlineAlerts";
import { ArchitectPerformance } from "@/components/projects/ArchitectPerformance";
import { ProjectDetailSheet } from "@/components/projects/ProjectDetailSheet";
import { subDays, startOfDay, endOfDay, startOfMonth } from "date-fns";

const Projects = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState({
    period: "last_30_days",
    stages: [] as string[],
    architect: "Todos",
    search: "",
    customDateRange: { from: undefined as Date | undefined, to: undefined as Date | undefined },
    filterByDeadline: false
  });
  const [metrics, setMetrics] = useState({
    recebido_count: 0,
    em_orcamento_count: 0,
    orcado_count: 0,
    apresentado_count: 0,
    em_negociacao_count: 0,
    aprovado_count: 0,
    aprovado_value: 0,
    perdido_count: 0,
    near_due_count: 0,
    overdue_count: 0,
    total_value: 0
  });
  
  // Estado para DeadlineAlerts click
  const [alertProjectId, setAlertProjectId] = useState<string | null>(null);
  const [alertProject, setAlertProject] = useState<any>(null);
  const [alertDetailOpen, setAlertDetailOpen] = useState(false);

  const getDateRange = useCallback(() => {
    const now = new Date();
    let dateFrom: Date | null = null;
    let dateTo: Date | null = null;

    switch (filters.period) {
      case "today":
        dateFrom = startOfDay(now);
        dateTo = endOfDay(now);
        break;
      case "yesterday":
        const yesterday = subDays(now, 1);
        dateFrom = startOfDay(yesterday);
        dateTo = endOfDay(yesterday);
        break;
      case "last_7_days":
        dateFrom = subDays(now, 7);
        break;
      case "thisMonth":
        dateFrom = startOfMonth(now);
        break;
      case "last_30_days":
        dateFrom = subDays(now, 30);
        break;
      case "last_60_days":
        dateFrom = subDays(now, 60);
        break;
      case "last_90_days":
        dateFrom = subDays(now, 90);
        break;
      case "custom":
        if (filters.customDateRange?.from) {
          dateFrom = filters.customDateRange.from;
          dateTo = filters.customDateRange.to || undefined;
        }
        break;
      case "all":
      default:
        break;
    }

    return { dateFrom, dateTo };
  }, [filters.period, filters.customDateRange]);

  const fetchMetrics = useCallback(async () => {
    const { dateFrom, dateTo } = getDateRange();
    
    // Build RPC params
    const params: any = {
      p_filter_by_deadline: filters.filterByDeadline
    };

    if (filters.stages && filters.stages.length > 0) {
      params.p_stages = filters.stages;
    }

    if (filters.architect && filters.architect !== "Todos") {
      if (filters.architect === "sem-arquiteto") {
        params.p_architect_id = "00000000-0000-0000-0000-000000000000";
      } else {
        params.p_architect_id = filters.architect;
      }
    }

    if (dateFrom) {
      params.p_date_from = dateFrom.toISOString();
    }
    if (dateTo) {
      params.p_date_to = dateTo.toISOString();
    }

    const { data, error } = await supabase.rpc('projects_metrics_by_history', params);
    
    if (!error && data && data.length > 0) {
      setMetrics(data[0] as any);
    }
  }, [filters, getDateRange]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleExport = () => {
    console.log("Exportando projetos...");
  };

  const handleCreateSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Handler para clique no DeadlineAlerts
  const handleAlertProjectClick = async (projectId: string) => {
    setAlertProjectId(projectId);
    
    // Buscar dados completos do projeto
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(name, phone),
        architect:architects(name)
      `)
      .eq('id', projectId)
      .single();
    
    if (!error && data) {
      setAlertProject(data);
      setAlertDetailOpen(true);
    }
  };

  const getPeriodLabel = () => {
    switch (filters.period) {
      case "today": return "(Hoje)";
      case "yesterday": return "(Ontem)";
      case "last_7_days": return "(7 dias)";
      case "thisMonth": return "(Este mês)";
      case "last_30_days": return "(30 dias)";
      case "last_60_days": return "(60 dias)";
      case "last_90_days": return "(90 dias)";
      case "custom": return "(Personalizado)";
      case "all": return "(Total)";
      default: return "";
    }
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
            Gerenciamento de todos os projetos enviados pelos arquitetos parceiros - acompanhe status, prazos e desempenho.
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <ProjectsFilters filters={filters} onFiltersChange={setFilters} />
          <div className="flex flex-wrap gap-3">
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

        {/* KPI Valor Total - Destaque */}
        <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-2 border-primary bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Valor Total dos Projetos {getPeriodLabel()}</span>
            <span className="text-2xl">💎</span>
          </div>
          <p className="text-3xl font-bold text-primary">
            R$ {(metrics.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-4">
          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Recebidos {getPeriodLabel()}</span>
              <span className="text-2xl">📥</span>
            </div>
            <p className="text-3xl font-bold text-blue-600">{metrics.recebido_count}</p>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Em Orçamento {getPeriodLabel()}</span>
              <span className="text-2xl">📝</span>
            </div>
            <p className="text-3xl font-bold text-purple-600">{metrics.em_orcamento_count}</p>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-indigo-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Orçado {getPeriodLabel()}</span>
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-3xl font-bold text-indigo-600">{metrics.orcado_count}</p>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-cyan-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Apresentado {getPeriodLabel()}</span>
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-3xl font-bold text-cyan-600">{metrics.apresentado_count}</p>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-orange-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Em Negociação {getPeriodLabel()}</span>
              <span className="text-2xl">🤝</span>
            </div>
            <p className="text-3xl font-bold text-orange-600">{metrics.em_negociacao_count}</p>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-green-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Aprovados {getPeriodLabel()}</span>
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{metrics.aprovado_count}</p>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-green-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Valor Aprovado {getPeriodLabel()}</span>
              <span className="text-2xl">💵</span>
            </div>
            <p className="text-2xl font-bold text-green-700">
              R$ {(metrics.aprovado_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-red-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Perdidos {getPeriodLabel()}</span>
              <span className="text-2xl">❌</span>
            </div>
            <p className="text-3xl font-bold text-red-600">{metrics.perdido_count}</p>
          </Card>
        </div>

        {/* Deadline Alerts - agora com click funcional */}
        <DeadlineAlerts refreshKey={refreshKey} onProjectClick={handleAlertProjectClick} />

        {/* Tabs */}
        <Tabs defaultValue="board" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="board" className="gap-2">
              📋 Board
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-2">
              📊 Tabela
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Desempenho dos Arquitetos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="board" className="space-y-6">
            <ProjectsBoard key={refreshKey} filters={filters} />
          </TabsContent>

          <TabsContent value="table" className="space-y-6">
            <ProjectsTable key={refreshKey} filters={filters} />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <ArchitectPerformance key={refreshKey} />
          </TabsContent>
        </Tabs>

        {/* Create Project Dialog */}
        <CreateProjectDialog 
          open={isCreateOpen} 
          onOpenChange={setIsCreateOpen}
          onSuccess={handleCreateSuccess}
        />

        {/* Project Detail Sheet para Deadline Alerts */}
        <ProjectDetailSheet
          project={alertProject}
          open={alertDetailOpen}
          onOpenChange={setAlertDetailOpen}
          onSuccess={handleRefresh}
        />
      </div>
    </DashboardLayout>
  );
};

export default Projects;
