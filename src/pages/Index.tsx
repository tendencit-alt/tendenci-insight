import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  MessageSquare, 
  TrendingUp, 
  TrendingDown,
  Target,
  Users,
  Package,
  Clock,
  AlertTriangle
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

const mockLeadSourceData = [
  { name: "Meta Ads", value: 45, color: "hsl(357 75% 48%)" },
  { name: "Orgânico", value: 30, color: "hsl(142 71% 45%)" },
  { name: "Indicação", value: 15, color: "hsl(38 92% 50%)" },
  { name: "Instagram", value: 10, color: "hsl(240 8% 20%)" },
];

const mockProjectStageData = [
  { stage: "Captado", quantidade: 12, valor: 45000 },
  { stage: "Orçado", quantidade: 8, valor: 32000 },
  { stage: "Apresentado", quantidade: 5, valor: 28000 },
  { stage: "Aprovado", quantidade: 3, valor: 15000 },
];

const mockSpendData = [
  { day: "01/11", gasto: 850, leads: 12 },
  { day: "08/11", gasto: 920, leads: 15 },
  { day: "15/11", gasto: 780, leads: 10 },
  { day: "22/11", gasto: 1100, leads: 18 },
  { day: "29/11", gasto: 950, leads: 14 },
];

const Index = () => {
  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header com Título e Filtros */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Dashboard Executivo Premium
            </h1>
            <p className="text-lg text-muted-foreground">
              Monitoramento em tempo real de KPIs estratégicos de performance comercial e marketing
            </p>
          </div>
          <DashboardFilters />

        </div>

        {/* KPI Cards - Grid Responsivo */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Custo de Mensagem"
            value="R$ 1.247"
            subtitle="Últimos 30 dias"
            icon={MessageSquare}
            variant="default"
            trend={{ value: "12%", isPositive: false }}
          />
          <StatCard
            title="Valor Gasto (Meta)"
            value="R$ 8.350"
            subtitle="Investimento em anúncios"
            icon={DollarSign}
            variant="warning"
            trend={{ value: "8%", isPositive: true }}
          />
          <StatCard
            title="Em Orçamento"
            value="R$ 124.500"
            subtitle="32 negócios abertos"
            icon={Target}
            variant="default"
          />
          <StatCard
            title="Fechado"
            value="R$ 89.200"
            subtitle="15 negócios ganhos"
            icon={TrendingUp}
            variant="success"
            trend={{ value: "23%", isPositive: true }}
          />
        </div>

        {/* KPI Cards - Segunda linha */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Perdido"
            value="R$ 45.800"
            subtitle="8 negócios perdidos"
            icon={TrendingDown}
            variant="destructive"
          />
          <StatCard
            title="Total de Leads"
            value="127"
            subtitle="Este mês"
            icon={Users}
            variant="default"
            trend={{ value: "18%", isPositive: true }}
          />
          <StatCard
            title="Projetos Ativos"
            value="23"
            subtitle="Em andamento"
            icon={Package}
            variant="success"
          />
          <StatCard
            title="Tempo Médio"
            value="5.2 dias"
            subtitle="Resposta arquiteto"
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
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={mockLeadSourceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={110}
                    fill="#8884d8"
                    dataKey="value"
                    strokeWidth={2}
                  >
                    {mockLeadSourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={mockProjectStageData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === "valor") return `R$ ${value.toLocaleString()}`;
                      return value;
                    }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="quantidade" fill="hsl(357 75% 48%)" name="Quantidade" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="valor" fill="hsl(142 71% 45%)" name="Valor (R$)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          </div>
        </div>

        {/* Gasto vs Leads - Full Width */}
        <Card className="shadow-card border-t-4 border-t-primary hover:shadow-hover transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Gasto Meta Ads vs Leads Gerados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={mockSpendData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="day" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="gasto" 
                  stroke="hsl(38 92% 50%)" 
                  strokeWidth={3}
                  name="Gasto (R$)"
                  dot={{ fill: 'hsl(38 92% 50%)', r: 5 }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="leads" 
                  stroke="hsl(142 71% 45%)" 
                  strokeWidth={3}
                  name="Leads"
                  dot={{ fill: 'hsl(142 71% 45%)', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Alertas de Arquitetos - Widget Premium */}
        <Card className="glass-card shadow-hover border-l-4 border-l-warning hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-3">
              <div className="bg-warning/10 p-3 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
              🚨 Arquitetos sem Envio de Projeto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 bg-card/50 rounded-2xl border border-warning/30 hover:border-warning/50 transition-all duration-300 hover:shadow-md group">
                <div className="flex-1">
                  <p className="font-bold text-lg group-hover:text-primary transition-colors">João Silva</p>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">Último projeto: há 12 dias</p>
                </div>
                <Badge variant="outline" className="bg-warning/15 text-warning border-warning/40 px-5 py-2.5 text-base font-bold rounded-xl shadow-sm">
                  12 dias
                </Badge>
              </div>
              <div className="flex items-center justify-between p-5 bg-card/50 rounded-2xl border border-warning/30 hover:border-warning/50 transition-all duration-300 hover:shadow-md group">
                <div className="flex-1">
                  <p className="font-bold text-lg group-hover:text-primary transition-colors">Maria Santos</p>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">Último projeto: há 8 dias</p>
                </div>
                <Badge variant="outline" className="bg-warning/15 text-warning border-warning/40 px-5 py-2.5 text-base font-bold rounded-xl shadow-sm">
                  8 dias
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Index;