import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, Target, Receipt, TrendingUp, TrendingDown, BarChart3, Users, Briefcase } from "lucide-react";

interface PerformanceKPIsProps {
  kpis: {
    vendas_totais: number;
    negocios_ganhos: number;
    negocios_perdidos: number;
    ticket_medio: number;
    conversao_percentual: number;
  };
  arquitetosResumo: {
    total_arquitetos: number;
    total_vendido_arquitetos: number;
    projetos_efetivados: number;
  };
}

export function PerformanceKPIs({ kpis, arquitetosResumo }: PerformanceKPIsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vendas Totais</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{formatCurrency(kpis.vendas_totais)}</div>
          <p className="text-xs text-muted-foreground">No período da meta</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{formatCurrency(kpis.ticket_medio)}</div>
          <p className="text-xs text-muted-foreground">Média por negócio ganho</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Negócios Ganhos</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{kpis.negocios_ganhos}</div>
          <p className="text-xs text-muted-foreground">Total fechado com sucesso</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Negócios Perdidos</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{kpis.negocios_perdidos}</div>
          <p className="text-xs text-muted-foreground">Total de oportunidades perdidas</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversão Geral</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{(kpis.conversao_percentual || 0).toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">Taxa de fechamento</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Profissionais Parceiros Engajados</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{arquitetosResumo.total_arquitetos}</div>
          <p className="text-xs text-muted-foreground">Geraram vendas na meta</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vendas via Profissionais Parceiros</CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{formatCurrency(arquitetosResumo.total_vendido_arquitetos)}</div>
          <p className="text-xs text-muted-foreground">Total com profissionais parceiros</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Projetos Efetivados</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{arquitetosResumo.projetos_efetivados}</div>
          <p className="text-xs text-muted-foreground">Criados a partir dos negócios</p>
        </CardContent>
      </Card>
    </div>
  );
}
