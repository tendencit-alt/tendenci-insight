
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { type CompromissoCategory, type CompromissoState } from "@/hooks/useCompromissosVendaCategories";
import { useOrderResponsibles } from "@/hooks/useOrderResponsibles";

interface OrderCompromissosCardProps {
  compromissos: CompromissoState[];
  onCompromissosChange: (compromissos: CompromissoState[]) => void;
  total: number;
  categories: CompromissoCategory[];
  isLoading?: boolean;
  disabled?: boolean;
}

export function OrderCompromissosCard({
  compromissos,
  onCompromissosChange,
  total,
  categories,
  isLoading = false,
  disabled = false,
}: OrderCompromissosCardProps) {
  const { responsibles, byChartAccount } = useOrderResponsibles(true);
  const activeResponsibles = responsibles.filter((r) => r.is_active);

  const getCategoryName = (chartAccountId: string) => {
    return categories.find((c) => c.id === chartAccountId)?.name ?? "—";
  };

  const getCategoryCode = (chartAccountId: string) => {
    return categories.find((c) => c.id === chartAccountId)?.code ?? "";
  };

  const updateCompromisso = (index: number, patch: Partial<CompromissoState>) => {
    const next = compromissos.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onCompromissosChange(next);
  };

  const atualizarPercentual = (index: number, novoPercentual: number) => {
    const percentualSeguro = isNaN(novoPercentual) ? 0 : Math.max(0, Math.min(100, novoPercentual));
    const novoValor = total * (percentualSeguro / 100);
    updateCompromisso(index, { percentual: percentualSeguro, valor: novoValor });
  };

  if (isLoading) {
    return (
      <Card className="p-4 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
        <Label className="font-medium flex items-center gap-2 mb-3">💰 Compromissos Sobre Venda</Label>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (categories.length === 0) {
    return (
      <Card className="p-4 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
        <Label className="font-medium flex items-center gap-2 mb-3">💰 Compromissos Sobre Venda</Label>
        <p className="text-sm text-muted-foreground text-center py-2">
          Nenhuma categoria cadastrada. Configure em Cadastros Financeiros → Compromissos Sobre Venda.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
      <div className="flex items-center justify-between mb-3">
        <Label className="font-medium flex items-center gap-2">
          💰 Compromissos Sobre Venda
        </Label>
      </div>

      <div className="space-y-3">
        {compromissos.map((comp, index) => (
          <div key={comp.chart_account_id} className="flex items-center gap-3 flex-wrap">
            <Switch
              checked={comp.habilitado}
              onCheckedChange={(checked) => updateCompromisso(index, { habilitado: checked })}
              disabled={disabled}
              className="shrink-0"
            />
            <div className="flex items-center gap-1.5 min-w-[140px]">
              <Badge variant="outline" className="text-[10px] font-mono shrink-0 px-1 py-0">
                {getCategoryCode(comp.chart_account_id)}
              </Badge>
              <span className="text-sm font-medium truncate">{getCategoryName(comp.chart_account_id)}</span>
            </div>
            {comp.habilitado && (
              <>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    className="h-8 w-20"
                    value={comp.percentual}
                    onChange={(e) => atualizarPercentual(index, Number(e.target.value))}
                    min={0}
                    max={100}
                    step={0.1}
                    disabled={disabled}
                  />
                  <Label className="text-xs text-muted-foreground">%</Label>
                </div>
                <div className="flex items-center gap-1">
                  <Label className="text-xs text-muted-foreground">R$</Label>
                  <Input
                    type="number"
                    className="h-8 w-24 bg-muted"
                    value={comp.valor.toFixed(2)}
                    readOnly
                    disabled
                  />
                </div>
                <Select
                  value={comp.responsavel_id || "_none"}
                  onValueChange={(v) => updateCompromisso(index, { responsavel_id: v === "_none" ? "" : v })}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8 w-40">
                    <SelectValue placeholder="Responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">-</SelectItem>
                    {(() => {
                      const matching = byChartAccount(comp.chart_account_id);
                      if (matching.length === 0) {
                        return (
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            Nenhum responsável cadastrado para este compromisso.
                          </div>
                        );
                      }
                      return matching.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
