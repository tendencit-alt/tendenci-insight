import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Download, ChevronDown, LayoutGrid, Table as TableIcon, Filter, Bell, MoreHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ProjectsBoard } from "@/components/projects/ProjectsBoard";
import { ProjectsTable } from "@/components/projects/ProjectsTable";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { ProjectsFilters } from "@/components/projects/ProjectsFilters";
import { DeadlineAlerts } from "@/components/projects/DeadlineAlerts";
import { ProjectDetailSheet } from "@/components/projects/ProjectDetailSheet";
import { KPIDetailDialog } from "@/components/projects/KPIDetailDialog";
import { subDays, startOfDay, endOfDay, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface KPIConfig {
  key: string;
  label: string;
  stage: string | string[];
  accent: string;
  showValue?: boolean;
}

const PRIMARY_KPIS: KPIConfig[] = [
  { key: 'total_orcado', label: 'Total Orçado', stage: ['orcado', 'apresentado', 'em_negociacao'], accent: 'text-primary', showValue: true },
  { key: 'recebido', label: 'Recebidos', stage: 'recebido', accent: 'text-blue-600' },
  { key: 'em_orcamento', label: 'Em Orçamento', stage: 'em_orcamento', accent: 'text-purple-600' },
  { key: 'aprovado', label: 'Aprovado', stage: 'aprovado', accent: 'text-emerald-600', showValue: true },
  { key: 'perdido', label: 'Perdido', stage: 'perdido', accent: 'text-rose-600', showValue: true },
];

const SECONDARY_KPIS: KPIConfig[] = [
  { key: 'orcado', label: 'Orçado', stage: 'orcado', accent: 'text-indigo-600', showValue: true },
  { key: 'apresentado', label: 'Apresentado', stage: 'apresentado', accent: 'text-cyan-600', showValue: true },
  { key: 'em_negociacao', label: 'Em Negociação', stage: 'em_negociacao', accent: 'text-orange-600', showValue: true },
];

const VIEW_KEY = "crm_consultor_view_mode";

export function PrjOverview() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewMode, setViewMode] = useState<"board" | "table">(() => {
    if (typeof window === "undefined") return "board";
    return (localStorage.getItem(VIEW_KEY) as "board" | "table") || "board";
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [filters, setFilters] = useState({
    period: "all",
    stages: [] as string[],
    architect: "Todos",
    search: "",
    customDateRange: { from: undefined as Date | undefined, to: undefined as Date | undefined }
  });
  const [metrics, setMetrics] = useState<any>({
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

  const [alertProject, setAlertProject] = useState<any>(null);
  const [alertDetailOpen, setAlertDetailOpen] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState<KPIConfig | null>(null);
  const [kpiDetailOpen, setKpiDetailOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(VIEW_KEY, viewMode);
  }, [viewMode]);

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
    const { data, error } = await supabase
      .from('projects')
      .select(`*, client:clients(name, phone), architect:architects(name)`)
      .eq('id', projectId)
      .single();
    if (!error && data) {
      setAlertProject(data);
      setAlertDetailOpen(true);
      setAlertsOpen(false);
    }
  };

  const handleKPIClick = (kpi: KPIConfig) => { setSelectedKPI(kpi); setKpiDetailOpen(true); };

  const getMetricCount = (key: string): number => metrics[`${key}_count`] ?? 0;
  const getMetricValue = (key: string): number => metrics[`${key}_value`] ?? 0;

  const { dateFrom, dateTo } = getDateRange();
  const boardFilters = { stages: filters.stages, architect: filters.architect, search: filters.search };
  const alertsCount = (metrics.overdue_count || 0) + (metrics.near_due_count || 0);

  const periodLabel = (() => {
    switch (filters.period) {
      case "today": return "Hoje";
      case "last_7_days": return "7 dias";
      case "thisMonth": return "Este mês";
      case "last_30_days": return "30 dias";
      case "custom": return "Personalizado";
      default: return "Todo período";
    }
  })();

  const activeFiltersCount =
    (filters.stages?.length || 0) +
    (filters.architect !== "Todos" ? 1 : 0) +
    (filters.period !== "all" ? 1 : 0) +
    (filters.search ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Toolbar de ações + filtros */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto max-w-[min(92vw,720px)] p-4" align="start">
              <ProjectsFilters filters={filters} onFiltersChange={setFilters} />
            </PopoverContent>
          </Popover>

          <span className="text-xs text-muted-foreground">{periodLabel}</span>

          {alertsCount > 0 && (
            <Popover open={alertsOpen} onOpenChange={setAlertsOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50">
                  <Bell className="h-3.5 w-3.5" />
                  Alertas
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] bg-amber-100 text-amber-700">
                    {alertsCount}
                  </Badge>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[min(92vw,420px)] p-3" align="start">
                <DeadlineAlerts refreshKey={refreshKey} onProjectClick={handleAlertProjectClick} />
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border bg-background p-0.5">
            <Button
              variant={viewMode === "board" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 gap-1"
              onClick={() => setViewMode("board")}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Kanban
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 gap-1"
              onClick={() => setViewMode("table")}
            >
              <TableIcon className="h-3.5 w-3.5" /> Tabela
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleRefresh} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Atualizar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" /> Exportar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={() => setIsCreateOpen(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Novo
          </Button>
        </div>
      </div>

      {/* KPI strip compacto — 1 linha responsiva */}
      <Card className="p-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">
          {PRIMARY_KPIS.map((kpi) => (
            <button
              key={kpi.key}
              onClick={() => handleKPIClick(kpi)}
              className="text-left px-3 py-2 rounded-md hover:bg-muted/60 transition-colors group"
            >
              <div className="text-[11px] text-muted-foreground truncate">{kpi.label}</div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className={cn("text-lg font-semibold leading-none", kpi.accent)}>
                  {kpi.key === 'total_orcado' ? (metrics.total_orcado_count || 0) : getMetricCount(kpi.key)}
                </span>
                {kpi.showValue && (
                  <span className="text-[11px] text-muted-foreground truncate">
                    {((kpi.key === 'total_orcado' ? metrics.total_orcado_value : getMetricValue(kpi.key)) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Detalhes secundários em popover */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="mt-1 w-full text-[11px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 py-1 border-t">
              Detalhes do funil <ChevronDown className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(92vw,520px)] p-2" align="end">
            <div className="grid grid-cols-3 gap-1">
              {SECONDARY_KPIS.map((kpi) => (
                <button
                  key={kpi.key}
                  onClick={() => handleKPIClick(kpi)}
                  className="text-left px-3 py-2 rounded-md hover:bg-muted/60 transition-colors"
                >
                  <div className="text-[11px] text-muted-foreground truncate">{kpi.label}</div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className={cn("text-base font-semibold", kpi.accent)}>
                      {getMetricCount(kpi.key)}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {(getMetricValue(kpi.key) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </Card>

      {/* Conteúdo único: Kanban OU Tabela */}
      <div>
        {viewMode === "board" ? (
          <ProjectsBoard key={refreshKey} filters={boardFilters} />
        ) : (
          <ProjectsTable key={refreshKey} filters={filters} />
        )}
      </div>

      <CreateProjectDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onSuccess={handleCreateSuccess} />
      <ProjectDetailSheet project={alertProject} open={alertDetailOpen} onOpenChange={setAlertDetailOpen} onSuccess={handleRefresh} />
      {selectedKPI && (
        <KPIDetailDialog
          open={kpiDetailOpen}
          onOpenChange={setKpiDetailOpen}
          stage={selectedKPI.stage}
          stageLabel={selectedKPI.label}
          stageIcon={""}
          dateFrom={dateFrom}
          dateTo={dateTo}
          periodLabel={periodLabel}
          architectId={filters.architect !== "Todos" ? filters.architect : undefined}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}
