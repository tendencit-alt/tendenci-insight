import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Target, TrendingUp, Award, Flame, Star, Zap, Crown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GoalData {
  meta_ativa: {
    id: string;
    valor_meta: number;
    data_inicio: string;
    data_fim: string;
    descricao: string;
    valor_vendido: number;
    percentual: number;
  } | null;
  ranking: {
    posicao: number;
    total_vendedores: number;
  } | null;
  insignias: Array<{
    type: string;
    earned_at: string;
    percentual: number;
  }> | null;
}

const badgeInfo = {
  start_meta: { label: "Start da Meta", icon: Star, color: "text-blue-500" },
  meio_caminho: { label: "Meio do Caminho", icon: Target, color: "text-purple-500" },
  virada_meta: { label: "Virada da Meta", icon: Flame, color: "text-orange-500" },
  atingiu_meta: { label: "Atingiu a Meta", icon: Trophy, color: "text-yellow-500" },
  meta_explodida: { label: "Meta Explodida", icon: Zap, color: "text-red-500" },
  closer_mes: { label: "Closer do Mês", icon: Crown, color: "text-gold-500" },
};

export default function Goals() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [goalData, setGoalData] = useState<GoalData | null>(null);
  const [companyGoal, setCompanyGoal] = useState<any>(null);
  const [teamAverage, setTeamAverage] = useState<number>(0);

  useEffect(() => {
    if (user) {
      fetchGoalData();
      fetchCompanyGoal();
      fetchTeamAverage();
    }
  }, [user]);

  const fetchGoalData = async () => {
    try {
      const { data, error } = await supabase.rpc("get_seller_goal_stats", {
        p_vendedor_id: user?.id,
      });

      if (error) throw error;
      setGoalData(data as unknown as GoalData);
    } catch (error) {
      console.error("Erro ao buscar dados da meta:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyGoal = async () => {
    try {
      const { data: goals, error } = await supabase
        .from("tendenci_company_goals")
        .select("*, tendenci_goal_progress(*)")
        .eq("status", "ativa")
        .gte("data_fim", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      if (goals && goals.length > 0) {
        setCompanyGoal(goals[0]);
      }
    } catch (error) {
      console.error("Erro ao buscar meta da empresa:", error);
    }
  };

  const fetchTeamAverage = async () => {
    try {
      const { data, error } = await supabase
        .from("tendenci_seller_ranking")
        .select("percentual_meta_atualizado");

      if (error) throw error;
      if (data && data.length > 0) {
        const avg = data.reduce((acc, curr) => acc + (curr.percentual_meta_atualizado || 0), 0) / data.length;
        setTeamAverage(avg);
      }
    } catch (error) {
      console.error("Erro ao buscar média da equipe:", error);
    }
  };

  const getMotivationalMessage = (percentual: number, teamAvg: number) => {
    if (percentual >= 100) {
      return { text: "🎉 Parabéns! Você atingiu sua meta!", color: "text-green-600" };
    } else if (percentual >= 90) {
      return { text: "🔥 Falta pouco! Você está quase lá!", color: "text-orange-600" };
    } else if (percentual > teamAvg) {
      return { text: "🚀 Você está acima da média da equipe! Continue!", color: "text-blue-600" };
    } else if (percentual >= 50) {
      return { text: "💪 Você está no ritmo certo! Continue assim.", color: "text-purple-600" };
    } else {
      return { text: "⚡ Hora de acelerar! Você consegue!", color: "text-yellow-600" };
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Carregando suas metas...</p>
        </div>
      </DashboardLayout>
    );
  }

  const metaAtiva = goalData?.meta_ativa;
  const percentual = metaAtiva?.percentual || 0;
  const valorVendido = metaAtiva?.valor_vendido || 0;
  const valorMeta = metaAtiva?.valor_meta || 0;
  const valorRestante = valorMeta - valorVendido;
  const motivationalMsg = getMotivationalMessage(percentual, teamAverage);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metas</h1>
          <p className="text-muted-foreground">Acompanhe seu desempenho e conquistas</p>
        </div>

        {!metaAtiva ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">Nenhuma meta ativa no momento</p>
              <p className="text-sm text-muted-foreground mt-2">
                Aguarde o gestor definir sua próxima meta
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Meta Pessoal */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Sua Meta Pessoal
                </CardTitle>
                <CardDescription>
                  {format(new Date(metaAtiva.data_inicio), "dd/MM/yyyy", { locale: ptBR })} até{" "}
                  {format(new Date(metaAtiva.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Progresso</span>
                    <span className="text-2xl font-bold">{percentual.toFixed(1)}%</span>
                  </div>
                  <Progress value={percentual} className="h-3" />
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Meta</p>
                    <p className="text-lg font-bold">
                      {valorMeta.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vendido</p>
                    <p className="text-lg font-bold text-green-600">
                      {valorVendido.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Falta</p>
                    <p className="text-lg font-bold text-orange-600">
                      {valorRestante.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                  </div>
                </div>

                <div className={`text-center p-4 rounded-lg bg-muted ${motivationalMsg.color}`}>
                  <p className="font-semibold">{motivationalMsg.text}</p>
                </div>

                {metaAtiva.descricao && (
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-1">Descrição:</p>
                    <p>{metaAtiva.descricao}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ranking */}
            {goalData?.ranking && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Seu Ranking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-2">
                    <p className="text-4xl font-bold">{goalData.ranking.posicao}º</p>
                    <p className="text-sm text-muted-foreground">
                      de {goalData.ranking.total_vendedores} vendedores
                    </p>
                    {goalData.ranking.posicao === 1 && (
                      <Badge variant="default" className="mt-2">
                        <Crown className="w-4 h-4 mr-1" />
                        Líder do Ranking!
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Comparação com a Equipe */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Comparação com a Equipe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Sua performance</span>
                  <span className="font-bold">{percentual.toFixed(1)}%</span>
                </div>
                <Progress value={percentual} className="h-2" />

                <div className="flex justify-between items-center mt-4">
                  <span>Média da equipe</span>
                  <span className="font-bold">{teamAverage.toFixed(1)}%</span>
                </div>
                <Progress value={teamAverage} className="h-2 opacity-50" />

                {percentual > teamAverage ? (
                  <p className="text-sm text-green-600 font-medium text-center">
                    Você está {(percentual - teamAverage).toFixed(1)}% acima da média! 🎯
                  </p>
                ) : (
                  <p className="text-sm text-orange-600 font-medium text-center">
                    A equipe está {(teamAverage - percentual).toFixed(1)}% acima de você. Acelere! ⚡
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Meta Consolidada da Empresa */}
        {companyGoal && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-500" />
                Meta Consolidada da Empresa
              </CardTitle>
              <CardDescription>Performance geral da equipe</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Meta Total</p>
                  <p className="text-xl font-bold">
                    {companyGoal.valor_meta_total.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendido</p>
                  <p className="text-xl font-bold text-green-600">
                    {(companyGoal.tendenci_goal_progress?.[0]?.valor_vendido || 0).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Progresso da Equipe</span>
                  <span className="text-sm font-bold">
                    {(companyGoal.tendenci_goal_progress?.[0]?.percentual || 0).toFixed(1)}%
                  </span>
                </div>
                <Progress value={companyGoal.tendenci_goal_progress?.[0]?.percentual || 0} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Insígnias */}
        {goalData?.insignias && goalData.insignias.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-gold-500" />
                Suas Conquistas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {goalData.insignias.map((badge, index) => {
                  const BadgeIcon = badgeInfo[badge.type as keyof typeof badgeInfo]?.icon || Award;
                  const badgeLabel = badgeInfo[badge.type as keyof typeof badgeInfo]?.label || badge.type;
                  const badgeColor = badgeInfo[badge.type as keyof typeof badgeInfo]?.color || "text-gray-500";

                  return (
                    <div key={index} className="flex flex-col items-center p-4 rounded-lg border bg-card text-center">
                      <BadgeIcon className={`w-12 h-12 mb-2 ${badgeColor}`} />
                      <p className="text-sm font-medium">{badgeLabel}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(badge.earned_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
