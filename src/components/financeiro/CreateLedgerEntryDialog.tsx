import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DateBrInput } from "@/components/ui/date-br-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect } from "./SearchableSelect";
import { CurrencyInput, parseCurrencyToNumber } from "@/components/ui/currency-input";
import { toast } from "sonner";
import { format, addDays, addWeeks, addMonths, addYears } from "date-fns";
import { Loader2, Repeat, Info, Link2 } from "lucide-react";
import { useMinimizedDialogs } from '@/contexts/MinimizedDialogsContext';
import { MinimizeButton } from '@/components/ui/MinimizeButton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFinanceiroSync } from "@/hooks/useFinanceiroSync";
import { createLedgerEntryWithIntegration } from "@/lib/financeiroIntegration";
import { validateAndShowErrors, ValidationRule } from "@/lib/formValidation";
import { useClassifyEntry } from "@/hooks/useClassifyEntry";
import { ClassificationSuggestionPanel } from "./ClassificationSuggestionPanel";

interface CreateLedgerEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateLedgerEntryDialog({ open, onOpenChange, onSuccess }: CreateLedgerEntryDialogProps) {
  const [loading, setLoading] = useState(false);
  const { minimize: minimizeDialog, remove: removeMinimized } = useMinimizedDialogs();
  const [isMinimized, setIsMinimized] = useState(false);
  const { invalidateLedger } = useFinanceiroSync();
  const { classify, result: classificationResult, loading: classifying, clearResult } = useClassifyEntry();
  const classifyTimer = useRef<ReturnType<typeof setTimeout>>();

  // Debounced classification trigger
  const triggerClassification = useCallback((desc: string, type: string, partyId?: string) => {
    clearResult();
    if (classifyTimer.current) clearTimeout(classifyTimer.current);
    if (desc.length < 4) return;
    classifyTimer.current = setTimeout(() => {
      classify({
        description: desc,
        amount: 0,
        type,
        party_id: partyId || undefined,
        origin: "manual",
      });
    }, 600);
  }, [classify, clearResult]);

  const handleApplySuggestion = useCallback((suggestion: any) => {
    setForm(prev => ({
      ...prev,
      chart_account_id: suggestion.chart_account_id || prev.chart_account_id,
      cost_center_id: suggestion.cost_center_id || prev.cost_center_id,
      project_id: suggestion.project_id || prev.project_id,
    }));
    toast.success("Sugestão aplicada");
  }, []);

  const handleMinimize = useCallback(() => {
    setIsMinimized(true);
    onOpenChange(false);
    minimizeDialog({
      id: 'create-ledger-entry',
      label: 'Novo Lançamento',
      icon: '📒',
      route: '/financeiro',
      restore: () => { setIsMinimized(false); onOpenChange(true); },
    });
  }, [minimizeDialog, onOpenChange]);

  useEffect(() => {
    if (!open && !isMinimized) removeMinimized('create-ledger-entry');
  }, [open, isMinimized, removeMinimized]);
  const [form, setForm] = useState({
    type: "DESPESA",
    description: "",
    amount: "",
    competence_date: format(new Date(), "yyyy-MM-dd"),
    cash_date: "",
    bank_account_id: "",
    chart_account_id: "",
    cost_center_id: "",
    project_id: "",
    payment_method: "",
    document_number: "",
    notes: "",
    // Recurrence fields
    is_recurring: false,
    recurrence_type: "monthly" as "daily" | "weekly" | "monthly" | "yearly",
    recurrence_count: 12,
    // Integration fields - always create linked record
    party_id: "",
    party_type: "supplier" as "" | "supplier" | "client",
    due_date: format(new Date(), "yyyy-MM-dd"),
  });

