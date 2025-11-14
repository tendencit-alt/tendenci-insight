import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Users, Briefcase, CheckCircle, DollarSign, Gift, Building, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ArchitectMetrics {
  active_count: number;
  projects_count: number;
  approved_count: number;
  approved_sum: number;
  birthdays_30d: number;
}

interface CategoryMetrics {
  metropolitano_count: number;
  captado_count: number;
  metropolitano_projects: number;
  captado_projects: number;
}

interface ArchitectKPIsProps {
  refreshKey: number;
}

export function ArchitectKPIs({ refreshKey }: ArchitectKPIsProps) {
  const [metrics, setMetrics] = useState<ArchitectMetrics>({
    active_count: 0,
    projects_count: 0,
    approved_count: 0,
    approved_sum: 0,
    birthdays_30d: 0
  });

  const [categoryMetrics, setCategoryMetrics] = useState<CategoryMetrics>({
    metropolitano_count: 0,
    captado_count: 0,
    metropolitano_projects: 0,
    captado_projects: 0
  });

  useEffect(() => {
    fetchMetrics();
    fetchCategoryMetrics();
  }, [refreshKey]);

  const fetchMetrics = async () => {
    const { data, error } = await supabase.rpc('architects_aggregates');
    if (!error && data) {
      const metrics = data as any;
      setMetrics({
        active_count: metrics.active_count || 0,
        projects_count: metrics.projects_count || 0,
        approved_count: metrics.approved_count || 0,
        approved_sum: metrics.approved_sum || 0,
        birthdays_30d: metrics.birthdays_30d || 0
      });
    }
  };

  const fetchCategoryMetrics = async () => {
    // Buscar contagem de arquitetos por categoria
    const { data: architects } = await supabase
      .from('architects')
      .select('id, categoria');

    const metropolitanoCount = architects?.filter(a => a.categoria === 'metropolitano').length || 0;
    const captadoCount = architects?.filter(a => a.categoria === 'captado').length || 0;

    // Buscar projetos por categoria de arquiteto
    const { data: projects } = await supabase
      .from('projects')
      .select('architect_id, architects(categoria)')
      .not('architect_id', 'is', null);

    const metropolitanoProjects = projects?.filter(
      p => p.architects?.categoria === 'metropolitano'
    ).length || 0;

    const captadoProjects = projects?.filter(
      p => p.architects?.categoria === 'captado'
    ).length || 0;

    setCategoryMetrics({
      metropolitano_count: metropolitanoCount,
      captado_count: captadoCount,
      metropolitano_projects: metropolitanoProjects,
      captado_projects: captadoProjects
    });
  };

  return (
    <div className="space-y-6">
      {/* KPIs Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Arquitetos Ativos</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{metrics.active_count}</p>
        </Card>

        <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Projetos no Período</span>
            <Briefcase className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">{metrics.projects_count}</p>
        </Card>

        <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Aprovados (Qtd)</span>
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-emerald-600">{metrics.approved_count}</p>
        </Card>

        <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-yellow-500">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Valor Aprovado</span>
            <DollarSign className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">
            R$ {Number(metrics.approved_sum).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </Card>

        <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-pink-500">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Aniversários (30d)</span>
            <Gift className="w-5 h-5 text-pink-600" />
          </div>
          <p className="text-3xl font-bold text-pink-600">{metrics.birthdays_30d}</p>
        </Card>
      </div>

      {/* KPIs por Categoria */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-muted-foreground">📊 Performance por Categoria</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Metropolitano</span>
              <Building className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-600">{categoryMetrics.metropolitano_count}</p>
            <p className="text-xs text-muted-foreground">arquitetos cadastrados</p>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-indigo-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Captado</span>
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-3xl font-bold text-indigo-600">{categoryMetrics.captado_count}</p>
            <p className="text-xs text-muted-foreground">arquitetos cadastrados</p>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-violet-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Projetos Metropolitano</span>
              <Briefcase className="w-5 h-5 text-violet-600" />
            </div>
            <p className="text-3xl font-bold text-violet-600">{categoryMetrics.metropolitano_projects}</p>
            <p className="text-xs text-muted-foreground">
              {categoryMetrics.metropolitano_count > 0 
                ? `${(categoryMetrics.metropolitano_projects / categoryMetrics.metropolitano_count).toFixed(1)} por arquiteto`
                : '0 por arquiteto'}
            </p>
          </Card>

          <Card className="p-6 space-y-2 hover:shadow-xl transition-all duration-300 border-l-4 border-l-fuchsia-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Projetos Captado</span>
              <Briefcase className="w-5 h-5 text-fuchsia-600" />
            </div>
            <p className="text-3xl font-bold text-fuchsia-600">{categoryMetrics.captado_projects}</p>
            <p className="text-xs text-muted-foreground">
              {categoryMetrics.captado_count > 0 
                ? `${(categoryMetrics.captado_projects / categoryMetrics.captado_count).toFixed(1)} por arquiteto`
                : '0 por arquiteto'}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
