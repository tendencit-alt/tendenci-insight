import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PerformanceChartsProps {
  evolucaoDiaria: Array<{ dia: string; valor_acumulado: number }>;
  origemLeads: Array<{ origem: string; quantidade: number; total_vendido: number }>;
  produtosVendidos: Array<{ categoria: string; quantidade: number; total_vendido: number }>;
  arquitetosVendas: Array<{ arquiteto: string; quantidade: number; total_vendido: number }>;
  goalInfo: {
    valor_meta: number;
    data_inicio: string;
    data_fim: string;
  };
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#a4de6c'];

export function PerformanceCharts({ evolucaoDiaria, origemLeads, produtosVendidos, arquitetosVendas, goalInfo }: PerformanceChartsProps) {
  // Preparar dados de evolução com linha de meta
  const evolucaoData = evolucaoDiaria?.map((item, index, arr) => {
    const acumulado = arr.slice(0, index + 1).reduce((sum, curr) => sum + Number(curr.valor_acumulado), 0);
    return {
      dia: format(new Date(item.dia), "dd/MM", { locale: ptBR }),
      vendido: acumulado,
      meta: goalInfo.valor_meta,
    };
  }) || [];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Evolução da Meta</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={evolucaoData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="vendido" stroke="hsl(var(--primary))" strokeWidth={2} name="Valor Vendido" />
              <Line type="monotone" dataKey="meta" stroke="hsl(var(--accent))" strokeDasharray="5 5" strokeWidth={2} name="Meta" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Origem dos Leads Ganhos</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={origemLeads || []}
                dataKey="quantidade"
                nameKey="origem"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.origem}: ${entry.quantidade}`}
              >
                {(origemLeads || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string, props: any) => [
                  `${value} negócios (${formatCurrency(props.payload.total_vendido)})`,
                  props.payload.origem
                ]}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categorias de Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={produtosVendidos || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="categoria" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))'
                }}
              />
              <Legend />
              <Bar dataKey="total_vendido" fill="hsl(var(--primary))" name="Total Vendido" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Parceiros Profissionais que Geraram Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={arquitetosVendas || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
              <YAxis type="category" dataKey="parceiro profissional" width={150} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))'
                }}
              />
              <Legend />
              <Bar dataKey="total_vendido" fill="hsl(var(--secondary))" name="Total Vendido" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
