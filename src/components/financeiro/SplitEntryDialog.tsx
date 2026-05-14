import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Split, 
  Plus, 
  Trash2, 
  AlertTriangle,
  Check,
  ArrowUpCircle,
  ArrowDownCircle,
  Calculator
} from "lucide-react";

interface LedgerEntry {
  id: string;
  description: string;
  amount: number;
  type: string;
  cash_date: string;
  competence_date: string;
  bank_account_id?: string;
  bank_account?: { nickname: string } | null;
  chart_account?: { name: string; code: string } | null;
}

interface SplitLine {
  id: string;
  description: string;
  amount: number;
  percentage: number;
  chart_account_id: string;
  cost_center_id: string;
}

interface SplitEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: LedgerEntry | null;
  onSuccess: () => void;
}

export function SplitEntryDialog({
  open,
  onOpenChange,
  entry,
  onSuccess,
}: SplitEntryDialogProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [splits, setSplits] = useState<SplitLine[]>([]);

  const totalAmount = entry ? Number(entry.amount) : 0;

  // Fetch chart accounts
  const { data: chartAccounts } = useQuery({
    queryKey: ["chart-accounts-split"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name, parent_id, nature")
        .eq("active", true)
        .order("code");
      return data || [];
    },
    enabled: open,
  });

  // Fetch cost centers
  const { data: costCenters } = useQuery({
    queryKey: ["cost-centers-split"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_cost_centers")
        .select("id, code, name")
        .eq("active", true)
        .order("name");
      return data || [];
    },
    enabled: open,
  });

  // Group chart accounts by parent
  const groupedChartAccounts = chartAccounts?.reduce((acc, account) => {
    if (!account.parent_id) {
      if (!acc[account.id]) {
        acc[account.id] = { parent: account, children: [] };
      } else {
        acc[account.id].parent = account;
      }
    } else {
      if (!acc[account.parent_id]) {
        acc[account.parent_id] = { parent: null, children: [account] };
      } else {
        acc[account.parent_id].children.push(account);
      }
    }
    return acc;
  }, {} as Record<string, { parent: any; children: any[] }>) || {};

  // Reset form when dialog opens
  useEffect(() => {
    if (open && entry) {
      // Start with 2 empty split lines
      setSplits([
        { id: crypto.randomUUID(), description: "", amount: 0, percentage: 0, chart_account_id: "", cost_center_id: "" },
        { id: crypto.randomUUID(), description: "", amount: 0, percentage: 0, chart_account_id: "", cost_center_id: "" },
      ]);
    }
  }, [open, entry]);

  const formatCurrency = (value: number) => {
    return Math.abs(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  // Calculate totals
  const splitTotal = splits.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const splitPercentage = splits.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0);
  const difference = totalAmount - splitTotal;
  const isBalanced = Math.abs(difference) < 0.01;

  // Add new split line
  const addSplitLine = () => {
    setSplits([
      ...splits,
      { id: crypto.randomUUID(), description: "", amount: 0, percentage: 0, chart_account_id: "", cost_center_id: "" },
    ]);
  };

  // Remove split line
  const removeSplitLine = (id: string) => {
    if (splits.length > 2) {
      setSplits(splits.filter((s) => s.id !== id));
    } else {
      toast.error("Mínimo de 2 linhas para desdobramento");
    }
  };

  // Update split line
  const updateSplitLine = (id: string, field: keyof SplitLine, value: string | number) => {
    setSplits(
      splits.map((s) => {
        if (s.id !== id) return s;

        const updated = { ...s, [field]: value };

        // If amount changed, recalculate percentage
        if (field === "amount" && totalAmount > 0) {
          updated.percentage = ((Number(value) || 0) / totalAmount) * 100;
        }

        // If percentage changed, recalculate amount
        if (field === "percentage" && totalAmount > 0) {
          updated.amount = (totalAmount * (Number(value) || 0)) / 100;
        }

        return updated;
      })
    );
  };

  // Distribute remaining value equally
  const distributeRemaining = () => {
    if (splits.length === 0) return;

    const equalAmount = totalAmount / splits.length;
    const equalPercentage = 100 / splits.length;

    setSplits(
      splits.map((s) => ({
        ...s,
        amount: equalAmount,
        percentage: equalPercentage,
      }))
    );
  };

  // Validate form
  const isFormValid = () => {
    if (!isBalanced) return false;
    if (splits.length < 2) return false;

    for (const split of splits) {
      if (!split.description.trim()) return false;
      if (!split.chart_account_id) return false;
      if (split.amount <= 0) return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!entry) return;

    if (!isBalanced) {
      toast.error("A soma dos valores deve ser igual ao valor original");
      return;
    }

    const invalidSplit = splits.find(
      (s) => !s.description.trim() || !s.chart_account_id || s.amount <= 0
    );
    if (invalidSplit) {
      toast.error("Preencha todos os campos obrigatórios em cada linha");
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert splits
      const splitsToInsert = splits.map((s) => ({
        parent_entry_id: entry.id,
        chart_account_id: s.chart_account_id,
        cost_center_id: s.cost_center_id || null,
        description: s.description,
        amount: s.amount,
        percentage: s.percentage,
      }));

      const { error: insertError } = await supabase
        .from("fin_ledger_splits")
        .insert(splitsToInsert);

      if (insertError) throw insertError;

      // Update parent entry to mark as having splits
      const { error: updateError } = await supabase
        .from("fin_ledger_entries")
        .update({ has_splits: true })
        .eq("id", entry.id);

      if (updateError) throw updateError;

      toast.success(`Lançamento desdobrado em ${splits.length} partes`);
      queryClient.invalidateQueries({ queryKey: ["ledger-entries"] });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error splitting entry:", error);
      toast.error("Erro ao desdobrar: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="h-5 w-5 text-primary" />
            Desdobrar Lançamento
          </DialogTitle>
          <DialogDescription>
            Divida o lançamento em múltiplas contas contábeis. A soma dos valores deve ser igual ao valor original.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Original entry summary */}
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Lançamento Original
              </Label>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {entry.type === "RECEITA" ? (
                    <ArrowUpCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <ArrowDownCircle className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium">{entry.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.competence_date &&
                        format(new Date(entry.competence_date), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      {entry.chart_account && ` • ${entry.chart_account.code} - ${entry.chart_account.name}`}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-lg px-3 py-1 ${
                    entry.type === "DESPESA"
                      ? "border-red-500 text-red-600"
                      : "border-green-500 text-green-600"
                  }`}
                >
                  {formatCurrency(totalAmount)}
                </Badge>
              </div>
            </div>

            {/* Split lines */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Desdobramentos
                </Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={distributeRemaining}
                    className="gap-1 text-xs"
                  >
                    <Calculator className="h-3 w-3" />
                    Distribuir Igual
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addSplitLine}
                    className="gap-1 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                    Adicionar Linha
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {splits.map((split, index) => (
                  <div
                    key={split.id}
                    className="rounded-lg border bg-background p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        Linha {index + 1}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSplitLine(split.id)}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        disabled={splits.length <= 2}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Description */}
                      <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor={`desc-${split.id}`} className="text-xs">
                          Descrição <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id={`desc-${split.id}`}
                          placeholder="Ex: CMV Mercadorias, ICMS, Juros..."
                          value={split.description}
                          onChange={(e) =>
                            updateSplitLine(split.id, "description", e.target.value)
                          }
                        />
                      </div>

                      {/* Chart Account */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          Plano de Conta <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={split.chart_account_id}
                          onValueChange={(v) =>
                            updateSplitLine(split.id, "chart_account_id", v)
                          }
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(groupedChartAccounts).map(
                              (group) =>
                                group.parent && (
                                  <div key={group.parent.id}>
                                    <SelectItem
                                      value={group.parent.id}
                                      className="font-semibold text-muted-foreground"
                                      disabled
                                    >
                                      {group.parent.code} - {group.parent.name}
                                    </SelectItem>
                                    {group.children.map((child) => (
                                      <SelectItem
                                        key={child.id}
                                        value={child.id}
                                        className="pl-6"
                                      >
                                        {child.code} - {child.name}
                                      </SelectItem>
                                    ))}
                                  </div>
                                )
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Cost Center */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Centro de Custo</Label>
                        <Select
                          value={split.cost_center_id}
                          onValueChange={(v) =>
                            updateSplitLine(split.id, "cost_center_id", v)
                          }
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="(Opcional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Nenhum</SelectItem>
                            {costCenters?.map((cc) => (
                              <SelectItem key={cc.id} value={cc.id}>
                                {cc.code ? `${cc.code} - ` : ""}{cc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Amount */}
                      <div className="space-y-1.5">
                        <Label htmlFor={`amount-${split.id}`} className="text-xs">
                          Valor (R$) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id={`amount-${split.id}`}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          value={split.amount || ""}
                          onChange={(e) =>
                            updateSplitLine(split.id, "amount", parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>

                      {/* Percentage */}
                      <div className="space-y-1.5">
                        <Label htmlFor={`perc-${split.id}`} className="text-xs">
                          Percentual (%)
                        </Label>
                        <Input
                          id={`perc-${split.id}`}
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0,00"
                          value={split.percentage ? split.percentage.toFixed(2) : ""}
                          onChange={(e) =>
                            updateSplitLine(split.id, "percentage", parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Summary / Validation */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Valor Original:</span>
                <span className="font-medium">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Soma dos Desdobramentos:</span>
                <span className={`font-medium ${isBalanced ? "text-green-600" : "text-amber-600"}`}>
                  {formatCurrency(splitTotal)} ({splitPercentage.toFixed(2)}%)
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-medium">Diferença:</span>
                <Badge
                  variant={isBalanced ? "default" : "destructive"}
                  className={isBalanced ? "bg-green-600" : ""}
                >
                  {isBalanced ? (
                    <span className="flex items-center gap-1">
                      <Check className="h-3 w-3" /> Balanceado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> {formatCurrency(difference)}
                    </span>
                  )}
                </Badge>
              </div>
            </div>

            {!isBalanced && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  A soma dos desdobramentos ({formatCurrency(splitTotal)}) deve ser igual ao valor original ({formatCurrency(totalAmount)}).
                  Diferença de {formatCurrency(Math.abs(difference))}.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !isFormValid()}
            className="gap-2"
          >
            <Split className="h-4 w-4" />
            {isSubmitting ? "Salvando..." : "Confirmar Desdobramento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
