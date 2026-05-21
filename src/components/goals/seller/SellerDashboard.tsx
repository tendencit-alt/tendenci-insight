import { GoalHeader } from "./GoalHeader";
import { SellerGoalCards } from "./SellerGoalCards";
import { ComparisonCards } from "./ComparisonCards";
import { BadgesSection } from "./BadgesSection";
import { DailyArchitectGoals } from "../DailyArchitectGoals";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Building2 } from "lucide-react";
import { NoActiveGoalAlert } from "../NoActiveGoalAlert";

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

interface GoalStatus {
  hasActiveSellerGoal: boolean;
  hasActiveCompanyGoal: boolean;
  currentMonth: string;
  sellersWithoutGoals: number;
  loading: boolean;
}

interface SellerDashboardProps {
  userName: string;
  userAvatar?: string;
  goalData: GoalData | null;
  companyGoal: any;
  teamAverage: number;
  goalStatus?: GoalStatus;
}

export function SellerDashboard({ 
  userName, 
  userAvatar, 
  goalData, 
  companyGoal,
  teamAverage,
  goalStatus
}: SellerDashboardProps) {
  const getMotivationalMessage = (percentual: number, teamAvg: number) => {
    if (percentual >= 100) {
      return { text: "🎉 Parabéns! Você atingiu sua meta!", color: "text-success-foreground" };
    } else if (percentual >= teamAvg) {
      return { text: "🚀 Você está acima da média da equipe, continue assim!", color: "text-success-foreground" };
    } else if (percentual >= 70) {
      return { text: "🎯 Você está perto da meta, acelera!", color: "text-warning-foreground" };
    } else {
      return { text: "💪 Vamos nessa! Acelere para alcançar a meta!", color: "text-primary-foreground" };
    }
  };

  const metaAtiva = goalData?.meta_ativa;
  const motivationalMessage = metaAtiva 
    ? getMotivationalMessage(metaAtiva.percentual, teamAverage)
    : { text: "Configure sua meta para começar!", color: "text-muted-foreground" };

  // Calcular dados para os cards
  const salesGoal = metaAtiva ? {
    target: metaAtiva.valor_meta,
    current: metaAtiva.valor_vendido,
    percentage: metaAtiva.percentual
  } : undefined;

  // Dados de ranking
  const ranking = goalData?.ranking ? {
    position: goalData.ranking.posicao,
    total: goalData.ranking.total_vendedores,
    topPercentage: metaAtiva ? metaAtiva.percentual : 0,
    teamAveragePercentage: teamAverage
  } : undefined;

  // Calcular projeção mensal
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const currentDay = today.getDate();
  const dailyAverage = metaAtiva ? metaAtiva.valor_vendido / currentDay : 0;
  const projectedMonth = dailyAverage * daysInMonth;

  const trend = metaAtiva ? {
    currentSales: metaAtiva.valor_vendido,
    projectedSales: projectedMonth,
    goalAmount: metaAtiva.valor_meta
  } : undefined;

  const pace = metaAtiva ? {
    dailyAverage: dailyAverage,
    idealDaily: metaAtiva.valor_meta / daysInMonth,
    projectedMonth: projectedMonth
  } : undefined;

  return (
    <div className="space-y-6">
      <GoalHeader 
        userName={userName}
        userAvatar={userAvatar}
        motivationalMessage={motivationalMessage}
      />

      {/* Alerta quando não há meta ativa */}
      {goalStatus && !goalStatus.hasActiveSellerGoal && !goalStatus.loading && (
        <NoActiveGoalAlert 
          type="sales" 
          currentMonth={goalStatus.currentMonth}
        />
      )}

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="performance">Meu Desempenho</TabsTrigger>
          <TabsTrigger value="badges">Insígnias</TabsTrigger>
          <TabsTrigger value="company">Meta da Empresa</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6 mt-6">
          {/* Meta Diária de Captação */}
          <DailyArchitectGoals />

          {/* Cards Principais - só mostra se há meta */}
          {metaAtiva && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Metas Principais</h2>
              <SellerGoalCards 
                salesGoal={salesGoal}
              />
            </div>
          )}

          {!metaAtiva && (
            <Card className="border-muted">
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">
                  Quando sua meta for configurada, você verá seus dados aqui.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Cards de Comparação - só mostra se há meta */}
          {metaAtiva && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Análise de Performance</h2>
              <ComparisonCards 
                ranking={ranking}
                trend={trend}
                pace={pace}
              />
            </div>
          )}

          {/* Rodapé motivacional */}
          {metaAtiva && (
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <p className="text-center text-lg font-medium text-foreground">
                  {metaAtiva.percentual >= 100 
                    ? "🎯 Você está fazendo um ótimo trabalho, continue!"
                    : metaAtiva.percentual >= teamAverage
                    ? "🔥 Você está entre os melhores da equipe!"
                    : "🚀 Acelere nas vendas para atingir seu melhor mês!"
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="badges" className="space-y-6 mt-6">
          <BadgesSection badges={goalData?.insignias || []} />
        </TabsContent>

        <TabsContent value="company" className="space-y-6 mt-6">
          {companyGoal ? (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Meta Consolidada da Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Meta Total</p>
                    <p className="text-2xl font-bold">
                      R$ {(companyGoal.valor_meta || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Valor Vendido</p>
                    <p className="text-2xl font-bold text-success">
                      R$ {(companyGoal.tendenci_goal_progress?.[0]?.valor_vendido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-bold">
                      {(companyGoal.tendenci_goal_progress?.[0]?.percentual || 0).toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={companyGoal.tendenci_goal_progress?.[0]?.percentual || 0}
                    className="h-3"
                  />
                </div>

                {companyGoal.descricao && (
                  <p className="text-sm text-muted-foreground mt-4">
                    {companyGoal.descricao}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Nenhuma meta da empresa ativa no momento.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
