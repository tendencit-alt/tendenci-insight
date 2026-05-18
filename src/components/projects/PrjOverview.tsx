import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Download, TrendingUp, MousePointerClick, ChevronDown, ChevronUp } from "lucide-react";
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
import { KPIDetailDialog } from "@/components/projects/KPIDetailDialog";
import { subDays, startOfDay, endOfDay, startOfMonth } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface KPIConfig {
  key: string;
  label: string;
  icon: string;
  stage: string | string[];
  borderColor: string;
  textColor: string;
  showValue?: boolean;
}

const PRIMARY_KPI_CONFIGS: KPIConfig[] = [
  { key: 'recebido', label: 'Recebidos', icon: '📥', stage: 'recebido', borderColor: 'border-l-blue-500', textColor: 'text-blue-600' },
  { key: 'em_orcamento', label: 'Em Orçamento', icon: '📝', stage: 'em_orcamento', borderColor: 'border-l-purple-500', textColor: 'text-purple-600' },
  { key: 'aprovado', label: 'Aprovado', icon: '✅', stage: 'aprovado', borderColor: 'border-l-green-500', textColor: 'text-green-600', showValue: true },
  { key: 'perdido', label: 'Perdido', icon: '❌', stage: 'perdido', borderColor: 'border-l-red-500', textColor: 'text-red-600', showValue: true },
];

const DETAIL_KPI_CONFIGS: KPIConfig[] = [
  { key: 'orcado', label: 'Orçado', icon: '💰', stage: 'orcado', borderColor: 'border-l-indigo-500', textColor: 'text-indigo-600', showValue: true },
  { key: 'apresentado', label: 'Apresentado', icon: '📊', stage: 'apresentado', borderColor: 'border-l-cyan-500', textColor: 'text-cyan-600', showValue: true },
  { key: 'em_negociacao', label: 'Em Negociação', icon: '🤝', stage: 'em_negociacao', borderColor: 'border-l-orange-500', textColor: 'text-orange-600', showValue: true },
];

