import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Award, Target } from "lucide-react";

interface ArchitectMetrics {
  architect_id: string;
  architect_name: string;
  categoria: string;
  total_projects: number;
  approved_projects: number;
  lost_projects: number;
  in_progress_projects: number;
  total_value: number;
  approval_rate: number;
}

export function ArchitectPerformance() {
  const [metrics, setMetrics] = useState<ArchitectMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    fetchMetrics();
  }, [period]);

  const fetchMetrics = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('architect_performance_metrics', {
      period_days: period
    });

    if (!error && data) {
      setMetrics(data as ArchitectMetrics[]);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando métricas...</div>;
  }

  const topPerformer = metrics[0];
  const totalProjects = metrics.reduce((sum, m) => sum + m.total_projects, 0);
  const totalValue = metrics.reduce((sum, m) => sum + m.total_value, 0);
  const avgApprovalRate = metrics.length > 0 
    ? metrics.reduce((sum, m) => sum + m.approval_rate, 0) / metrics.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Resumo Geral */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 space-y-2 border-l-4 border-l-primary">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Total de Projetos</span>
          </div>
          <p className="text-3xl font-bold">{totalProjects}</p>
          <p className="text-xs text-muted-foreground">Últimos {period} dias</p>
        </Card>

        <Card className="p-6 space-y-2 border-l-4 border-l-green-500">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-muted-foreground">Valor Total Aprovado</span>
          </div>
          <p className="text-3xl font-bold text-green-600">
            R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground">Últimos {period} dias</p>
        </Card>

        <Card className="p-6 space-y-2 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-muted-foreground">Taxa Média de Aprovação</span>
          </div>
          <p className="text-3xl font-bold text-blue-600">
            {avgApprovalRate.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">Média de todos os profissionais parceiros</p>
        </Card>
      </div>

      {/* Melhor Desempenho */}
      {topPerformer && (
        <Card className="p-6 bg-gradient-to-r from-primary/5 to-accent/5 border-l-4 border-l-primary">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-bold">🏆 Melhor Desempenho</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Profissional Parceiro</p>
              <p className="text-lg font-bold">{topPerformer.architect_name}</p>
              <Badge variant={topPerformer.categoria === 'metropolitano' ? 'default' : 'secondary'}>
                {topPerformer.categoria}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Projetos Enviados</p>
              <p className="text-2xl font-bold text-primary">{topPerformer.total_projects}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Taxa de Aprovação</p>
              <p className="text-2xl font-bold text-green-600">{topPerformer.approval_rate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <p className="text-2xl font-bold text-green-700">
                R$ {topPerformer.total_value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Filtro de Período */}
      <div className="flex gap-2">
        <button
          onClick={() => setPeriod(30)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            period === 30 ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Últimos 30 dias
        </button>
        <button
          onClick={() => setPeriod(60)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            period === 60 ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Últimos 60 dias
        </button>
        <button
          onClick={() => setPeriod(90)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            period === 90 ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Últimos 90 dias
        </button>
      </div>

      {/* Tabela Detalhada */}
      <Card>
        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold">Ranking por Desempenho</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Ordenado por valor total aprovado
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Profissional Parceiro</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-center">Projetos Enviados</TableHead>
              <TableHead className="text-center">Aprovados</TableHead>
              <TableHead className="text-center">Perdidos</TableHead>
              <TableHead className="text-center">Em Andamento</TableHead>
              <TableHead className="text-center">Taxa Aprovação</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.map((metric, index) => (
              <TableRow key={metric.architect_id} className="hover:bg-muted/50">
                <TableCell className="font-bold">
                  {index === 0 && '🥇'}
                  {index === 1 && '🥈'}
                  {index === 2 && '🥉'}
                  {index > 2 && index + 1}
                </TableCell>
                <TableCell className="font-medium">{metric.architect_name}</TableCell>
                <TableCell>
                  <Badge variant={metric.categoria === 'metropolitano' ? 'default' : 'secondary'}>
                    {metric.categoria}
                  </Badge>
                </TableCell>
                <TableCell className="text-center font-bold">{metric.total_projects}</TableCell>
                <TableCell className="text-center">
                  <span className="text-green-600 font-semibold">{metric.approved_projects}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-red-600 font-semibold">{metric.lost_projects}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-blue-600 font-semibold">{metric.in_progress_projects}</span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={metric.approval_rate >= 60 ? 'default' : 'secondary'}>
                    {metric.approval_rate.toFixed(1)}%
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-bold text-green-700">
                  R$ {metric.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}