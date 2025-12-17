import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { format, subDays, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, AlertTriangle, Bug, CheckCircle } from "lucide-react";

interface SystemError {
  id: string;
  title: string;
  module: string;
  severity: string;
  status: string;
  created_at: string;
  occurrence_count?: number;
}

interface ErrorsDashboardProps {
  errors: SystemError[];
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "hsl(var(--chart-1))",
  medium: "hsl(var(--chart-2))",
  high: "hsl(var(--chart-3))",
  critical: "hsl(var(--destructive))"
};

const MODULE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))"
];

export function ErrorsDashboard({ errors }: ErrorsDashboardProps) {
  // Tendência dos últimos 7 dias
  const trendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date: format(date, "dd/MM"),
        dateKey: format(date, "yyyy-MM-dd"),
        total: 0,
        critical: 0,
        resolved: 0
      };
    });

    errors.forEach(error => {
      const errorDate = format(parseISO(error.created_at), "yyyy-MM-dd");
      const dayData = last7Days.find(d => d.dateKey === errorDate);
      if (dayData) {
        dayData.total += error.occurrence_count || 1;
        if (error.severity === "critical") dayData.critical++;
        if (error.status === "resolved") dayData.resolved++;
      }
    });

    return last7Days;
  }, [errors]);

  // Distribuição por módulo
  const moduleData = useMemo(() => {
    const counts: Record<string, number> = {};
    errors.forEach(error => {
      counts[error.module] = (counts[error.module] || 0) + (error.occurrence_count || 1);
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [errors]);

  // Distribuição por severidade
  const severityData = useMemo(() => {
    const counts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    errors.forEach(error => {
      if (counts[error.severity] !== undefined) {
        counts[error.severity] += error.occurrence_count || 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name === "low" ? "Baixa" : name === "medium" ? "Média" : name === "high" ? "Alta" : "Crítica",
      value,
      key: name
    }));
  }, [errors]);

  // Comparativo semanal
  const weekComparison = useMemo(() => {
    const now = new Date();
    const thisWeekStart = startOfDay(subDays(now, 6));
    const lastWeekStart = startOfDay(subDays(now, 13));
    const lastWeekEnd = startOfDay(subDays(now, 7));

    let thisWeek = 0;
    let lastWeek = 0;

    errors.forEach(error => {
      const errorDate = parseISO(error.created_at);
      const count = error.occurrence_count || 1;
      if (errorDate >= thisWeekStart) {
        thisWeek += count;
      } else if (errorDate >= lastWeekStart && errorDate < lastWeekEnd) {
        lastWeek += count;
      }
    });

    const percentChange = lastWeek === 0 
      ? (thisWeek > 0 ? 100 : 0) 
      : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);

    return { thisWeek, lastWeek, percentChange };
  }, [errors]);

  const openErrors = errors.filter(e => e.status === "open").length;
  const resolvedToday = errors.filter(e => 
    e.status === "resolved" && 
    format(parseISO(e.created_at), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  ).length;

  return (
    <div className="space-y-4">
      {/* Métricas Comparativas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Esta Semana</p>
                <p className="text-2xl font-bold">{weekComparison.thisWeek}</p>
                <p className="text-xs text-muted-foreground">vs {weekComparison.lastWeek} semana passada</p>
              </div>
              <div className={`flex items-center gap-1 ${weekComparison.percentChange <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {weekComparison.percentChange <= 0 ? (
                  <TrendingDown className="h-5 w-5" />
                ) : (
                  <TrendingUp className="h-5 w-5" />
                )}
                <span className="text-sm font-medium">{Math.abs(weekComparison.percentChange)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Bug className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Abertos Agora</p>
                <p className="text-2xl font-bold">{openErrors}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resolvidos Hoje</p>
                <p className="text-2xl font-bold">{resolvedToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tendência 7 dias */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tendência - Últimos 7 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="hsl(var(--chart-1))" 
                    fill="hsl(var(--chart-1))" 
                    fillOpacity={0.3}
                    name="Total"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="critical" 
                    stroke="hsl(var(--destructive))" 
                    fill="hsl(var(--destructive))" 
                    fillOpacity={0.3}
                    name="Críticos"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Por Severidade */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Por Severidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={60} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="value" name="Erros">
                    {severityData.map((entry) => (
                      <Cell key={entry.key} fill={SEVERITY_COLORS[entry.key]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Por Módulo */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top 5 Módulos com Mais Erros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={moduleData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  >
                    {moduleData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={MODULE_COLORS[index % MODULE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