export function PrjOverview() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDetailKPIs, setShowDetailKPIs] = useState(false);
  const [filters, setFilters] = useState({
    period: "all",
    stages: [] as string[],
    architect: "Todos",
    search: "",
    customDateRange: { from: undefined as Date | undefined, to: undefined as Date | undefined }
  });
  const [metrics, setMetrics] = useState({
    recebido_count: 0, recebido_value: 0,
    em_orcamento_count: 0, em_orcamento_value: 0,
    orcado_count: 0, orcado_value: 0,
    apresentado_count: 0, apresentado_value: 0,
    em_negociacao_count: 0, em_negociacao_value: 0,
    aprovado_count: 0, aprovado_value: 0,
    perdido_count: 0, perdido_value: 0,
    near_due_count: 0, overdue_count: 0,
    total_value: 0, total_orcado_count: 0, total_orcado_value: 0,
  });

  const [alertProjectId, setAlertProjectId] = useState<string | null>(null);
  const [alertProject, setAlertProject] = useState<any>(null);
  const [alertDetailOpen, setAlertDetailOpen] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState<KPIConfig | null>(null);
  const [kpiDetailOpen, setKpiDetailOpen] = useState(false);

  const getDateRange = useCallback(() => {
    const now = new Date();
    let dateFrom: Date | null = null;
    let dateTo: Date | null = null;
    switch (filters.period) {
      case "today": dateFrom = startOfDay(now); dateTo = endOfDay(now); break;
      case "last_7_days": dateFrom = subDays(now, 7); break;
      case "thisMonth": dateFrom = startOfMonth(now); break;
      case "last_30_days": dateFrom = subDays(now, 30); break;
      case "custom":
        if (filters.customDateRange?.from) {
          dateFrom = filters.customDateRange.from;
          dateTo = filters.customDateRange.to || undefined;
        }
        break;
    }
    return { dateFrom, dateTo };
  }, [filters.period, filters.customDateRange]);

  const fetchMetrics = useCallback(async () => {
    const { dateFrom, dateTo } = getDateRange();
    const params: any = {};
    if (filters.architect && filters.architect !== "Todos") {
      params.p_architect_id = filters.architect === "sem-arquiteto"
        ? "00000000-0000-0000-0000-000000000000"
        : filters.architect;
    }
    if (dateFrom) params.p_date_from = dateFrom.toISOString();
    if (dateTo) params.p_date_to = dateTo.toISOString();
    const { data, error } = await supabase.rpc('projects_metrics_by_history', params);
    if (!error && data) setMetrics(data as any);
  }, [filters, getDateRange]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics, refreshKey]);

  const handleRefresh = () => setRefreshKey(p => p + 1);
  const handleExport = () => console.log("Exportando projetos...");
  const handleCreateSuccess = () => setRefreshKey(p => p + 1);

  const handleAlertProjectClick = async (projectId: string) => {
    setAlertProjectId(projectId);
    const { data, error } = await supabase
      .from('projects')
      .select(`*, client:clients(name, phone), architect:architects(name)`)
      .eq('id', projectId)
      .single();
    if (!error && data) { setAlertProject(data); setAlertDetailOpen(true); }
  };

  const handleKPIClick = (kpi: KPIConfig) => { setSelectedKPI(kpi); setKpiDetailOpen(true); };

  const getPeriodLabel = () => {
    switch (filters.period) {
      case "today": return "(Hoje)";
      case "last_7_days": return "(7 dias)";
      case "thisMonth": return "(Este mês)";
      case "last_30_days": return "(30 dias)";
      case "custom": return "(Personalizado)";
      default: return "(Este mês)";
    }
  };

  const getMetricCount = (key: string): number => (metrics as any)[`${key}_count`] ?? 0;
  const getMetricValue = (key: string): number => (metrics as any)[`${key}_value`] ?? 0;

  const { dateFrom, dateTo } = getDateRange();
  const boardFilters = { stages: filters.stages, architect: filters.architect, search: filters.search };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <ProjectsFilters filters={filters} onFiltersChange={setFilters} />
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleRefresh} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />Atualizar
          </Button>
          <Button onClick={handleExport} variant="ghost" className="gap-2">
            <Download className="w-4 h-4" />Exportar
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-lg shadow-primary/25">
            <Plus className="w-4 h-4" />Novo Projeto
          </Button>
        </div>
      </div>

      <Card
        className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-2 border-primary bg-gradient-to-r from-primary/10 via-primary/5 to-transparent cursor-pointer hover:scale-[1.01] group relative"
        onClick={() => handleKPIClick({
          key: 'total_orcado', label: 'Valor Total Orçado', icon: '💰',
          stage: ['orcado', 'apresentado', 'em_negociacao'],
          borderColor: 'border-primary', textColor: 'text-primary', showValue: true
        })}
      >
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <MousePointerClick className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">💰 Valor Total Orçado {getPeriodLabel()}</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {metrics.total_orcado_count || 0} projetos
          </span>
        </div>
        <p className="text-3xl font-bold text-primary">
          R$ {(metrics.total_orcado_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-muted-foreground">
          Soma de: Orçado + Apresentado + Em Negociação • Clique para ver detalhes
        </p>
      </Card>

      <TooltipProvider>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PRIMARY_KPI_CONFIGS.map((kpi) => (
            <Tooltip key={kpi.key}>
              <TooltipTrigger asChild>
                <Card
                  className={`p-5 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 ${kpi.borderColor} cursor-pointer hover:scale-[1.02] hover:ring-2 hover:ring-primary/20 group relative`}
                  onClick={() => handleKPIClick(kpi)}
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MousePointerClick className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">{kpi.label}</span>
                    <span className="text-xl">{kpi.icon}</span>
                  </div>
                  <p className={`text-2xl font-bold ${kpi.textColor}`}>{getMetricCount(kpi.key)}</p>
                  {kpi.showValue && (
                    <p className="text-sm text-muted-foreground">
                      R$ {(getMetricValue(kpi.key) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </Card>
              </TooltipTrigger>
              <TooltipContent><p>Clique para ver detalhes</p></TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

      <div className="space-y-3">
        <Button
          variant="ghost"
          className="w-full flex items-center justify-between p-2 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => setShowDetailKPIs(!showDetailKPIs)}
        >
          <span>📊 Detalhes do Funil de Orçamentos</span>
          {showDetailKPIs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
        {showDetailKPIs && (
          <TooltipProvider>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              {DETAIL_KPI_CONFIGS.map((kpi) => (
                <Tooltip key={kpi.key}>
                  <TooltipTrigger asChild>
                    <Card
                      className={`p-4 space-y-2 hover:shadow-lg transition-all duration-300 border-l-4 ${kpi.borderColor} cursor-pointer hover:scale-[1.02] group relative`}
                      onClick={() => handleKPIClick(kpi)}
                    >
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MousePointerClick className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">{kpi.label}</span>
                        <span className="text-lg">{kpi.icon}</span>
                      </div>
                      <p className={`text-xl font-bold ${kpi.textColor}`}>{getMetricCount(kpi.key)}</p>
                      {kpi.showValue && (
                        <p className="text-sm text-muted-foreground">
                          R$ {(getMetricValue(kpi.key) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent><p>Clique para ver detalhes</p></TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        )}
      </div>

      <DeadlineAlerts refreshKey={refreshKey} onProjectClick={handleAlertProjectClick} />

      <Tabs defaultValue="board" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="board" className="gap-2">📋 Board</TabsTrigger>
          <TabsTrigger value="table" className="gap-2">📊 Tabela</TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <TrendingUp className="w-4 h-4" />Desempenho dos Parceiros
          </TabsTrigger>
        </TabsList>
        <TabsContent value="board" className="space-y-6">
          <ProjectsBoard key={refreshKey} filters={boardFilters} />
        </TabsContent>
        <TabsContent value="table" className="space-y-6">
          <ProjectsTable key={refreshKey} filters={filters} />
        </TabsContent>
        <TabsContent value="performance" className="space-y-6">
          <ArchitectPerformance key={refreshKey} />
        </TabsContent>
      </Tabs>

      <CreateProjectDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onSuccess={handleCreateSuccess} />
      <ProjectDetailSheet project={alertProject} open={alertDetailOpen} onOpenChange={setAlertDetailOpen} onSuccess={handleRefresh} />
      {selectedKPI && (
        <KPIDetailDialog
          open={kpiDetailOpen}
          onOpenChange={setKpiDetailOpen}
          stage={selectedKPI.stage}
          stageLabel={selectedKPI.label}
          stageIcon={selectedKPI.icon}
          dateFrom={dateFrom}
          dateTo={dateTo}
          periodLabel={getPeriodLabel()}
          architectId={filters.architect !== "Todos" ? filters.architect : undefined}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}
