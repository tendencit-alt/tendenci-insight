import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, HeartPulse, Shield, BarChart3, Info } from "lucide-react";
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

  // Burn Rate e Runway (Saúde Financeira)
  const burnRate = saidas > 0 ? saidas / 30 : 0;
  const runway = burnRate > 0 && saldoConsolidado > 0
    ? Math.floor(saldoConsolidado / (burnRate * 30))
    : 0;

  // DSCR = Entradas / Saídas (Cobertura da Dívida)
  const dscr = saidas > 0 ? entradas / saidas : entradas > 0 ? 999 : 0;
  const hasDivida = saidas > 0;

  // Qualidade do Caixa: Conversão (% do resultado sobre entradas) + Dependência (% saldo/saídas)
  const conversao = entradas > 0 ? (resultado / entradas) * 100 : 0;
  const dependencia = saidas > 0 ? (saldoConsolidado / saidas) * 100 : 0;

  // Status colors - Saúde Financeira
  const getSaudeColor = () => {
    if (resultado >= 0 && runway > 6) return { text: "text-green-600", bg: "bg-green-50", status: "Saudável" };
    if (resultado >= 0 || runway > 3) return { text: "text-yellow-600", bg: "bg-yellow-50", status: "Atenção" };
    return { text: "text-red-600", bg: "bg-red-50", status: "Crítico" };
  };

  // Status colors - Qualidade do Caixa
  const getQualidadeColor = () => {
    if (conversao >= 10 && dependencia >= 100) return { text: "text-green-600", bg: "bg-green-50", status: "Excelente" };
    if (conversao >= 0 && dependencia >= 50) return { text: "text-yellow-600", bg: "bg-yellow-50", status: "Regular" };
    return { text: "text-red-600", bg: "bg-red-50", status: "Baixa" };
  };

  // Status colors - DSCR
  const getDscrColor = () => {
    if (dscr >= 1.5) return { text: "text-green-600", bg: "bg-green-50", status: "Saudável" };
    if (dscr >= 1.0) return { text: "text-yellow-600", bg: "bg-yellow-50", status: "Atenção" };
    return { text: "text-red-600", bg: "bg-red-50", status: "Crítico" };
  };

  const saudeColors = getSaudeColor();
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
        {/* 💰 Saldo Consolidado */}
        <Card className="relative overflow-hidden border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm">💰</span>
                  <p className="text-xs text-muted-foreground font-medium">Saldo Consolidado</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px] text-xs">
                      <p>Soma de todos os saldos das contas bancárias. Avalia a liquidez imediata e capacidade de honrar compromissos.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className={cn("text-2xl font-bold", saldoConsolidado >= 0 ? "text-blue-600" : "text-red-600")}>
                  {formatCurrency(saldoConsolidado)}
                </p>
              </div>
              <div className={cn("p-3 rounded-full", saldoConsolidado >= 0 ? "bg-blue-50" : "bg-red-50")}>
                <Wallet className={cn("h-6 w-6", saldoConsolidado >= 0 ? "text-blue-600" : "text-red-600")} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 🔴 Saúde Financeira (Resultado + Burn + Runway) */}
        <Card className={cn("relative overflow-hidden border-l-4", 
          saudeColors.text === "text-green-600" ? "border-l-green-500" : 
          saudeColors.text === "text-yellow-600" ? "border-l-yellow-500" : "border-l-red-500"
        )}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm">🔴</span>
                  <p className="text-xs text-muted-foreground font-medium">Saúde Financeira</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px] text-xs">
                      <p><strong>Resultado:</strong> Lucro/Prejuízo do período</p>
                      <p><strong>Burn Rate:</strong> Consumo mensal de caixa</p>
                      <p><strong>Runway:</strong> Meses que pode operar com saldo atual</p>
                      <p className="mt-1 text-muted-foreground">Menos de 3 meses = urgente buscar capital ou cortar custos</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="space-y-0.5">
                  <p className={cn("text-xl font-bold", resultado >= 0 ? "text-green-600" : "text-red-600")}>
                    {formatCurrency(resultado)}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Burn: <span className="font-medium text-foreground">{formatCurrency(saidas)}/mês</span></span>
                    <span>•</span>
                    <span>Fôlego: <span className={cn("font-semibold", saudeColors.text)}>{runway} meses</span></span>
                  </div>
                </div>
              </div>
              <div className={cn("p-3 rounded-full", saudeColors.bg)}>
                <HeartPulse className={cn("h-6 w-6", saudeColors.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 🟡 Qualidade do Caixa (Conversão + Dependência Financeira) */}
        <Card className={cn("relative overflow-hidden border-l-4", 
          qualidadeColors.text === "text-green-600" ? "border-l-green-500" : 
          qualidadeColors.text === "text-yellow-600" ? "border-l-yellow-500" : "border-l-red-500"
        )}>
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
                    <TooltipContent side="top" className="max-w-[280px] text-xs">
                      <p><strong>Conversão:</strong> % do resultado sobre as receitas (margem operacional)</p>
                      <p><strong>Cobertura:</strong> % do saldo em relação às despesas mensais</p>
                      <p className="mt-1 text-muted-foreground">Conversão alta + Cobertura alta = Caixa saudável</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="space-y-0.5">
                  <p className={cn("text-xl font-bold", qualidadeColors.text)}>
                    {qualidadeColors.status}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Conversão: <span className={cn("font-medium", conversao >= 10 ? "text-green-600" : conversao >= 0 ? "text-yellow-600" : "text-red-600")}>{conversao.toFixed(1)}%</span></span>
                    <span>•</span>
                    <span>Cobertura: <span className={cn("font-medium", dependencia >= 100 ? "text-green-600" : dependencia >= 50 ? "text-yellow-600" : "text-red-600")}>{dependencia.toFixed(0)}%</span></span>
                  </div>
                </div>
              </div>
              <div className={cn("p-3 rounded-full", qualidadeColors.bg)}>
                <BarChart3 className={cn("h-6 w-6", qualidadeColors.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 🏦 Cobertura da Dívida (DSCR) */}
        <Card className={cn("relative overflow-hidden border-l-4", 
          !hasDivida ? "border-l-gray-300" :
          dscrColors.text === "text-green-600" ? "border-l-green-500" : 
          dscrColors.text === "text-yellow-600" ? "border-l-yellow-500" : "border-l-red-500"
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
