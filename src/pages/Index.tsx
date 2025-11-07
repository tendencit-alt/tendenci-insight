import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DollarSign, 
  MessageSquare, 
  TrendingUp, 
  TrendingDown,
  Target,
  Users,
  Package,
  Clock
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
  { name: "Meta Ads", value: 45, color: "hsl(217 91% 60%)" },
  { name: "Orgânico", value: 30, color: "hsl(142 71% 45%)" },
  { name: "Indicação", value: 15, color: "hsl(38 92% 50%)" },
  { name: "Instagram", value: 10, color: "hsl(280 80% 55%)" },
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
      <div className="space-y-6">
        <DashboardHeader />

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

        {/* Segunda linha de KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Origem dos Leads */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Origem dos Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={mockLeadSourceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
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
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Projetos por Estágio</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockProjectStageData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === "valor") return `R$ ${value.toLocaleString()}`;
                      return value;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="quantidade" fill="hsl(217 91% 60%)" name="Quantidade" />
                  <Bar dataKey="valor" fill="hsl(142 71% 45%)" name="Valor (R$)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Gasto vs Leads */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Gasto Meta Ads vs Leads Gerados</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={mockSpendData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="gasto" 
                  stroke="hsl(38 92% 50%)" 
                  strokeWidth={2}
                  name="Gasto (R$)"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="leads" 
                  stroke="hsl(142 71% 45%)" 
                  strokeWidth={2}
                  name="Leads"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Alertas de Arquitetos */}
        <Card className="shadow-card border-l-4 border-l-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Arquitetos sem Envio de Projeto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-warning-light rounded-lg">
                <div>
                  <p className="font-medium">João Silva</p>
                  <p className="text-sm text-muted-foreground">Último projeto: há 12 dias</p>
                </div>
                <span className="text-sm font-medium text-warning">12 dias</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-warning-light rounded-lg">
                <div>
                  <p className="font-medium">Maria Santos</p>
                  <p className="text-sm text-muted-foreground">Último projeto: há 8 dias</p>
                </div>
                <span className="text-sm font-medium text-warning">8 dias</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Index;