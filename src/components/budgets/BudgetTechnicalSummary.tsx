import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Package, Wrench, Hammer, Settings2 } from "lucide-react";

interface ProductLine {
  line_type: string;
  quantity: number;
  unit_cost: number;
  unit: string;
  cost_ref_code: string | null;
}

interface BudgetTechnicalSummaryProps {
  products: Array<{
    id: string;
    name: string;
    total_cost: number | null;
  }>;
  allLines: ProductLine[];
  globalCosts: Array<{
    code: string;
    name: string;
    value: number;
    unit: string;
    category: string;
  }>;
}

const categoryConfig = {
  material: { label: "Materiais", icon: Package, color: "bg-blue-500/10 text-blue-600" },
  maquina: { label: "Máquinas", icon: Settings2, color: "bg-purple-500/10 text-purple-600" },
  mao_obra: { label: "Mão de Obra", icon: Hammer, color: "bg-orange-500/10 text-orange-600" },
  ferragem: { label: "Ferragens", icon: Wrench, color: "bg-green-500/10 text-green-600" },
};

export function BudgetTechnicalSummary({ products, allLines, globalCosts }: BudgetTechnicalSummaryProps) {
  const breakdown = useMemo(() => {
    const byType: Record<string, { total: number; count: number }> = {};
    const byInsumo: Record<string, { code: string; name: string; quantity: number; unit: string; totalCost: number }> = {};
    
    allLines.forEach(line => {
      // By type
      if (!byType[line.line_type]) {
        byType[line.line_type] = { total: 0, count: 0 };
      }
      byType[line.line_type].total += line.quantity * line.unit_cost;
      byType[line.line_type].count += 1;

      // By insumo
      if (line.cost_ref_code) {
        const globalCost = globalCosts.find(g => g.code === line.cost_ref_code);
        if (!byInsumo[line.cost_ref_code]) {
          byInsumo[line.cost_ref_code] = {
            code: line.cost_ref_code,
            name: globalCost?.name || line.cost_ref_code,
            quantity: 0,
            unit: line.unit,
            totalCost: 0
          };
        }
        byInsumo[line.cost_ref_code].quantity += line.quantity;
        byInsumo[line.cost_ref_code].totalCost += line.quantity * line.unit_cost;
      }
    });

    return { byType, byInsumo };
  }, [allLines, globalCosts]);

  const totalTecnico = Object.values(breakdown.byType).reduce((sum, t) => sum + t.total, 0);
  const hasManualCosts = allLines.some(l => !l.cost_ref_code);
  const manualCostsTotal = allLines
    .filter(l => !l.cost_ref_code)
    .reduce((sum, l) => sum + l.quantity * l.unit_cost, 0);

  return (
    <Card className="p-6 border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Custo Técnico Total</h3>
        <span className="text-3xl font-bold text-primary tabular-nums">
          R$ {totalTecnico.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      </div>

      {hasManualCosts && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 mb-4">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-700">
            <strong>R$ {manualCostsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> em custos manuais 
            (não atualizam automaticamente)
          </span>
        </div>
      )}

      <Separator className="my-4" />

      {/* Breakdown by Type */}
      <div className="space-y-3 mb-6">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Por Categoria
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(breakdown.byType).map(([type, data]) => {
            const config = categoryConfig[type as keyof typeof categoryConfig] || {
              label: type,
              icon: Package,
              color: "bg-gray-500/10 text-gray-600"
            };
            const Icon = config.icon;
            const percentage = totalTecnico > 0 ? (data.total / totalTecnico) * 100 : 0;

            return (
              <div key={type} className={`p-3 rounded-lg ${config.color}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4" />
                  <span className="font-medium text-sm">{config.label}</span>
                </div>
                <p className="text-lg font-bold tabular-nums">
                  R$ {data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs opacity-70">
                  {data.count} linhas · {percentage.toFixed(1)}%
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Insumos */}
      {Object.keys(breakdown.byInsumo).length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Principais Insumos Consumidos
          </h4>
          <div className="space-y-2">
            {Object.values(breakdown.byInsumo)
              .sort((a, b) => b.totalCost - a.totalCost)
              .slice(0, 5)
              .map(insumo => (
                <div key={insumo.code} className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {insumo.code}
                    </Badge>
                    <span className="text-sm">{insumo.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium tabular-nums">
                      {insumo.quantity.toLocaleString('pt-BR')} {insumo.unit}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      = R$ {insumo.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-dashed">
        <p className="text-xs text-muted-foreground text-center">
          💡 Altere os valores em <strong>Custos Base</strong> e todos os orçamentos serão recalculados automaticamente
        </p>
      </div>
    </Card>
  );
}
