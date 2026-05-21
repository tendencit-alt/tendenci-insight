import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Users, Award, Target, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";

interface GoalsAnalyticsProps {
  refreshTrigger: number;
}

interface SellerRanking {
  vendedor_id: string;
  full_name: string;
  email: string;
  percentual_meta_atualizado: number;
  valor_total_vendido: number;
  posicao_atual: number;
}

export function GoalsAnalytics({ refreshTrigger }: GoalsAnalyticsProps) {
  const { isMaster } = usePermissions();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [refreshTrigger]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      if (isMaster) {
        // Masters veem o ranking completo
        const { data: ranking, error: rankingError } = await supabase
          .from("tendenci_seller_ranking" as any)
          .select(`
            vendedor_id,
            percentual_meta_atualizado,
            valor_total_vendido,
            posicao_atual,
            profiles:vendedor_id (full_name, email)
          `)
          .order("percentual_meta_atualizado", { ascending: false })
          .limit(10);

        if (rankingError) throw rankingError;

        // Calcular estatísticas
        const percentuais = ranking?.map((r: any) => r.percentual_meta_atualizado) || [];
        const mediaEquipe = percentuais.length > 0 ? percentuais.reduce((a: number, b: number) => a + b, 0) / percentuais.length : 0;

        // Buscar meta consolidada ativa
        const { data: companyGoal, error: companyError } = await supabase
          .from("tendenci_company_goals" as any)
          .select("*, tendenci_goal_progress(*)")
          .eq("status", "ativa")
          .gte("data_fim", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Contar vendedores em diferentes faixas
        const acimaMedia = ranking?.filter((r: any) => r.percentual_meta_atualizado > mediaEquipe).length || 0;
        const abaixoMedia = ranking?.filter((r: any) => r.percentual_meta_atualizado <= mediaEquipe).length || 0;
        const atingiuMeta = ranking?.filter((r: any) => r.percentual_meta_atualizado >= 100).length || 0;

        setAnalytics({
          ranking,
          mediaEquipe,
          acimaMedia,
          abaixoMedia,
          atingiuMeta,
          companyGoal,
        });
      } else {
        // Vendedores veem apenas seu próprio desempenho
        const { data: myRanking, error: rankingError } = await supabase
          .from("tendenci_seller_ranking" as any)
          .select(`
            vendedor_id,
            percentual_meta_atualizado,
            valor_total_vendido,
            posicao_atual,
            profiles:vendedor_id (full_name, email)
          `)
          .eq("vendedor_id", user?.id)
          .maybeSingle();

        if (rankingError) throw rankingError;

        // Buscar média da equipe para comparação
        const { data: allRankings } = await supabase
          .from("tendenci_seller_ranking" as any)
          .select("percentual_meta_atualizado");

        const percentuais = (allRankings || []).map((r: any) => r.percentual_meta_atualizado);
        const mediaEquipe = percentuais.length > 0 ? percentuais.reduce((a: number, b: number) => a + b, 0) / percentuais.length : 0;

        // Buscar meta consolidada ativa
        const { data: companyGoal } = await supabase
          .from("tendenci_company_goals" as any)
          .select("*, tendenci_goal_progress(*)")
          .eq("status", "ativa")
          .gte("data_fim", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        setAnalytics({
          ranking: myRanking ? [myRanking] : [],
          mediaEquipe,
          myPerformance: (myRanking as any)?.percentual_meta_atualizado || 0,
          companyGoal,
        });
      }
    } catch (error) {
      console.error("Erro ao buscar analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">Carregando...</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Cards de KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média da Equipe</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.mediaEquipe.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Performance média</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acima da Média</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.acimaMedia}</div>
            <p className="text-xs text-muted-foreground mt-1">Vendedores performando bem</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abaixo da Média</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.abaixoMedia}</div>
            <p className="text-xs text-muted-foreground mt-1">Precisam de atenção</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atingiram Meta</CardTitle>
            <Award className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.atingiuMeta}</div>
            <p className="text-xs text-muted-foreground mt-1">100% ou mais</p>
          </CardContent>
        </Card>
      </div>

      {/* Meta Consolidada */}
      {analytics.companyGoal && (
        <Card>
          <CardHeader>
            <CardTitle>Meta Consolidada da Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Meta Total</p>
                <p className="text-xl font-bold">
                  {analytics.companyGoal.valor_meta_total.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vendido</p>
                <p className="text-xl font-bold text-green-600">
                  {(analytics.companyGoal.tendenci_goal_progress?.[0]?.valor_vendido || 0).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progresso</p>
                <p className="text-xl font-bold">
                  {(analytics.companyGoal.tendenci_goal_progress?.[0]?.percentual || 0).toFixed(1)}%
                </p>
              </div>
            </div>
            <Progress value={analytics.companyGoal.tendenci_goal_progress?.[0]?.percentual || 0} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* Ranking Completo */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Top Performers
            </CardTitle>
            <CardDescription>Vendedores com performance acima de 80%</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.ranking
                ?.filter((seller: any) => seller.percentual_meta_atualizado >= 80)
                .map((seller: any, index: number) => (
                  <div
                    key={seller.vendedor_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{seller.profiles?.full_name || seller.profiles?.email || "Vendedor"}</p>
                        <p className="text-sm text-muted-foreground">{seller.profiles?.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{seller.percentual_meta_atualizado.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">
                        {seller.valor_total_vendido.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              {analytics.ranking?.filter((s: any) => s.percentual_meta_atualizado >= 80).length === 0 && (
                <p className="text-center text-muted-foreground py-8">Nenhum vendedor acima de 80% ainda</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Precisam de Atenção */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-orange-500" />
              Precisam de Atenção
            </CardTitle>
            <CardDescription>Vendedores com performance abaixo de 50%</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.ranking
                ?.filter((seller: any) => seller.percentual_meta_atualizado < 50)
                .sort((a: any, b: any) => a.percentual_meta_atualizado - b.percentual_meta_atualizado)
                .map((seller: any, index: number) => (
                  <div
                    key={seller.vendedor_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 text-white font-bold text-sm">
                        !
                      </div>
                      <div>
                        <p className="font-medium">{seller.profiles?.full_name || seller.profiles?.email || "Vendedor"}</p>
                        <p className="text-sm text-muted-foreground">{seller.profiles?.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-orange-600">{seller.percentual_meta_atualizado.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">
                        {seller.valor_total_vendido.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              {analytics.ranking?.filter((s: any) => s.percentual_meta_atualizado < 50).length === 0 && (
                <p className="text-center text-muted-foreground py-8">Todos os vendedores estão acima de 50%! 🎉</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking Completo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Ranking Geral da Equipe
          </CardTitle>
          <CardDescription>Performance de todos os vendedores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.ranking?.map((seller: any, index: number) => (
              <div key={seller.vendedor_id} className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{seller.profiles?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{seller.profiles?.email}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right min-w-[100px]">
                    <p className="font-bold">{seller.percentual_meta_atualizado.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">
                      {seller.valor_total_vendido.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                  </div>
                  <div className="w-24">
                    <Progress value={seller.percentual_meta_atualizado} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
