import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, Activity, HeartPulse, Shield, Info } from "lucide-react";
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

  const formatPercent = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  };

  // Cálculos
  const entradas = metrics?.entradas || 0;
  const saidas = metrics?.saidas || 0;
  const resultado = metrics?.resultado || 0;
  const saldoConsolidado = metrics?.saldoConsolidado || 0;

  const burnRate = saidas > 0 ? saidas / 30 : 0;
  const runway = burnRate > 0 && saldoConsolidado > 0
    ? Math.floor(saldoConsolidado / (burnRate * 30))
    : 0;

  // DSCR = Entradas / Saídas (simplificado - representa capacidade de cobertura)
  const dscr = saidas > 0 ? entradas / saidas : entradas > 0 ? 999 : 0;

  // Status colors
  const getFluxoColor = () => {
    if (entradas > saidas * 1.2) return { text: "text-green-600", bg: "bg-green-50" };
    if (entradas >= saidas) return { text: "text-blue-600", bg: "bg-blue-50" };
    return { text: "text-red-600", bg: "bg-red-50" };
  };

  const getSaudeColor = () => {
    if (resultado >= 0 && runway > 6) return { text: "text-green-600", bg: "bg-green-50" };
    if (resultado >= 0 || runway > 3) return { text: "text-yellow-600", bg: "bg-yellow-50" };
    return { text: "text-red-600", bg: "bg-red-50" };
  };

  const getDscrColor = () => {
    if (dscr >= 1.5) return { text: "text-green-600", bg: "bg-green-50" };
    if (dscr >= 1.0) return { text: "text-yellow-600", bg: "bg-yellow-50" };
    return { text: "text-red-600", bg: "bg-red-50" };
  };

  const fluxoColors = getFluxoColor();
  const saudeColors = getSaudeColor();
  const dscrColors = getDscrColor();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4">
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
        {/* Saldo Consolidado */}
        <Card className="relative overflow-hidden">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground font-medium">Saldo Consolidado</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px] text-xs">
                      <p>Soma de todos os saldos das contas bancárias. Avalia a liquidez imediata e capacidade de honrar compromissos de curto prazo.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className={cn("text-xl font-bold", saldoConsolidado >= 0 ? "text-blue-600" : "text-red-600")}>
                  {formatCurrency(saldoConsolidado)}
                </p>
              </div>
              <div className={cn("p-2 rounded-full", saldoConsolidado >= 0 ? "bg-blue-50" : "bg-red-50")}>
                <Wallet className={cn("h-5 w-5", saldoConsolidado >= 0 ? "text-blue-600" : "text-red-600")} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fluxo Operacional */}
        <Card className="relative overflow-hidden">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground font-medium">Fluxo Operacional</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px] text-xs">
                      <p>Receitas vs Despesas do período. Mostra o balanço operacional e tendência de crescimento ou retração.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="text-sm font-medium text-green-600">{formatCurrency(entradas)}</span>
                  </div>
                  <span className="text-muted-foreground">/</span>
                  <div className="flex items-center gap-1">
                    <TrendingDown className="h-3 w-3 text-red-600" />
                    <span className="text-sm font-medium text-red-600">{formatCurrency(saidas)}</span>
                  </div>
                </div>
              </div>
              <div className={cn("p-2 rounded-full", fluxoColors.bg)}>
                <Activity className={cn("h-5 w-5", fluxoColors.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Saúde Financeira */}
        <Card className="relative overflow-hidden">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground font-medium">Saúde Financeira</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px] text-xs">
                      <p>Resultado + Fôlego financeiro. Mostra o lucro/prejuízo e quantos meses a empresa pode operar. Menos de 3 meses = urgente.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div>
                  <p className={cn("text-lg font-bold", resultado >= 0 ? "text-green-600" : "text-red-600")}>
                    {formatCurrency(resultado)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Fôlego: <span className={cn("font-medium", saudeColors.text)}>{runway} meses</span>
                  </p>
                </div>
              </div>
              <div className={cn("p-2 rounded-full", saudeColors.bg)}>
                <HeartPulse className={cn("h-5 w-5", saudeColors.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* DSCR - Cobertura da Dívida */}
        <Card className="relative overflow-hidden">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground font-medium">DSCR</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px] text-xs">
                      <p>Índice de Cobertura (Receitas/Despesas). Acima de 1.5 = saudável. Entre 1.0-1.5 = atenção. Abaixo de 1.0 = crítico.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div>
                  <p className={cn("text-xl font-bold", dscrColors.text)}>
                    {dscr > 10 ? ">10x" : `${dscr.toFixed(2)}x`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dscr >= 1.5 ? "Saudável" : dscr >= 1.0 ? "Atenção" : "Crítico"}
                  </p>
                </div>
              </div>
              <div className={cn("p-2 rounded-full", dscrColors.bg)}>
                <Shield className={cn("h-5 w-5", dscrColors.text)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
