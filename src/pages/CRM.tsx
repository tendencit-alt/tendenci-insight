import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, Settings, RefreshCcw, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { CRMKPIs } from "@/components/crm/CRMKPIs";
import { CRMSLAAlerts } from "@/components/crm/CRMSLAAlerts";
import { CRMTasksPanel } from "@/components/crm/CRMTasksPanel";
import { CRMBoard } from "@/components/crm/CRMBoard";
import { CRMFilters } from "@/components/crm/CRMFilters";
import { CreateDealDialog } from "@/components/crm/CreateDealDialog";
import { ManagePipelineDialog } from "@/components/crm/ManagePipelineDialog";
import { SellerPerformancePanel } from "@/components/crm/SellerPerformancePanel";
import { MasterGoalsPanel } from "@/components/crm/MasterGoalsPanel";
import { TaskReminderAlert } from "@/components/crm/TaskReminderAlert";
import { AutomationFailureAlert } from "@/components/crm/AutomationFailureAlert";
import { useCRMStatePersistence } from "@/hooks/useCRMStatePersistence";
import { describeError } from '@/lib/errorMessage';

export default function CRM() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { saveFilters, getFilters } = useCRMStatePersistence();
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [owners, setOwners] = useState<any[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showPlanned, setShowPlanned] = useState<boolean>(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<string>("thisMonth");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [autoOpenDealId, setAutoOpenDealId] = useState<string | null>(null);
  const [isLoadingPipelines, setIsLoadingPipelines] = useState(true);
  
  const isAdmin = profile?.role === 'admin';
  
  useEffect(() => {
    if (!user) return;
    
    fetchPipelines();
    fetchOwners();
    fetchCategories();
    
    // Restaurar filtros salvos
    const savedFilters = getFilters();
    if (savedFilters) {
      if (savedFilters.pipelineId) setSelectedPipeline(savedFilters.pipelineId);
      if (savedFilters.owner) setSelectedOwner(savedFilters.owner);
      if (savedFilters.status) setSelectedStatus(savedFilters.status);
      if (savedFilters.category) setSelectedCategory(savedFilters.category);
      if (savedFilters.search) setSearchQuery(savedFilters.search);
    } else {
      // Se não há filtros salvos, definir categoria padrão baseada na especialização
      const userEspec = profile?.especializacao;
      if (userEspec === 'moveis_soltos') {
        setSelectedCategory('Móveis Soltos');
      } else if (userEspec === 'moveis_planejados') {
        setSelectedCategory('Planejados');
      }
    }
    
    // Verificar se há parâmetro ?deal=ID na URL
    const dealId = searchParams.get('deal');
    if (dealId) {
      setAutoOpenDealId(dealId);
      // Remover o parâmetro da URL após capturar
      searchParams.delete('deal');
      setSearchParams(searchParams, { replace: true });
    }
  }, [user, profile]);

  // Salvar filtros sempre que mudarem
  useEffect(() => {
    if (selectedPipeline) {
      saveFilters({
        pipelineId: selectedPipeline,
        owner: selectedOwner,
        status: selectedStatus,
        category: selectedCategory,
        search: searchQuery,
      });
    }
  }, [selectedPipeline, selectedOwner, selectedStatus, selectedCategory, searchQuery]);
  const fetchPipelines = async () => {
    try {
      setIsLoadingPipelines(true);
      const {
        data,
        error
      } = await supabase.from("crm_pipelines").select("*").order("created_at", {
        ascending: true
      });
      if (error) {
        toast({
          title: "Erro ao carregar funis",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      setPipelines(data || []);
      if (data && data.length > 0 && !selectedPipeline) {
        setSelectedPipeline(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar pipelines:', error);
      toast({
        title: "Erro",
        description: describeError('Falha ao carregar funis de vendas', error),
        variant: "destructive"
      });
    } finally {
      setIsLoadingPipelines(false);
    }
  };
  const fetchOwners = async () => {
    const {
      data,
      error
    } = await supabase.from("profiles").select("id, full_name, email").order("full_name");
    if (!error && data) {
      setOwners(data);
    }
  };
  const fetchCategories = async () => {
    // Filtrar categorias baseado na especialização do vendedor
    const userEspec = profile?.especializacao;
    
    let categoriesQuery = supabase
      .from("crm_deals")
      .select("categoria")
      .not("categoria", "is", null);

    // Se vendedor tem especialização específica, filtrar apenas sua categoria
    if (userEspec === 'moveis_soltos') {
      categoriesQuery = categoriesQuery.eq("categoria", "Móveis Soltos");
    } else if (userEspec === 'moveis_planejados') {
      categoriesQuery = categoriesQuery.eq("categoria", "Planejados");
    }
    // Se for 'todos' ou admin, busca todas as categorias

    const { data, error } = await categoriesQuery;
    
    if (!error && data) {
      const uniqueCategories = Array.from(new Set(data.map(d => d.categoria).filter(Boolean)));
      setCategories(uniqueCategories as string[]);
    }
  };
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    fetchPipelines();
    toast({
      title: "Atualizado",
      description: "Dados do CRM atualizados com sucesso."
    });
  };
  const handleExport = () => {
    toast({
      title: "Exportação",
      description: "Funcionalidade de exportação em desenvolvimento."
    });
  };
  return <DashboardLayout>
      <div className="flex flex-col gap-1.5">
        {/* Alertas de Falha de Automação */}
        <AutomationFailureAlert />

        {/* Painel de Metas para Usuários Master */}
        {isAdmin && <MasterGoalsPanel />}

        {/* Painel de Desempenho do Vendedor */}
        {!isAdmin && <SellerPerformancePanel />}

        {/* Header com botões - OTIMIZADO */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight">🗂️ CRM Clientes</h1>
            <p className="text-sm text-muted-foreground">
              Funis e cadências personalizadas, com métricas, SLA e integrações
            </p>
          </div>

          {/* Botões de Ação - MELHORADOS */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button onClick={() => setIsCreateDialogOpen(true)} size="sm" className="h-8">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Novo Negócio</span>
              <span className="sm:hidden text-xs">Novo</span>
            </Button>
            <Button variant="outline" onClick={() => setIsManageDialogOpen(true)} size="sm" className="h-8">
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden md:inline text-xs">Funis/Etapas</span>
              <span className="md:hidden text-xs">Funis</span>
            </Button>
            <Button variant="outline" onClick={handleRefresh} size="icon" className="h-8 w-8">
              <RefreshCcw className="h-3.5 w-3.5" />
              <span className="sr-only">Atualizar</span>
            </Button>
            <Button variant="outline" onClick={handleExport} size="icon" className="h-8 w-8">
              <Download className="h-3.5 w-3.5" />
              <span className="sr-only">Exportar</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
            <CRMFilters 
              pipelines={pipelines} 
              selectedPipeline={selectedPipeline} 
              onPipelineChange={setSelectedPipeline} 
              owners={owners} 
              selectedOwner={selectedOwner} 
              onOwnerChange={setSelectedOwner} 
              searchQuery={searchQuery} 
              onSearchChange={setSearchQuery} 
              selectedStatus={selectedStatus} 
              onStatusChange={setSelectedStatus}
              dateFilter={dateFilter}
              onDateFilterChange={setDateFilter}
              customDateRange={customDateRange}
              onCustomDateRangeChange={setCustomDateRange}
            />

        {isLoadingPipelines ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Carregando funis de vendas...</p>
            </div>
          </div>
        ) : selectedPipeline ? (
          <>
            {/* Tabs de Categorias - Responsivas */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button 
                variant={!showPlanned && selectedCategory === "all" ? "default" : "outline"} 
                size="sm" 
                className="h-7 text-xs" 
                onClick={() => {
                  setShowPlanned(false);
                  setSelectedCategory("all");
                }}
              >
                Todas as Categorias
              </Button>
              
              {categories.map(category => (
                <Button 
                  key={category} 
                  variant={!showPlanned && selectedCategory === category ? "default" : "outline"} 
                  size="sm" 
                  className="h-7 text-xs" 
                  onClick={() => {
                    setShowPlanned(false);
                    setSelectedCategory(category);
                  }}
                >
                  {category}
                </Button>
              ))}
            </div>

            {/* KPIs do CRM */}
            <CRMKPIs 
              pipelineId={selectedPipeline} 
              categoryFilter={selectedCategory}
              ownerFilter={selectedOwner}
              dateFilter={dateFilter}
              customDateRange={customDateRange}
              key={`kpi-${refreshKey}`} 
            />

            {/* SLA Alerts */}
            <CRMSLAAlerts 
              pipelineId={selectedPipeline} 
              categoryFilter={selectedCategory}
              ownerFilter={selectedOwner}
              key={`sla-${refreshKey}`} 
            />

            {/* Tarefas Pendentes */}
            <CRMTasksPanel 
              pipelineId={selectedPipeline} 
              categoryFilter={selectedCategory}
              ownerFilter={selectedOwner}
              searchQuery={searchQuery}
              dateFilter={dateFilter}
              customDateRange={customDateRange}
              key={`tasks-${refreshKey}`} 
            />

            {/* Alerta de Tarefas Faltantes */}
            <TaskReminderAlert pipelineId={selectedPipeline} />

            {/* Kanban Board - Scroll contido apenas internamente */}
            <div className="relative">
              <CRMBoard
                pipelineId={selectedPipeline} 
                key={`board-${refreshKey}`} 
                onRefresh={handleRefresh}
                autoOpenDealId={autoOpenDealId}
                onDealOpened={() => setAutoOpenDealId(null)}
                filters={{
                  owner: selectedOwner,
                  search: searchQuery,
                  status: selectedStatus,
                  category: selectedCategory,
                  showPlanned: showPlanned
                  // Filtros de data removidos - afetam apenas KPIs
                }}
              />
            </div>
          </>
        ) : (
          !isLoadingPipelines && pipelines.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">Nenhum funil cadastrado. Crie seu primeiro funil de vendas!</p>
            </div>
          )
        )}

        {/* Dialogs */}
        <CreateDealDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} pipelineId={selectedPipeline} onSuccess={handleRefresh} />

        <ManagePipelineDialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen} selectedPipeline={selectedPipeline} onSuccess={handleRefresh} />
      </div>
    </DashboardLayout>;
}