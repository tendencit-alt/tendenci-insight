import { useEffect, useState } from "react";
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
  Wifi,
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

const COLORS = {
  primary: "hsl(357 75% 48%)",
  success: "hsl(142 71% 45%)",
  warning: "hsl(38 92% 50%)",
  info: "hsl(221 83% 53%)",
  muted: "hsl(240 8% 20%)"
};

const Index = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para os dados
  const [crmMetrics, setCrmMetrics] = useState<any>(null);
  const [metaMessageCost, setMetaMessageCost] = useState<any>(null);
  const [metaAdSpend, setMetaAdSpend] = useState<any>(null);
  const [leadOrigins, setLeadOrigins] = useState<any[]>([]);
  const [projectsByStage, setProjectsByStage] = useState<any[]>([]);
  const [architectsWithoutProjects, setArchitectsWithoutProjects] = useState<any[]>([]);
  const [architectResponseTime, setArchitectResponseTime] = useState<any>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    
    try {
      // 1. Métricas do CRM
      const { data: crmData, error: crmError } = await supabase.rpc('dashboard_crm_metrics');
      if (!crmError && crmData) {
        setCrmMetrics(crmData);
      }

      // 2. Custo de mensagens Meta
      const { data: msgCostData, error: msgError } = await supabase.rpc('dashboard_meta_message_cost');
      if (!msgError && msgCostData) {
        setMetaMessageCost(msgCostData);
      }

      // 3. Gasto com Meta Ads
      const { data: adSpendData, error: adError } = await supabase.rpc('dashboard_meta_ad_spend');
      if (!adError && adSpendData) {
        setMetaAdSpend(adSpendData);
      }

      // 4. Origem dos leads
      const { data: originsData, error: originsError } = await supabase.rpc('dashboard_lead_origins');
      if (!originsError && originsData) {
        setLeadOrigins(originsData);
      }

      // 5. Projetos por estágio
      const { data: stagesData, error: stagesError } = await supabase.rpc('dashboard_projects_by_stage');
      if (!stagesError && stagesData) {
        setProjectsByStage(stagesData);
      }

      // 6. Arquitetos sem projeto
      const { data: archData, error: archError } = await supabase.rpc('dashboard_architects_without_projects', {
        days_threshold: 30
      });
      if (!archError && archData) {
        setArchitectsWithoutProjects(archData);
      }

      // 7. Tempo de resposta de arquitetos
      const { data: responseData, error: responseError } = await supabase.rpc('dashboard_architect_response_time');
      if (!responseError && responseData) {
        setArchitectResponseTime(responseData);
      }

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

  // Preparar dados para os gráficos
  const pieChartData = leadOrigins.map((item, index) => ({
    name: item.origin,
    value: Number(item.count),
    color: [COLORS.primary, COLORS.success, COLORS.warning, COLORS.info, COLORS.muted][index % 5]
  }));

  const barChartData = projectsByStage.map(item => ({
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
          <DashboardFilters />
        </div>

        {/* KPI Cards - Primeira linha */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Custo de Mensagem"
            value={
              metaMessageCost?.api_connected 
                ? `R$ ${Number(metaMessageCost.total_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                : "API não conectada"
            }
            subtitle={
              metaMessageCost?.api_connected 
                ? `${metaMessageCost.message_count} mensagens • Últimos 30 dias`
                : "Configure a API Meta"
            }
            icon={metaMessageCost?.api_connected ? MessageSquare : WifiOff}
            variant={metaMessageCost?.api_connected ? "default" : "destructive"}
          />
          <StatCard
            title="Valor Gasto (Meta)"
            value={
              metaAdSpend?.api_connected 
                ? `R$ ${Number(metaAdSpend.total_spend || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                : "API não conectada"
            }
            subtitle={
              metaAdSpend?.api_connected 
                ? `CPL: R$ ${Number(metaAdSpend.cpl || 0).toFixed(2)} • ${metaAdSpend.total_leads} leads`
                : "Configure a API Meta"
            }
            icon={metaAdSpend?.api_connected ? DollarSign : WifiOff}
            variant={metaAdSpend?.api_connected ? "warning" : "destructive"}
          />
          <StatCard
            title="Em Orçamento"
            value={`${crmMetrics?.em_orcamento || 0}`}
            subtitle="Negócios na fase de orçamento"
            icon={Target}
            variant="default"
          />
          <StatCard
            title="Fechado"
            value={`R$ ${Number(crmMetrics?.valor_fechado || 0).toLocaleString('pt-BR')}`}
            subtitle={`${crmMetrics?.fechado || 0} negócios ganhos`}
            icon={TrendingUp}
            variant="success"
          />
        </div>

        {/* KPI Cards - Segunda linha */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Perdido"
            value={`R$ ${Number(crmMetrics?.valor_perdido || 0).toLocaleString('pt-BR')}`}
            subtitle={`${crmMetrics?.perdido || 0} negócios perdidos`}
            icon={TrendingDown}
            variant="destructive"
          />
          <StatCard
            title="Total de Leads"
            value={`${crmMetrics?.total_leads || 0}`}
            subtitle="Total de negócios no CRM"
            icon={Users}
            variant="default"
          />
          <StatCard
            title="Projetos Ativos"
            value={`${crmMetrics?.projetos_ativos || 0}`}
            subtitle="Negócios em andamento"
            icon={Package}
            variant="success"
          />
          <StatCard
            title="Tempo Médio"
            value={`${architectResponseTime?.avg_days || 0} dias`}
            subtitle="Resposta de arquitetos"
            icon={Clock}
            variant="warning"
          />
        </div>

        {/* Charts - Análises e Tendências */}
        <div>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <div className="h-1 w-12 bg-gradient-to-r from-primary to-primary-light rounded-full" />
            Análises e Tendências
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
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

        {/* Gasto vs Leads - Full Width */}
        <Card className="shadow-card border-t-4 border-t-primary hover:shadow-hover transition-all duration-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Gasto Meta Ads vs Leads Gerados
              </CardTitle>
              {!metaAdSpend?.api_connected && (
                <Badge variant="destructive" className="flex items-center gap-2">
                  <WifiOff className="h-3 w-3" />
                  API Meta não conectada
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
                    Configure a integração com Meta Ads para visualizar métricas de campanha
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
