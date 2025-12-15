import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Target, TrendingUp, TrendingDown, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SellerGoalData {
  id: string;
  vendedor_id: string;
  vendedor_nome: string;
  valor_meta: number;
  valor_vendido: number;
  percentual: number;
}

interface CompanyGoalData {
  id: string;
  valor_meta_total: number;
  data_inicio: string;
  data_fim: string;
  valor_vendido: number;
  percentual: number;
}

export function MasterGoalsPanel() {
  const [companyGoal, setCompanyGoal] = useState<CompanyGoalData | null>(null);
  const [sellerGoals, setSellerGoals] = useState<SellerGoalData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoalsData();
  }, []);

  const fetchGoalsData = async () => {
    try {
      const now = new Date();
      
      // Buscar meta da empresa ativa
      const { data: companyData, error: companyError } = await supabase
        .from("tendenci_company_goals")
        .select(`
          id,
          valor_meta_total,
          data_inicio,
          data_fim,
          tendenci_goal_progress!tendenci_goal_progress_company_goal_id_fkey (
            valor_vendido,
            percentual
          )
        `)
        .eq("status", "ativa")
        .lte("data_inicio", now.toISOString())
        .gte("data_fim", now.toISOString())
        .maybeSingle();

      if (companyError) throw companyError;

      if (companyData) {
        const progress = companyData.tendenci_goal_progress?.[0];
        setCompanyGoal({
          id: companyData.id,
          valor_meta_total: Number(companyData.valor_meta_total) || 0,
          data_inicio: companyData.data_inicio,
          data_fim: companyData.data_fim,
          valor_vendido: Number(progress?.valor_vendido) || 0,
          percentual: Number(progress?.percentual) || 0,
        });
      }

      // Buscar metas individuais dos vendedores
      const { data: sellerData, error: sellerError } = await supabase
        .from("tendenci_seller_goals")
        .select(`
          id,
          vendedor_id,
          valor_meta,
          profiles!tendenci_seller_goals_vendedor_id_fkey (
            full_name
          ),
          tendenci_goal_progress!tendenci_goal_progress_seller_goal_id_fkey (
            valor_vendido,
            percentual
          )
        `)
        .eq("status", "ativa")
        .lte("data_inicio", now.toISOString())
        .gte("data_fim", now.toISOString());

      if (sellerError) throw sellerError;

      if (sellerData) {
        const mappedSellers: SellerGoalData[] = sellerData.map((seller: any) => ({
          id: seller.id,
          vendedor_id: seller.vendedor_id,
          vendedor_nome: seller.profiles?.full_name || "Vendedor",
          valor_meta: Number(seller.valor_meta) || 0,
          valor_vendido: Number(seller.tendenci_goal_progress?.[0]?.valor_vendido) || 0,
          percentual: Number(seller.tendenci_goal_progress?.[0]?.percentual) || 0,
        }));
        setSellerGoals(mappedSellers);
      }
    } catch (error) {
      console.error("Erro ao buscar metas:", error);
    } finally {
      setLoading(false);
    }
  };

  // Cálculos de esperado e realista
  const calculateExpectedAndRealistic = (
    valorMeta: number,
    valorVendido: number,
    dataInicio: string,
    dataFim: string
  ) => {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    const hoje = new Date();

    // Dias totais do período
    const diasTotais = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Dias passados desde o início
    const diasPassados = Math.max(1, Math.ceil((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Esperado até hoje (média diária ideal * dias passados)
    const mediaDiariaIdeal = valorMeta / diasTotais;
    const esperadoHoje = mediaDiariaIdeal * diasPassados;
    
    // Realista do mês (média atual * dias totais)
    const mediaDiariaAtual = valorVendido / diasPassados;
    const realistaMes = mediaDiariaAtual * diasTotais;
    
    // Status: acima ou abaixo do esperado
    const isAboveExpected = valorVendido >= esperadoHoje;
    
    return {
      esperadoHoje,
      realistaMes,
      isAboveExpected,
      diasPassados,
      diasTotais,
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getMonthName = () => {
    return new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!companyGoal) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Target className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhuma meta configurada para este mês</p>
        </CardContent>
      </Card>
    );
  }

  const companyCalc = calculateExpectedAndRealistic(
    companyGoal.valor_meta_total,
    companyGoal.valor_vendido,
    companyGoal.data_inicio,
    companyGoal.data_fim
  );

  return (
    <div className="space-y-4">
      {/* Card Meta da Empresa */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Meta da Empresa - {getMonthName()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Meta Total e Progresso */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Meta Total</span>
              <span className="font-semibold">{formatCurrency(companyGoal.valor_meta_total)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Atingido</span>
              <span className="font-semibold">
                {formatCurrency(companyGoal.valor_vendido)} ({companyGoal.percentual.toFixed(1)}%)
              </span>
            </div>
            <Progress value={companyGoal.percentual} className="h-2" />
          </div>

          {/* Esperado vs Realista */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">
                Esperado Hoje (dia {companyCalc.diasPassados}/{companyCalc.diasTotais})
              </p>
              <p className="text-base font-semibold">{formatCurrency(companyCalc.esperadoHoje)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground mb-1">Realista Mês</p>
                {companyCalc.isAboveExpected ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
              <p className={`text-base font-semibold ${companyCalc.isAboveExpected ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(companyCalc.realistaMes)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Composição por Vendedores */}
      {sellerGoals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Composição da Meta (por Vendedor)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sellerGoals.map((seller) => {
              const sellerCalc = calculateExpectedAndRealistic(
                seller.valor_meta,
                seller.valor_vendido,
                companyGoal.data_inicio,
                companyGoal.data_fim
              );

              return (
                <div key={seller.id} className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{seller.vendedor_nome}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Meta: {formatCurrency(seller.valor_meta)}
                      </span>
                      <span className={`text-xs font-semibold ${sellerCalc.isAboveExpected ? "text-green-600" : "text-red-600"}`}>
                        {seller.percentual.toFixed(1)}%
                      </span>
                      {sellerCalc.isAboveExpected ? (
                        <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                      )}
                    </div>
                  </div>
                  <Progress value={seller.percentual} className="h-1.5 mb-1" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Atingido: {formatCurrency(seller.valor_vendido)}</span>
                    <span>Esperado: {formatCurrency(sellerCalc.esperadoHoje)}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
