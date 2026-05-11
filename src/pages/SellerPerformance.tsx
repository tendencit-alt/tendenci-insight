import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PerformanceHeader } from "@/components/goals/performance/PerformanceHeader";
import { PerformanceKPIs } from "@/components/goals/performance/PerformanceKPIs";
import { PerformanceCharts } from "@/components/goals/performance/PerformanceCharts";
import { DealsTable } from "@/components/goals/performance/DealsTable";
import { ArchitectsAnalysis } from "@/components/goals/performance/ArchitectsAnalysis";
import { ProductsAnalysis } from "@/components/goals/performance/ProductsAnalysis";
import { ConversionByOrigin } from "@/components/goals/performance/ConversionByOrigin";
import { useToast } from "@/hooks/use-toast";

export default function SellerPerformance() {
  const { goalId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // Verificar se é master
    if (profile?.role !== 'admin') {
      toast({
        title: "⛔ Acesso Negado",
        description: "Apenas usuários master podem acessar este dashboard.",
        variant: "destructive",
      });
      navigate('/metas');
      return;
    }

    if (goalId) {
      fetchPerformanceData();
    }
  }, [goalId, profile, navigate]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const { data: result, error } = await supabase.rpc("get_seller_performance_by_goal", {
        p_seller_goal_id: goalId,
      });

      if (error) throw error;
      
      const resultData = result as any;
      if (resultData && typeof resultData === 'object' && 'error' in resultData) {
        toast({
          title: "Erro",
          description: resultData.error,
          variant: "destructive",
        });
        navigate('/metas/gestao');
        return;
      }

      setData(resultData);
    } catch (error) {
      console.error("Erro ao buscar dados de performance:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados de performance do vendedor.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Carregando dashboard executivo...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Nenhum dado disponível.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/metas/gestao')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Executivo</h1>
            <p className="text-muted-foreground">Análise completa de desempenho do vendedor</p>
          </div>
        </div>

        <PerformanceHeader 
          sellerInfo={data.seller_info}
          goalInfo={data.goal_info}
          kpis={data.kpis}
        />

        <PerformanceKPIs kpis={data.kpis} arquitetosResumo={data.arquitetos_resumo} />

        <Tabs defaultValue="graficos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="graficos">Gráficos</TabsTrigger>
            <TabsTrigger value="negocios">Negócios Ganhos</TabsTrigger>
            <TabsTrigger value="profissionais parceiros">Profissionais Parceiros</TabsTrigger>
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
            <TabsTrigger value="conversao">Conversão</TabsTrigger>
          </TabsList>

          <TabsContent value="graficos">
            <PerformanceCharts
              evolucaoDiaria={data.evolucao_diaria}
              origemLeads={data.origem_leads}
              produtosVendidos={data.produtos_vendidos}
              arquitetosVendas={data.arquitetos_vendas}
              goalInfo={data.goal_info}
            />
          </TabsContent>

          <TabsContent value="negocios">
            <DealsTable deals={data.negocios_ganhos_detalhes || []} />
          </TabsContent>

          <TabsContent value="profissionais parceiros">
            <ArchitectsAnalysis
              arquitetosVendas={data.arquitetos_vendas}
              arquitetosResumo={data.arquitetos_resumo}
            />
          </TabsContent>

          <TabsContent value="produtos">
            <ProductsAnalysis produtosVendidos={data.produtos_vendidos || []} />
          </TabsContent>

          <TabsContent value="conversao">
            <ConversionByOrigin conversaoPorOrigem={data.conversao_por_origem || []} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
