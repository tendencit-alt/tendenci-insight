import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface BudgetSummaryProps {
  totalCost: number;
  markupPercent: number;
  discountPercent: number;
}

export function BudgetSummary({ totalCost, markupPercent, discountPercent }: BudgetSummaryProps) {
  const grossPrice = totalCost * (1 + markupPercent / 100);
  const discountValue = grossPrice * (discountPercent / 100);
  const finalPrice = grossPrice - discountValue;
  const margin = finalPrice > 0 ? ((finalPrice - totalCost) / finalPrice) * 100 : 0;

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-lg mb-4">Resumo do Orçamento</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Custo Total</span>
          <span className="font-medium">
            R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Markup ({markupPercent}%)</span>
          <span className="font-medium text-green-600">
            + R$ {(grossPrice - totalCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Preço Bruto</span>
          <span className="font-medium">
            R$ {grossPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {discountPercent > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Desconto ({discountPercent}%)</span>
            <span className="font-medium text-red-600">
              - R$ {discountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        <Separator />

        <div className="flex justify-between items-center">
          <span className="font-semibold text-lg">Preço Final</span>
          <span className="font-bold text-xl text-primary">
            R$ {finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex justify-between items-center pt-2">
          <span className="text-sm text-muted-foreground">Lucro Bruto</span>
          <span className="text-sm font-medium">
            R$ {(finalPrice - totalCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Margem</span>
          <span className={`text-sm font-medium ${margin >= 30 ? 'text-green-600' : margin >= 20 ? 'text-yellow-600' : 'text-red-600'}`}>
            {margin.toFixed(1)}%
          </span>
        </div>
      </div>
    </Card>
  );
}