  const { data: bankAccounts } = useQuery({
    queryKey: ["fin-bank-accounts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_bank_accounts")
        .select("id, nickname")
        .eq("active", true)
        .order("nickname");
      return data || [];
    },
  });

  const { data: chartAccounts } = useQuery({
    queryKey: ["fin-chart-accounts-options"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name, nature")
        .not("tenant_id", "is", null)
        .eq("active", true)
        .order("code");
      return data || [];
    },
  });

  const { data: costCenters } = useQuery({
    queryKey: ["fin-cost-centers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_cost_centers")
        .select("id, name")
        .eq("active", true)
        .order("name");
      return data || [];
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["fin-projects"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_projects")
        .select("id, name")
        .eq("status", "ativo")
        .order("name");
      return data || [];
    },
  });

  // Fetch suppliers for linking
  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-ledger"],
    queryFn: async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("id, name")
        .order("name");
      return data || [];
    },
  });

  // Fetch clients for linking
  const { data: clients } = useQuery({
    queryKey: ["clients-ledger"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");
      return data || [];
    },
  });

  // Filter chart accounts based on type
  const filteredChartAccounts = chartAccounts?.filter((a) => {
    if (form.type === "RECEITA") return a.nature === "RECEITA";
    if (form.type === "DESPESA") return a.nature === "DESPESA";
    return true;
  });

  // Calculate next date based on recurrence type
  const calculateNextDate = (baseDate: string, recurrenceType: string, index: number): string => {
    const date = new Date(baseDate);
    switch (recurrenceType) {
      case "daily":
        return format(addDays(date, index), "yyyy-MM-dd");
      case "weekly":
        return format(addWeeks(date, index), "yyyy-MM-dd");
      case "monthly":
        return format(addMonths(date, index), "yyyy-MM-dd");
      case "yearly":
        return format(addYears(date, index), "yyyy-MM-dd");
      default:
        return format(addMonths(date, index), "yyyy-MM-dd");
    }
  };

  const getRecurrenceLabel = (type: string) => {
    switch (type) {
      case "daily": return "dias";
      case "weekly": return "semanas";
      case "monthly": return "meses";
      case "yearly": return "anos";
      default: return "meses";
    }
  };

  const handleSubmit = async () => {
    // Validação com mensagens detalhadas
    const validationRules: ValidationRule[] = [
      { field: "type", label: "Tipo", required: true },
      { field: "description", label: "Descrição", required: true, minLength: 3 },
      { field: "amount", label: "Valor", required: true },
      { field: "competence_date", label: "Data de Competência", required: true },
      { field: "chart_account_id", label: "Categoria (Plano de Contas)", required: true },
      { field: "cost_center_id", label: "Centro de Custo", required: true },
      { field: "project_id", label: "Projeto", required: true },
    ];

    // Validar campos de recorrência
    if (form.is_recurring) {
      validationRules.push({
        field: "recurrence_count",
        label: "Quantidade de Repetições",
        required: true,
        min: 1,
      });
    }

    // Validar campos de vínculo para DESPESA/RECEITA
    if (form.type === "DESPESA" || form.type === "RECEITA") {
      validationRules.push(
        { 
          field: "party_id", 
          label: form.type === "DESPESA" ? "Fornecedor" : "Cliente", 
          required: true 
        },
        { field: "due_date", label: "Data de Vencimento", required: true }
      );
    }

    if (!validateAndShowErrors(form, validationRules)) {
      return;
    }

    setLoading(true);
    try {
      // Always create linked record for DESPESA/RECEITA
      const shouldCreateLinked = form.type === "DESPESA" || form.type === "RECEITA";
      
      if (form.is_recurring && form.recurrence_count > 1) {
        // Create recurring entries with integration
        for (let i = 0; i < form.recurrence_count; i++) {
          const nextCompetenceDate = calculateNextDate(form.competence_date, form.recurrence_type, i);
          const nextCashDate = form.cash_date ? calculateNextDate(form.cash_date, form.recurrence_type, i) : null;
          const nextDueDate = shouldCreateLinked ? calculateNextDate(form.due_date, form.recurrence_type, i) : undefined;

          await createLedgerEntryWithIntegration(
            {
              type: form.type,
              description: form.description,
              amount: parseCurrencyToNumber(form.amount),
              competence_date: nextCompetenceDate,
              cash_date: nextCashDate,
              bank_account_id: form.bank_account_id || null,
              chart_account_id: form.chart_account_id || null,
              cost_center_id: form.cost_center_id || null,
              project_id: form.project_id || null,
              payment_method: form.payment_method || null,
              document_number: form.document_number ? `${form.document_number} (${i + 1}/${form.recurrence_count})` : null,
              notes: form.notes || null,
              party_id: shouldCreateLinked ? form.party_id : null,
              party_type: shouldCreateLinked ? form.party_type : null,
            },
            shouldCreateLinked,
            nextDueDate
          );
        }
        const linkedType = form.type === "DESPESA" ? "Contas a Pagar" : "Contas a Receber";
        toast.success(`${form.recurrence_count} lançamentos e ${linkedType} criados com sucesso!`);
      } else {
        // Single entry with integration
        await createLedgerEntryWithIntegration(
          {
            type: form.type,
            description: form.description,
            amount: parseCurrencyToNumber(form.amount),
            competence_date: form.competence_date,
            cash_date: form.cash_date || null,
            bank_account_id: form.bank_account_id || null,
            chart_account_id: form.chart_account_id || null,
            cost_center_id: form.cost_center_id || null,
            project_id: form.project_id || null,
            payment_method: form.payment_method || null,
            document_number: form.document_number || null,
            notes: form.notes || null,
            party_id: shouldCreateLinked ? form.party_id : null,
            party_type: shouldCreateLinked ? form.party_type : null,
          },
          shouldCreateLinked,
          form.due_date
        );
        
        if (shouldCreateLinked) {
          const linkedType = form.type === "DESPESA" ? "Conta a Pagar" : "Conta a Receber";
          toast.success(`Lançamento e ${linkedType} criados com sucesso!`);
        } else {
          toast.success("Lançamento criado com sucesso!");
        }
      }

      invalidateLedger();
      onSuccess();
      onOpenChange(false);
      setForm({
        type: "DESPESA",
        description: "",
        amount: "",
        competence_date: format(new Date(), "yyyy-MM-dd"),
        cash_date: "",
        bank_account_id: "",
        chart_account_id: "",
        cost_center_id: "",
        project_id: "",
        payment_method: "",
        document_number: "",
        notes: "",
        is_recurring: false,
        recurrence_type: "monthly",
        recurrence_count: 12,
        party_id: "",
        party_type: "supplier",
        due_date: format(new Date(), "yyyy-MM-dd"),
      });
    } catch (error: any) {
      toast.error("Erro ao criar lançamento: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-visible">
        <MinimizeButton onClick={handleMinimize} absolute />
        <DialogHeader>
          <DialogTitle>Novo Lançamento</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, chart_account_id: "" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEITA">Receita</SelectItem>
                  <SelectItem value="DESPESA">Despesa</SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                  <SelectItem value="AJUSTE">Ajuste</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor *</Label>
              <CurrencyInput
                value={form.amount}
                onChange={(v) => setForm({ ...form, amount: v })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input
              placeholder="Descrição do lançamento..."
              value={form.description}
              onChange={(e) => {
                const desc = e.target.value;
                setForm({ ...form, description: desc });
                triggerClassification(desc, form.type, form.party_id || undefined);
              }}
            />
          </div>

          {/* Classification suggestion */}
          {(classifying || classificationResult) && (
            <ClassificationSuggestionPanel
              suggestions={classificationResult?.suggestions || []}
              bestSuggestion={classificationResult?.best_suggestion || null}
              status={classificationResult?.status || "pending"}
              loading={classifying}
              onApply={handleApplySuggestion}
              onDismiss={clearResult}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Competência *</Label>
              <DateBrInput
                value={form.competence_date}
                onChange={(iso) => setForm({ ...form, competence_date: iso })}
              />
            </div>

            <div className="space-y-2">
              <Label>Data de Caixa (Pagamento/Recebimento)</Label>
              <DateBrInput
                value={form.cash_date}
                onChange={(iso) => setForm({ ...form, cash_date: iso })}
              />
            </div>
          </div>

          {/* Recurrence Section */}
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="is_recurring" className="font-medium">Lançamento Recorrente</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px] text-xs">
                      <p>Cria automaticamente múltiplos lançamentos com as mesmas características, distribuídos ao longo do período selecionado.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                id="is_recurring"
                checked={form.is_recurring}
                onCheckedChange={(checked) => setForm({ ...form, is_recurring: checked })}
              />
            </div>

            {form.is_recurring && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label>Período</Label>
                  <Select
                    value={form.recurrence_type}
                    onValueChange={(v) => setForm({ ...form, recurrence_type: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Repetir por</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      value={form.recurrence_count}
                      onChange={(e) => setForm({ ...form, recurrence_count: parseInt(e.target.value) || 1 })}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">
                      {getRecurrenceLabel(form.recurrence_type)}
                    </span>
                  </div>
                </div>

                {form.recurrence_count > 1 && (
                  <div className="col-span-2 text-xs text-muted-foreground bg-background p-2 rounded border">
                    <p>
                      Serão criados <strong>{form.recurrence_count} lançamentos</strong> de{" "}
                      <strong>R$ {form.amount || "0,00"}</strong> cada, totalizando{" "}
                      <strong>
                        R$ {(parseCurrencyToNumber(form.amount) * form.recurrence_count).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </strong>
                    </p>
                    <p className="mt-1">
                      Último lançamento em:{" "}
                      <strong>
                        {format(
                          new Date(calculateNextDate(form.competence_date, form.recurrence_type, form.recurrence_count - 1)),
                          "dd/MM/yyyy"
                        )}
                      </strong>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Integration Section - MANDATORY Payable/Receivable for DESPESA/RECEITA */}
          {(form.type === "DESPESA" || form.type === "RECEITA") && (
            <div className="border rounded-lg p-4 space-y-4 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                <Label className="font-medium text-primary">
                  {form.type === "DESPESA" ? "Conta a Pagar (Obrigatório)" : "Conta a Receber (Obrigatório)"}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px] text-xs">
                      <p>Todo lançamento de {form.type === "DESPESA" ? "despesa" : "receita"} gera automaticamente uma {form.type === "DESPESA" ? "conta a pagar" : "conta a receber"} vinculada.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{form.type === "DESPESA" ? "Fornecedor *" : "Cliente *"}</Label>
                  <Select 
                    value={form.party_id} 
                    onValueChange={(v) => setForm({ ...form, party_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {form.type === "DESPESA" 
                        ? suppliers?.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))
                        : clients?.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Data de Vencimento *</Label>
                  <DateBrInput
                    value={form.due_date}
                    onChange={(iso) => setForm({ ...form, due_date: iso })}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Conta Bancária</Label>
              <Select value={form.bank_account_id} onValueChange={(v) => setForm({ ...form, bank_account_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nickname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Categoria (Plano de Contas) *</Label>
            <SearchableSelect
              options={(filteredChartAccounts || []).map(a => ({ value: a.id, label: a.name, code: a.code }))}
              value={form.chart_account_id}
              onChange={(v) => setForm({ ...form, chart_account_id: v })}
              placeholder="Selecione a categoria..."
              searchPlaceholder="Buscar categoria..."
              emptyMessage="Nenhuma categoria encontrada."
            />
            <p className="text-xs text-muted-foreground">Obrigatório para aparecer no DRE e Fluxo de Caixa</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Centro de Custo *</Label>
              <Select value={form.cost_center_id} onValueChange={(v) => setForm({ ...form, cost_center_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {costCenters?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Projeto *</Label>
              <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nº Documento</Label>
            <Input
              placeholder="NF, Boleto, Recibo..."
              value={form.document_number}
              onChange={(e) => setForm({ ...form, document_number: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              placeholder="Observações adicionais..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {form.is_recurring && form.recurrence_count > 1 
              ? `Criar ${form.recurrence_count} Lançamentos` 
              : "Criar Lançamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
