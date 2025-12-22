import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, TrendingUp } from "lucide-react";

interface BudgetSummaryProps {
  totalCost: number;
  markupPercent: number;
  discountPercent: number;
}

export function BudgetSummary({ totalCost, markupPercent, discountPercent }: BudgetSummaryProps) {
  const markupValue = totalCost * (markupPercent / 100);
  const grossPrice = totalCost + markupValue;
  const discountValue = grossPrice * (discountPercent / 100);
  const finalPrice = grossPrice - discountValue;
  const margin = finalPrice > 0 ? ((finalPrice - totalCost) / finalPrice) * 100 : 0;
  const profit = finalPrice - totalCost;

  return (
    <Card className="p-6 bg-gradient-to-br from-background to-muted/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Resumo Comercial</h3>
        <TrendingUp className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Visual Flow */}
      <div className="flex items-center justify-between gap-2 p-4 rounded-lg bg-muted/50 mb-6">
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Custo Técnico</p>
          <p className="text-lg font-bold tabular-nums">
            R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">+ Markup {markupPercent}%</p>
          <p className="text-lg font-bold text-green-600 tabular-nums">
            + R$ {markupValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        {discountPercent > 0 && (
          <>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">- Desconto {discountPercent}%</p>
              <p className="text-lg font-bold text-red-600 tabular-nums">
                - R$ {discountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </>
        )}
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
        <div className="text-center p-3 rounded-lg bg-primary/10">
          <p className="text-xs text-primary uppercase tracking-wider font-medium">Preço Final</p>
          <p className="text-2xl font-bold text-primary tabular-nums">
            R$ {finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>
      
      <Separator className="my-4" />

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Lucro Bruto</p>
          <p className="text-lg font-semibold tabular-nums text-green-600">
            R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="text-center p-3 rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Margem</p>
          <p className={`text-lg font-semibold tabular-nums ${
            margin >= 30 ? 'text-green-600' : 
            margin >= 20 ? 'text-yellow-600' : 
            'text-red-600'
          }`}>
            {margin.toFixed(1)}%
          </p>
        </div>

        <div className="text-center p-3 rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Multiplicador</p>
          <p className="text-lg font-semibold tabular-nums">
            {totalCost > 0 ? (finalPrice / totalCost).toFixed(2) : '0.00'}x
          </p>
        </div>
      </div>

      <div className="mt-4 p-3 rounded-lg bg-muted/50 text-center">
        <p className="text-xs text-muted-foreground">
          Custo Técnico × {(1 + markupPercent / 100).toFixed(2)} 
          {discountPercent > 0 ? ` × ${(1 - discountPercent / 100).toFixed(2)}` : ''} = Preço Final
        </p>
      </div>
    </Card>
  );
}
