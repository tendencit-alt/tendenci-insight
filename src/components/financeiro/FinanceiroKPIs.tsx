import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, TrendingUp, Wind, Shield, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FinanceiroKPIsProps {
  metrics?: {
    entradas: number;
    saidas: number;
    resultado: number;
    saldoConsolidado: number;
  };
  isLoading: boolean;
}

export function FinanceiroKPIs({ metrics, isLoading }: FinanceiroKPIsProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  // Cálculos
  const entradas = metrics?.entradas || 0;
  const saidas = metrics?.saidas || 0;
  const resultado = metrics?.resultado || 0;
  const saldoConsolidado = metrics?.saldoConsolidado || 0;

  // Fôlego de Caixa: Burn Rate mensal e Runway (meses)
  const burnRate = saidas; // consumo mensal total
  const runway = burnRate > 0 && saldoConsolidado > 0
    ? Math.floor(saldoConsolidado / burnRate)
    : 0;

  // DSCR = Entradas / Saídas (Cobertura da Dívida)
  const dscr = saidas > 0 ? entradas / saidas : entradas > 0 ? 999 : 0;
  const hasDivida = saidas > 0;

  // Qualidade do Caixa: Conversão (% do resultado sobre entradas) + Cobertura (% saldo/saídas)
  const conversao = entradas > 0 ? (resultado / entradas) * 100 : 0;
  const cobertura = saidas > 0 ? (saldoConsolidado / saidas) * 100 : 0;

  // Status colors - Resultado
  const getResultadoColor = () => {
    if (resultado > 0) return { text: "text-green-600", bg: "bg-green-50", border: "border-l-green-500" };
    if (resultado === 0) return { text: "text-yellow-600", bg: "bg-yellow-50", border: "border-l-yellow-500" };
    return { text: "text-red-600", bg: "bg-red-50", border: "border-l-red-500" };
  };

  // Status colors - Fôlego de Caixa
  const getFolegoColor = () => {
    if (runway > 6) return { text: "text-green-600", bg: "bg-green-50", status: "Confortável", border: "border-l-green-500" };
    if (runway >= 3) return { text: "text-yellow-600", bg: "bg-yellow-50", status: "Atenção", border: "border-l-yellow-500" };
    return { text: "text-red-600", bg: "bg-red-50", status: "Crítico", border: "border-l-red-500" };
  };

  // Status colors - Qualidade do Caixa
  const getQualidadeColor = () => {
    if (conversao >= 10 && cobertura >= 100) return { text: "text-green-600", bg: "bg-green-50", status: "Boa", border: "border-l-green-500" };
    if (conversao >= 0 && cobertura >= 50) return { text: "text-yellow-600", bg: "bg-yellow-50", status: "Atenção", border: "border-l-yellow-500" };
    return { text: "text-red-600", bg: "bg-red-50", status: "Crítica", border: "border-l-red-500" };
  };

  // Status colors - DSCR
  const getDscrColor = () => {
    if (dscr >= 1.5) return { text: "text-green-600", bg: "bg-green-50", status: "Saudável", border: "border-l-green-500" };
    if (dscr >= 1.0) return { text: "text-yellow-600", bg: "bg-yellow-50", status: "Atenção", border: "border-l-yellow-500" };
    return { text: "text-red-600", bg: "bg-red-50", status: "Crítico", border: "border-l-red-500" };
  };

  const resultadoColors = getResultadoColor();
  const folegoColors = getFolegoColor();
  const qualidadeColors = getQualidadeColor();
  const dscrColors = getDscrColor();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* ✅ 1. Resultado Líquido do Período */}
        <Card className={cn("relative overflow-hidden border-l-4", resultadoColors.border)}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm">📊</span>
                  <p className="text-xs text-muted-foreground font-medium">Resultado Líquido</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px] text-xs">
                      <p>Lucro ou prejuízo do período filtrado.</p>
                      <p className="mt-1 text-muted-foreground">Receitas – Despesas = Resultado</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className={cn("text-2xl font-bold", resultadoColors.text)}>
                  {formatCurrency(resultado)}
                </p>
              </div>
              <div className={cn("p-3 rounded-full", resultadoColors.bg)}>
                <TrendingDown className={cn("h-6 w-6", resultadoColors.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ✅ 2. Fôlego de Caixa (unifica Burn + Runway + Saúde) */}
        <Card className={cn("relative overflow-hidden border-l-4", folegoColors.border)}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm">💨</span>
                  <p className="text-xs text-muted-foreground font-medium">Fôlego de Caixa</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px] text-xs">
                      <p><strong>Consumo:</strong> Total de saídas no mês</p>
                      <p><strong>Fôlego:</strong> Quantos meses pode operar com o saldo atual</p>
                      <p className="mt-1 text-muted-foreground">Menos de 3 meses = urgente buscar capital ou cortar custos</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xl font-bold", folegoColors.text)}>
                      {runway} {runway === 1 ? "mês" : "meses"}
                    </span>
                    <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", folegoColors.bg, folegoColors.text)}>
                      {folegoColors.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Consumo: <span className="font-medium text-foreground">{formatCurrency(burnRate)}/mês</span>
                  </p>
                </div>
              </div>
              <div className={cn("p-3 rounded-full", folegoColors.bg)}>
                <Wind className={cn("h-6 w-6", folegoColors.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ✅ 3. Qualidade do Caixa (simplificado) */}
        <Card className={cn("relative overflow-hidden border-l-4", qualidadeColors.border)}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm">🟡</span>
                  <p className="text-xs text-muted-foreground font-medium">Qualidade do Caixa</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[300px] text-xs">
                      <p className="font-semibold mb-1">Detalhamento:</p>
                      <p><strong>Conversão:</strong> {conversao.toFixed(1)}% (margem sobre receitas)</p>
                      <p><strong>Cobertura:</strong> {cobertura.toFixed(0)}% (saldo vs despesas)</p>
                      <p className="mt-2 text-muted-foreground">
                        Boa = Conversão ≥10% e Cobertura ≥100%<br/>
                        Atenção = Conversão ≥0% e Cobertura ≥50%<br/>
                        Crítica = Abaixo dos limites
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className={cn("text-2xl font-bold", qualidadeColors.text)}>
                  {qualidadeColors.status}
                </p>
              </div>
              <div className={cn("p-3 rounded-full", qualidadeColors.bg)}>
                <BarChart3 className={cn("h-6 w-6", qualidadeColors.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ✅ 4. DSCR - Cobertura Financeira */}
        <Card className={cn("relative overflow-hidden border-l-4", 
          !hasDivida ? "border-l-gray-300" : dscrColors.border
        )}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm">🏦</span>
                  <p className="text-xs text-muted-foreground font-medium">DSCR - Cobertura</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px] text-xs">
                      <p><strong>Debt Service Coverage Ratio</strong></p>
                      <p>Índice de Cobertura = Receitas / Despesas</p>
                      <p className="mt-1">• Acima de 1.5x = Saudável</p>
                      <p>• Entre 1.0x e 1.5x = Atenção</p>
                      <p>• Abaixo de 1.0x = Crítico</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                {hasDivida ? (
                  <div className="space-y-0.5">
                    <p className={cn("text-2xl font-bold", dscrColors.text)}>
                      {dscr > 10 ? ">10x" : `${dscr.toFixed(2)}x`}
                    </p>
                    <p className={cn("text-xs font-medium", dscrColors.text)}>
                      {dscrColors.status}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <p className="text-xl font-bold text-muted-foreground">N/A</p>
                    <p className="text-xs text-muted-foreground">Sem despesas no período</p>
                  </div>
                )}
              </div>
              <div className={cn("p-3 rounded-full", hasDivida ? dscrColors.bg : "bg-gray-50")}>
                <Shield className={cn("h-6 w-6", hasDivida ? dscrColors.text : "text-gray-400")} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
