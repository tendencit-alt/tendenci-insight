import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  MessageSquare, 
  TrendingUp, 
  TrendingDown,
  Target,
  Users,
  Package,
  Clock,
  AlertTriangle,
  RefreshCcw,
  WifiOff
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { PeriodComparison } from "@/components/ui/PeriodComparison";
import { ComparisonKPICard, formatCurrency, formatNumber, PeriodValue } from "@/components/ui/ComparisonKPICard";
import { usePeriodComparison, PeriodSelection, PERIOD_PRESETS } from "@/hooks/usePeriodComparison";
import { format } from "date-fns";

const COLORS = {
  primary: "hsl(357 75% 48%)",
  success: "hsl(142 71% 45%)",
  warning: "hsl(38 92% 50%)",
  info: "hsl(221 83% 53%)",
  muted: "hsl(240 8% 20%)"
};

interface PeriodData {
  period: PeriodSelection;
  crmMetrics: any;
  leadOrigins: any[];
  projectsByStage: any[];
}

const Index = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Period comparison state
  const {
    selectedPeriods,
    addPeriod,
    removePeriod,
    clearPeriods,
    canAddMore,
    maxPeriods,
    formatPeriodDates
  } = usePeriodComparison(5);

  // Data states with period support
  const [periodsData, setPeriodsData] = useState<PeriodData[]>([]);
  const [metaMessageCost, setMetaMessageCost] = useState<any>(null);
  const [metaAdSpend, setMetaAdSpend] = useState<any>(null);
  const [metaInitiatedMessages, setMetaInitiatedMessages] = useState<any>(null);
  const [architectsWithoutProjects, setArchitectsWithoutProjects] = useState<any[]>([]);
  const [architectResponseTime, setArchitectResponseTime] = useState<any>(null);

  // Initialize with "this month" as default period
  useEffect(() => {
    if (selectedPeriods.length === 0) {
      addPeriod('thisMonth');
    }
  }, []);

  useEffect(() => {
    if (selectedPeriods.length > 0) {
      fetchAllData();
    }
  }, [selectedPeriods]);

  const fetchAllData = async () => {
    setLoading(true);
    
    try {
      // Fetch data for each selected period in parallel
      const periodPromises = selectedPeriods.map(async (period) => {
        const { from, to } = formatPeriodDates(period);
        
        // CRM Metrics with date filter
        const { data: crmData } = await supabase.rpc('dashboard_crm_metrics_filtered', {
          p_date_from: from,
          p_date_to: to
        }).catch(() => ({ data: null }));

        // Lead origins with date filter
        const { data: originsData } = await supabase.rpc('dashboard_lead_origins_filtered', {
          p_date_from: from,
          p_date_to: to
        }).catch(() => ({ data: [] }));

        // Projects by stage with date filter
        const { data: stagesData } = await supabase.rpc('dashboard_projects_by_stage_filtered', {
          p_date_from: from,
          p_date_to: to
        }).catch(() => ({ data: [] }));

        return {
          period,
          crmMetrics: crmData || {},
          leadOrigins: originsData || [],
          projectsByStage: stagesData || []
        };
      });

      const allPeriodsData = await Promise.all(periodPromises);
      setPeriodsData(allPeriodsData);

      // Non-period-filtered data (static)
      const { data: msgCostData } = await supabase.rpc('dashboard_meta_message_cost');
      if (msgCostData) setMetaMessageCost(msgCostData);

      const { data: adSpendData } = await supabase.rpc('dashboard_meta_ad_spend');
      if (adSpendData) setMetaAdSpend(adSpendData);

      const { count: aiLeadsCount } = await supabase
        .from('crm_deals')
        .select('*', { count: 'exact', head: true })
        .eq('from_ai', true);
      
      setMetaInitiatedMessages({ count: aiLeadsCount || 0, api_connected: true });

      const { data: archData } = await supabase.rpc('dashboard_architects_without_projects', {
        days_threshold: 30
      });
      if (archData) setArchitectsWithoutProjects(archData);

      const { data: responseData } = await supabase.rpc('dashboard_architect_response_time');
      if (responseData) setArchitectResponseTime(responseData);

    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllData();
    toast({
      title: "Dashboard atualizado",
      description: "Todos os dados foram recarregados com sucesso.",
    });
  };

  // Helper to create period values for comparison cards
  const createPeriodValues = (getValue: (data: PeriodData) => number, formatter: (v: number) => string): PeriodValue[] => {
    return periodsData.map(pd => ({
      periodId: pd.period.id,
      periodLabel: pd.period.label,
      periodColor: pd.period.color,
      value: getValue(pd),
      formattedValue: formatter(getValue(pd))
    }));
  };

  // Get primary period data for charts
  const primaryData = periodsData[0];
  const leadOrigins = primaryData?.leadOrigins || [];
  const projectsByStage = primaryData?.projectsByStage || [];

  // Preparar dados para os gráficos
  const pieChartData = leadOrigins.map((item: any, index: number) => ({
    name: item.origin,
    value: Number(item.count),
    color: [COLORS.primary, COLORS.success, COLORS.warning, COLORS.info, COLORS.muted][index % 5]
  }));

  const barChartData = projectsByStage.map((item: any) => ({
    stage: item.stage.charAt(0).toUpperCase() + item.stage.slice(1),
    quantidade: Number(item.count),
    valor: Number(item.value)
  }));

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header com Título e Filtros */}
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Dashboard Executivo Premium
              </h1>
              <p className="text-lg text-muted-foreground">
                Monitoramento em tempo real de KPIs estratégicos de performance comercial e marketing
              </p>
            </div>
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
              <RefreshCcw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <PeriodComparison
              selectedPeriods={selectedPeriods}
              onAddPeriod={addPeriod}
              onRemovePeriod={removePeriod}
              onClear={clearPeriods}
              canAddMore={canAddMore}
              maxPeriods={maxPeriods}
            />
          </div>
        </div>

        {/* Métricas CRM - Sistema com Comparativo */}
        <div>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <div className="h-1 w-12 bg-gradient-to-r from-primary to-primary/50 rounded-full" />
            Métricas do Sistema CRM
            {selectedPeriods.length > 1 && (
              <Badge variant="outline" className="text-xs font-normal">
                Comparando {selectedPeriods.length} períodos
              </Badge>
            )}
          </h2>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <ComparisonKPICard
              title="Em Orçamento"
              icon={Target}
              periodValues={createPeriodValues(
                (pd) => pd.crmMetrics?.em_orcamento || 0,
                (v) => String(v)
              )}
              loading={loading}
            />
            <ComparisonKPICard
              title="Valor Fechado"
              icon={TrendingUp}
              periodValues={createPeriodValues(
                (pd) => pd.crmMetrics?.valor_fechado || 0,
                (v) => formatCurrency(v)
              )}
              loading={loading}
            />
            <ComparisonKPICard
              title="Total de Leads"
              icon={Users}
              periodValues={createPeriodValues(
                (pd) => pd.crmMetrics?.total_leads || 0,
                (v) => String(v)
              )}
              loading={loading}
            />
            <ComparisonKPICard
              title="Projetos Ativos"
              icon={Package}
              periodValues={createPeriodValues(
                (pd) => pd.crmMetrics?.projetos_ativos || 0,
                (v) => String(v)
              )}
              loading={loading}
            />
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <ComparisonKPICard
            title="Valor Perdido"
            icon={TrendingDown}
            periodValues={createPeriodValues(
              (pd) => pd.crmMetrics?.valor_perdido || 0,
              (v) => formatCurrency(v)
            )}
            loading={loading}
            invertVariation
          />
          <ComparisonKPICard
            title="Negócios Ganhos"
            icon={TrendingUp}
            periodValues={createPeriodValues(
              (pd) => pd.crmMetrics?.fechado || 0,
              (v) => String(v)
            )}
            loading={loading}
          />
          <ComparisonKPICard
            title="Negócios Perdidos"
            icon={TrendingDown}
            periodValues={createPeriodValues(
              (pd) => pd.crmMetrics?.perdido || 0,
              (v) => String(v)
            )}
            loading={loading}
            invertVariation
          />
        </div>

        {/* Seção Meta Ads - Dados via API */}
        <div className="border-t-2 border-border/50 pt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="h-1 w-12 bg-gradient-to-r from-warning to-warning/50 rounded-full" />
              Dados Meta Ads
              <span className="text-sm font-normal text-muted-foreground">(via API)</span>
            </h2>
            {(!metaAdSpend?.api_connected || !metaMessageCost?.api_connected) && (
              <Badge variant="destructive" className="flex items-center gap-2">
                <WifiOff className="h-3 w-3" />
                API não conectada
              </Badge>
            )}
          </div>

          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Custo de Mensagem"
              value={
                metaMessageCost?.api_connected 
                  ? `R$ ${Number(metaMessageCost.total_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  : "Aguardando API"
              }
              subtitle={
                metaMessageCost?.api_connected 
                  ? `${metaMessageCost.message_count} mensagens • Últimos 30 dias`
                  : "Configure a integração Meta"
              }
              icon={metaMessageCost?.api_connected ? MessageSquare : WifiOff}
              variant={metaMessageCost?.api_connected ? "default" : "destructive"}
            />
            <StatCard
              title="Valor Gasto (Meta Ads)"
              value={
                metaAdSpend?.api_connected 
                  ? `R$ ${Number(metaAdSpend.total_spend || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  : "Aguardando API"
              }
              subtitle={
                metaAdSpend?.api_connected 
                  ? `CPL: R$ ${Number(metaAdSpend.cpl || 0).toFixed(2)} • ${metaAdSpend.total_leads} leads`
                  : "Configure a integração Meta"
              }
              icon={metaAdSpend?.api_connected ? DollarSign : WifiOff}
              variant={metaAdSpend?.api_connected ? "warning" : "destructive"}
            />
            <StatCard
              title="Mensagens Iniciadas"
              value={`${metaInitiatedMessages?.count || 0}`}
              subtitle="Leads com tag de IA (CRM Clientes)"
              icon={MessageSquare}
              variant="default"
            />
          </div>

          {/* Gasto vs Leads - Full Width dentro da seção Meta */}
          <Card className="shadow-card border-t-4 border-t-warning hover:shadow-hover transition-all duration-300 mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />
                  Gasto Meta Ads vs Leads Gerados
                </CardTitle>
                {!metaAdSpend?.api_connected && (
                  <Badge variant="destructive" className="flex items-center gap-2">
                    <WifiOff className="h-3 w-3" />
                    API não conectada
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[380px] flex items-center justify-center">
                <div className="text-center space-y-4">
                  <WifiOff className="h-16 w-16 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-lg font-semibold">API Meta Ads não configurada</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Configure a integração com Meta Ads para visualizar métricas de campanha em tempo real
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts - Análises e Tendências */}
        <div>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <div className="h-1 w-12 bg-gradient-to-r from-primary to-primary-light rounded-full" />
            Análises e Tendências
          </h2>
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Origem dos Leads */}
            <Card className="shadow-card border-t-4 border-t-primary hover:shadow-hover transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  Origem dos Leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={110}
                        fill="#8884d8"
                        dataKey="value"
                        strokeWidth={2}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[320px] flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Projetos por Estágio */}
            <Card className="shadow-card border-t-4 border-t-primary hover:shadow-hover transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  Projetos por Estágio
                </CardTitle>
              </CardHeader>
              <CardContent>
                {barChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="stage" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === "valor") return `R$ ${Number(value).toLocaleString('pt-BR')}`;
                          return value;
                        }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="quantidade" fill={COLORS.primary} name="Quantidade" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="valor" fill={COLORS.success} name="Valor (R$)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[320px] flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>


        {/* Alertas de Arquitetos - Widget Premium */}
        <Card className="glass-card shadow-hover border-l-4 border-l-warning hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-3">
              <div className="bg-warning/10 p-3 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
              🚨 Arquitetos sem Envio de Projeto (30+ dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {architectsWithoutProjects.length > 0 ? (
              <div className="space-y-4">
                {architectsWithoutProjects.map((arch) => (
                  <div 
                    key={arch.id}
                    className="flex items-center justify-between p-5 bg-card/50 rounded-2xl border border-warning/30 hover:border-warning/50 transition-all duration-300 hover:shadow-md group"
                  >
                    <div className="flex-1">
                      <p className="font-bold text-lg group-hover:text-primary transition-colors">{arch.name}</p>
                      <p className="text-sm text-muted-foreground mt-1 font-medium">
                        {arch.last_project_at 
                          ? `Último projeto: há ${arch.days_since_last} dias`
                          : 'Nenhum projeto enviado'
                        }
                      </p>
                      {arch.phone && (
                        <p className="text-xs text-muted-foreground mt-1">
                          📱 {arch.phone}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="bg-warning/15 text-warning border-warning/40 px-5 py-2.5 text-base font-bold rounded-xl shadow-sm">
                      {arch.days_since_last === 999 ? 'Nunca' : `${arch.days_since_last} dias`}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>✅ Todos os arquitetos estão ativos!</p>
                <p className="text-sm mt-2">Nenhum arquiteto com mais de 30 dias sem enviar projetos</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Index;
