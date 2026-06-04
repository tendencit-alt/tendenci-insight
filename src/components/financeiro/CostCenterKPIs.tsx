import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Settings2, 
  CheckCircle, 
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { CostCenterEntriesDialog, CostCenterDrillDownFilter } from "./CostCenterEntriesDialog";

interface CostCenterKPIsProps {
  filters: FinanceiroFiltersState;
}

interface CostCenterData {
  id: string;
  code: string;
  name: string;
  receitas: number;
  despesas: number;
  resultado: number;
  receitasRealizadas: number;
  despesasRealizadas: number;
  meta_receitas: number;
  meta_id: string | null;
  percentual_atingido: number;
}

export function CostCenterKPIs({ filters }: CostCenterKPIsProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCostCenter, setSelectedCostCenter] = useState<CostCenterData | null>(null);
  const [metaValue, setMetaValue] = useState("");
  const [drillDown, setDrillDown] = useState<CostCenterDrillDownFilter | null>(null);
  const queryClient = useQueryClient();
  const { activeTenantId } = useActiveTenant();

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const { data, isLoading } = useQuery({
    queryKey: ["fin-cost-center-kpis", filters, activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const dateFrom = filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : null;
      const dateTo = filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : null;

      // Get all active cost centers
      const { data: costCenters } = await supabase
        .from("fin_cost_centers")
        .select("id, code, name")
        .eq("tenant_id", activeTenantId!)
        .eq("active", true)
        .order("code");

      // Get ledger entries grouped by cost center - include entries without cash_date using competence_date
      let entriesQuery = supabase
        .from("fin_ledger_entries")
        .select("id, cost_center_id, type, amount, has_splits, status")
        .neq("status", "CANCELADO");

      if (dateFrom && dateTo) {
        entriesQuery = entriesQuery.or(`and(cash_date.gte.${dateFrom},cash_date.lte.${dateTo}),and(cash_date.is.null,competence_date.gte.${dateFrom},competence_date.lte.${dateTo})`);
      }

      const { data: entries } = await entriesQuery;

      // Resolve split entries: fetch all splits for entries with has_splits=true
      const splitParentIds = entries?.filter(e => e.has_splits === true).map(e => e.id) || [];
      let splitsMap = new Map<string, Array<{ cost_center_id: string; amount: number; type: string }>>();

      if (splitParentIds.length > 0) {
        const { data: splits } = await supabase
          .from("fin_ledger_splits")
          .select("parent_entry_id, cost_center_id, amount")
          .in("parent_entry_id", splitParentIds);

        splits?.forEach(s => {
          if (!s.cost_center_id) return;
          const parentEntry = entries?.find(e => e.id === s.parent_entry_id);
          if (!parentEntry) return;
          if (!splitsMap.has(s.parent_entry_id)) {
            splitsMap.set(s.parent_entry_id, []);
          }
          splitsMap.get(s.parent_entry_id)!.push({
            cost_center_id: s.cost_center_id,
            amount: Number(s.amount),
            type: parentEntry.type || "DESPESA",
          });
        });
      }

      // Get financial goals for cost centers
      const { data: goals } = await supabase
        .from("fin_financial_goals")
        .select("*")
        .eq("metric_key", "receitas")
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .not("cost_center_id", "is", null);

      // Calculate totals per cost center
      const costCenterMap = new Map<string, { receitas: number; despesas: number; receitasRealizadas: number; despesasRealizadas: number }>();
      
      const addToCC = (ccId: string, type: string | null, amount: number, isRealizado: boolean) => {
        if (!costCenterMap.has(ccId)) {
          costCenterMap.set(ccId, { receitas: 0, despesas: 0, receitasRealizadas: 0, despesasRealizadas: 0 });
        }
        const current = costCenterMap.get(ccId)!;
        if (type === "RECEITA") {
          current.receitas += amount;
          if (isRealizado) current.receitasRealizadas += amount;
        } else if (type === "DESPESA") {
          current.despesas += amount;
          if (isRealizado) current.despesasRealizadas += amount;
        }
      };

      entries?.forEach(entry => {
        const isRealizado = entry.status === "PAGO_RECEBIDO";
        if (entry.has_splits === true) {
          const splits = splitsMap.get(entry.id);
          splits?.forEach(split => {
            addToCC(split.cost_center_id, split.type, split.amount, isRealizado);
          });
        } else {
          // Se não tiver CC, usamos uma chave especial
          const ccId = entry.cost_center_id || "_sem_centro";
          addToCC(ccId, entry.type, Number(entry.amount), isRealizado);
        }
      });

      // Build cost center data with goals
      const mappedCCs: CostCenterData[] = (costCenters || []).map(cc => {
        const values = costCenterMap.get(cc.id) || { receitas: 0, despesas: 0, receitasRealizadas: 0, despesasRealizadas: 0 };
        const goal = goals?.find(g => g.cost_center_id === cc.id);
        const meta = goal?.target_amount || 0;
        const percentual = meta > 0 ? (values.receitas / meta) * 100 : 0;
        
        return {
          id: cc.id,
          code: cc.code,
          name: cc.name,
          receitas: values.receitas,
          despesas: values.despesas,
          resultado: values.receitas - values.despesas,
          receitasRealizadas: values.receitasRealizadas,
          despesasRealizadas: values.despesasRealizadas,
          meta_receitas: meta,
          meta_id: goal?.id || null,
          percentual_atingido: percentual,
        };
      });

      // Add "Não Classificados" if entries exist without CC
      const unclassifiedValues = costCenterMap.get("_sem_centro");
      if (unclassifiedValues && (unclassifiedValues.receitas > 0 || unclassifiedValues.despesas > 0)) {
        mappedCCs.push({
          id: "_sem_centro",
          code: "N/A",
          name: "Não Classificados",
          receitas: unclassifiedValues.receitas,
          despesas: unclassifiedValues.despesas,
          resultado: unclassifiedValues.receitas - unclassifiedValues.despesas,
          receitasRealizadas: unclassifiedValues.receitasRealizadas,
          despesasRealizadas: unclassifiedValues.despesasRealizadas,
          meta_receitas: 0,
          meta_id: null,
          percentual_atingido: 0,
        });
      }

      // Sort by receitas descending
      mappedCCs.sort((a, b) => b.receitas - a.receitas);

      // Calculate totals
      const totalReceitas = mappedCCs.reduce((sum, cc) => sum + cc.receitas, 0);
      const totalDespesas = mappedCCs.reduce((sum, cc) => sum + cc.despesas, 0);
      const totalReceitasRealizadas = mappedCCs.reduce((sum, cc) => sum + cc.receitasRealizadas, 0);
      const totalDespesasRealizadas = mappedCCs.reduce((sum, cc) => sum + cc.despesasRealizadas, 0);
      const totalMeta = mappedCCs.reduce((sum, cc) => sum + cc.meta_receitas, 0);

      return {
        costCenters: mappedCCs,
        totals: {
          receitas: totalReceitas,
          despesas: totalDespesas,
          receitasRealizadas: totalReceitasRealizadas,
          despesasRealizadas: totalDespesasRealizadas,
          resultado: totalReceitas - totalDespesas,
          meta: totalMeta,
          percentual: totalMeta > 0 ? (totalReceitas / totalMeta) * 100 : 0,
        },
      };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ costCenterId, metaId, value }: { costCenterId: string; metaId: string | null; value: number }) => {
      if (metaId) {
        // Update existing goal
        const { error } = await supabase
          .from("fin_financial_goals")
          .update({ target_amount: value, updated_at: new Date().toISOString() })
          .eq("id", metaId);
        if (error) throw error;
      } else {
        // Create new goal
        const { error } = await supabase
          .from("fin_financial_goals")
          .insert({
            cost_center_id: costCenterId,
            metric_key: "receitas",
            goal_type: "cost_center",
            target_amount: value,
            month: currentMonth,
            year: currentYear,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fin-cost-center-kpis"] });
      toast.success("Meta salva com sucesso!");
      setEditDialogOpen(false);
    },
    onError: () => {
      toast.error("Erro ao salvar meta");
    },
  });

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const getStatusColor = (percentual: number, hasMeta: boolean) => {
    if (!hasMeta) return "bg-muted";
    if (percentual >= 100) return "bg-green-500";
    if (percentual >= 75) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusBadge = (percentual: number, hasMeta: boolean) => {
    if (!hasMeta) return <Badge variant="outline" className="gap-1 text-card-foreground border-card-foreground/30"><Target className="h-3 w-3" /> Sem meta</Badge>;
    if (percentual >= 100) return <Badge className="bg-green-600 gap-1"><CheckCircle className="h-3 w-3" /> Atingida</Badge>;
    if (percentual >= 75) return <Badge className="bg-yellow-600 gap-1"><AlertTriangle className="h-3 w-3" /> Próximo</Badge>;
    return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Abaixo</Badge>;
  };

  const handleEditMeta = (cc: CostCenterData) => {
    setSelectedCostCenter(cc);
    setMetaValue(cc.meta_receitas.toString());
    setEditDialogOpen(true);
  };

  const handleSaveMeta = () => {
    if (!selectedCostCenter) return;
    const value = parseFloat(metaValue) || 0;
    saveMutation.mutate({
      costCenterId: selectedCostCenter.id,
      metaId: selectedCostCenter.meta_id,
      value,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 sm:h-5 sm:w-5" />
            KPIs por Centro de Custo
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Acompanhamento de metas de receita - {filters.dateFrom && filters.dateTo
              ? `${format(filters.dateFrom, "dd/MM/yyyy", { locale: ptBR })} a ${format(filters.dateTo, "dd/MM/yyyy", { locale: ptBR })}`
              : filters.dateFrom
                ? `a partir de ${format(filters.dateFrom, "dd/MM/yyyy", { locale: ptBR })}`
                : filters.dateTo
                  ? `até ${format(filters.dateTo, "dd/MM/yyyy", { locale: ptBR })}`
                  : "todo período"}
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <ArrowUpCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Receitas Total</p>
                <p className="text-sm sm:text-lg font-bold text-green-600">{formatCurrency(data?.totals.receitas || 0)}</p>
                <p className="text-[10px] text-muted-foreground">
                  Realizado: <span className="font-semibold text-foreground">{(data?.totals.receitas ? ((data.totals.receitasRealizadas / data.totals.receitas) * 100) : 0).toFixed(1)}%</span>
                  <span className="ml-1 text-muted-foreground/70">({formatCurrency(data?.totals.receitasRealizadas || 0)})</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-500/10">
                <ArrowDownCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Despesas Total</p>
                <p className="text-sm sm:text-lg font-bold text-red-600">{formatCurrency(data?.totals.despesas || 0)}</p>
                <p className="text-[10px] text-muted-foreground">
                  Realizado: <span className="font-semibold text-foreground">{(data?.totals.despesas ? ((data.totals.despesasRealizadas / data.totals.despesas) * 100) : 0).toFixed(1)}%</span>
                  <span className="ml-1 text-muted-foreground/70">({formatCurrency(data?.totals.despesasRealizadas || 0)})</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Meta Total</p>
                <p className="text-sm sm:text-lg font-bold">{formatCurrency(data?.totals.meta || 0)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Atingimento</p>
                <p className={cn(
                  "text-sm sm:text-lg font-bold",
                  (data?.totals.percentual || 0) >= 100 ? "text-green-600" : 
                  (data?.totals.percentual || 0) >= 75 ? "text-yellow-600" : "text-red-600"
                )}>
                  {(data?.totals.percentual || 0).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Center Cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data?.costCenters.map((cc) => (
          <Card 
            key={cc.id}
            className={cn(
              "relative overflow-hidden transition-all border-2",
              cc.meta_receitas > 0 && cc.percentual_atingido >= 100 && "border-green-500/50",
              cc.meta_receitas > 0 && cc.percentual_atingido >= 75 && cc.percentual_atingido < 100 && "border-yellow-500/50",
              cc.meta_receitas > 0 && cc.percentual_atingido < 75 && "border-red-500/50"
            )}
          >
            <CardHeader className="pb-2 pt-3 px-3 sm:px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <span className="text-muted-foreground font-mono text-xs">{cc.code}</span>
                  <span className="truncate">{cc.name}</span>
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0"
                  onClick={() => handleEditMeta(cc)}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-3 px-3 sm:px-4 space-y-3">
              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progresso</span>
                  {getStatusBadge(cc.percentual_atingido, cc.meta_receitas > 0)}
                </div>
                <Progress 
                  value={Math.min(cc.percentual_atingido, 100)} 
                  className="h-2"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{cc.percentual_atingido.toFixed(1)}%</span>
                  {cc.meta_receitas > 0 && (
                    <span>Meta: {formatCurrency(cc.meta_receitas)}</span>
                  )}
                </div>
              </div>

              {/* Values */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={(e) => { e.stopPropagation(); setDrillDown({ costCenterId: cc.id, costCenterName: `${cc.code} - ${cc.name}`, type: "receitas" }); }}
                  className="bg-green-500/10 rounded-md p-2 text-left hover:bg-green-500/20 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    Receitas
                  </div>
                  <p className="font-semibold text-green-600 truncate">{formatCurrency(cc.receitas)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Realizado: <span className="font-semibold text-foreground">{(cc.receitas > 0 ? (cc.receitasRealizadas / cc.receitas * 100) : 0).toFixed(1)}%</span>
                  </p>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDrillDown({ costCenterId: cc.id, costCenterName: `${cc.code} - ${cc.name}`, type: "despesas" }); }}
                  className="bg-red-500/10 rounded-md p-2 text-left hover:bg-red-500/20 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                    <TrendingDown className="h-3 w-3 text-red-600" />
                    Despesas
                  </div>
                  <p className="font-semibold text-red-600 truncate">{formatCurrency(cc.despesas)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Realizado: <span className="font-semibold text-foreground">{(cc.despesas > 0 ? (cc.despesasRealizadas / cc.despesas * 100) : 0).toFixed(1)}%</span>
                  </p>
                </button>
              </div>

              {/* Resultado */}
              <button
                onClick={() => setDrillDown({ costCenterId: cc.id, costCenterName: `${cc.code} - ${cc.name}`, type: "resultado" })}
                className={cn(
                  "rounded-md p-2 text-center w-full hover:opacity-80 transition-opacity cursor-pointer",
                  cc.resultado >= 0 ? "bg-green-500/10" : "bg-red-500/10"
                )}
              >
                <p className="text-xs text-muted-foreground mb-0.5">Resultado</p>
                <p className={cn(
                  "font-bold text-sm",
                  cc.resultado >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {cc.resultado >= 0 ? "+" : ""}{formatCurrency(cc.resultado)}
                </p>
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Meta Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Definir Meta de Receita
            </DialogTitle>
          </DialogHeader>
          {selectedCostCenter && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Centro de Custo</p>
                <p className="font-semibold">{selectedCostCenter.code} - {selectedCostCenter.name}</p>
              </div>
              <div className="space-y-2">
                <Label>Meta de Receita ({format(new Date(), "MMMM/yyyy", { locale: ptBR })})</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={metaValue}
                  onChange={(e) => setMetaValue(e.target.value)}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                <p>Receita atual: <span className="font-semibold text-green-600">{formatCurrency(selectedCostCenter.receitas)}</span></p>
                {parseFloat(metaValue) > 0 && (
                  <p>
                    Atingimento: <span className={cn(
                      "font-semibold",
                      (selectedCostCenter.receitas / parseFloat(metaValue)) * 100 >= 100 ? "text-green-600" : "text-yellow-600"
                    )}>
                      {((selectedCostCenter.receitas / parseFloat(metaValue)) * 100).toFixed(1)}%
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveMeta} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar Meta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {drillDown && (
        <CostCenterEntriesDialog
          key={`${drillDown.costCenterId}-${drillDown.type}`}
          filter={drillDown}
          dateFrom={filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : null}
          dateTo={filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : null}
          onClose={() => setDrillDown(null)}
        />
      )}
    </div>
  );
}
