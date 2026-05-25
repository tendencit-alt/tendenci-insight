import { useState, useEffect, useCallback } from "react";
import { CostCenterApportionmentPanel, ApportionmentItem } from "./CostCenterApportionmentPanel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DateBrInput } from "@/components/ui/date-br-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "./SearchableSelect";
import { CurrencyInput, parseCurrencyToNumber } from "@/components/ui/currency-input";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, AlertCircle, Plus } from "lucide-react";
import { useMinimizedDialogs } from '@/contexts/MinimizedDialogsContext';
import { MinimizeButton } from '@/components/ui/MinimizeButton';
import { QuickCreateClientDialog } from "./QuickCreateClientDialog";
import { cn } from "@/lib/utils";
import { createReceivableWithLedger } from "@/lib/financeiroIntegration";
import { useFinanceiroSync } from "@/hooks/useFinanceiroSync";

interface CreateReceivableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: {
    amount?: string;
    description?: string;
    due_date?: string;
    competence_date?: string;
  };
}

interface FormErrors {
  customer_id?: string;
  amount?: string;
  due_date?: string;
  competence_date?: string;
  chart_account_id?: string;
  cost_center_id?: string;
  project_id?: string;
  description?: string;
}

export function CreateReceivableDialog({ open, onOpenChange, onSuccess, initialData }: CreateReceivableDialogProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [isRateio, setIsRateio] = useState(false);
  const [apportionmentItems, setApportionmentItems] = useState<ApportionmentItem[]>([]);
  const { minimize: minimizeDialog, remove: removeMinimized } = useMinimizedDialogs();
  const [isMinimized, setIsMinimized] = useState(false);
  const { invalidateReceivables } = useFinanceiroSync();

  const handleMinimize = useCallback(() => {
    setIsMinimized(true);
    onOpenChange(false);
    minimizeDialog({
      id: 'create-receivable',
      label: 'Nova Conta a Receber',
      icon: '💰',
      route: '/financeiro',
      restore: () => { setIsMinimized(false); onOpenChange(true); },
    });
  }, [minimizeDialog, onOpenChange]);

  useEffect(() => {
    if (!open && !isMinimized) removeMinimized('create-receivable');
  }, [open, isMinimized, removeMinimized]);
  const [form, setForm] = useState({
    customer_id: "",
    amount: "",
    due_date: format(new Date(), "yyyy-MM-dd"),
    competence_date: format(new Date(), "yyyy-MM-dd"),
    chart_account_id: "",
    cost_center_id: "",
    project_id: "",
    description: "",
    document_number: "",
    installment: "1",
    total_installments: "1",
    notes: "",
  });

  // Apply initial data when dialog opens with prefilled data (e.g., from OFX import)
  useEffect(() => {
    if (open && initialData) {
      setForm(prev => ({
        ...prev,
        amount: initialData.amount || prev.amount,
        description: initialData.description || prev.description,
        due_date: initialData.due_date || prev.due_date,
        competence_date: initialData.competence_date || prev.competence_date,
      }));
    }
  }, [open, initialData]);

  const { data: clients } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: chartAccounts } = useQuery({
    queryKey: ["fin-chart-accounts-receita"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name")
        .eq("nature", "RECEITA")
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

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!form.customer_id) {
      newErrors.customer_id = "Cliente é obrigatório";
    }
    if (!form.amount || parseCurrencyToNumber(form.amount) <= 0) {
      newErrors.amount = "Valor é obrigatório e deve ser maior que zero";
    }
    if (!form.due_date) {
      newErrors.due_date = "Data de vencimento é obrigatória";
    }
    if (!form.competence_date) {
      newErrors.competence_date = "Data de competência é obrigatória";
    }
    if (!form.chart_account_id) {
      newErrors.chart_account_id = "Categoria é obrigatória";
    }
    if (!form.cost_center_id && !isRateio) {
      newErrors.cost_center_id = "Centro de Custo é obrigatório";
    }
    if (isRateio) {
      const totalPct = apportionmentItems.reduce((s, i) => s + i.percentage, 0);
      if (Math.abs(totalPct - 100) >= 0.01) {
        newErrors.cost_center_id = "O rateio deve totalizar 100%";
      }
    }
    if (!form.project_id) {
      newErrors.project_id = "Projeto é obrigatório";
    }
    if (!form.description?.trim()) {
      newErrors.description = "Descrição é obrigatória";
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      toast.error("Preencha todos os campos obrigatórios", {
        description: "Os campos marcados com * são obrigatórios",
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = await createReceivableWithLedger({
        customer_id: form.customer_id,
        amount: parseCurrencyToNumber(form.amount),
        due_date: form.due_date,
        competence_date: form.competence_date,
        chart_account_id: form.chart_account_id,
        cost_center_id: isRateio ? undefined : (form.cost_center_id || undefined),
        project_id: form.project_id || undefined,
        description: form.description,
        document_number: form.document_number || undefined,
        installment: parseInt(form.installment) || 1,
        total_installments: parseInt(form.total_installments) || 1,
        notes: form.notes || undefined,
      });

      // If rateio, mark ledger entry has_splits and insert splits
      if (isRateio && result.ledgerEntry?.id) {
        await supabase
          .from("fin_ledger_entries")
          .update({ has_splits: true })
          .eq("id", result.ledgerEntry.id);

        const splits = apportionmentItems
          .filter((item) => item.percentage > 0)
          .map((item) => ({
            parent_entry_id: result.ledgerEntry.id,
            cost_center_id: item.cost_center_id,
            percentage: item.percentage,
            amount: item.amount,
            description: form.description || "Rateio",
          }));

        if (splits.length > 0) {
          await supabase.from("fin_ledger_splits").insert(splits);
        }
      }

      toast.success("Conta a receber e lançamento criados com sucesso!");
      invalidateReceivables();
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error("Erro ao criar conta a receber: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      customer_id: "",
      amount: "",
      due_date: format(new Date(), "yyyy-MM-dd"),
      competence_date: format(new Date(), "yyyy-MM-dd"),
      chart_account_id: "",
      cost_center_id: "",
      project_id: "",
      description: "",
      document_number: "",
      installment: "1",
      total_installments: "1",
      notes: "",
    });
    setErrors({});
    setIsRateio(false);
    setApportionmentItems([]);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <MinimizeButton onClick={handleMinimize} absolute />
        <DialogHeader>
          <DialogTitle>Nova Conta a Receber</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Cliente <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <SearchableSelect
                    options={(clients || []).map(c => ({ value: c.id, label: c.name }))}
                    value={form.customer_id}
                    onChange={(v) => {
                      setForm({ ...form, customer_id: v });
                      if (errors.customer_id) setErrors({ ...errors, customer_id: undefined });
                    }}
                    placeholder="Selecione o cliente..."
                    searchPlaceholder="Buscar cliente..."
                    emptyMessage="Nenhum cliente encontrado."
                    className={cn(errors.customer_id && "border-destructive")}
                  />
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={() => setShowCreateClient(true)}
                  title="Criar novo cliente"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {errors.customer_id && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.customer_id}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Valor <span className="text-destructive">*</span>
              </Label>
              <CurrencyInput
                value={form.amount}
                onChange={(v) => {
                  setForm({ ...form, amount: v });
                  if (errors.amount) setErrors({ ...errors, amount: undefined });
                }}
                className={cn(errors.amount && "border-destructive")}
              />
              {errors.amount && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.amount}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Data de Vencimento <span className="text-destructive">*</span>
              </Label>
              <DateBrInput
                value={form.due_date}
                onChange={(e) =/> {
                  setForm({ ...form, due_date: e.target.value });
                  if (errors.due_date) setErrors({ ...errors, due_date: undefined });
                }}
                className={cn(errors.due_date && "border-destructive")}
              />
              {errors.due_date && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.due_date}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Data de Competência <span className="text-destructive">*</span>
              </Label>
              <DateBrInput
                value={form.competence_date}
                onChange={(e) =/> {
                  setForm({ ...form, competence_date: e.target.value });
                  if (errors.competence_date) setErrors({ ...errors, competence_date: undefined });
                }}
                className={cn(errors.competence_date && "border-destructive")}
              />
              {errors.competence_date && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.competence_date}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Categoria (Plano de Contas) <span className="text-destructive">*</span>
            </Label>
            <SearchableSelect
              options={(chartAccounts || []).map(a => ({ value: a.id, label: a.name, code: a.code }))}
              value={form.chart_account_id}
              onChange={(v) => {
                setForm({ ...form, chart_account_id: v });
                if (errors.chart_account_id) setErrors({ ...errors, chart_account_id: undefined });
              }}
              placeholder="Selecione a categoria..."
              searchPlaceholder="Buscar categoria..."
              emptyMessage="Nenhuma categoria encontrada."
              className={cn(errors.chart_account_id && "border-destructive")}
            />
            {errors.chart_account_id && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.chart_account_id}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Centro de Custo <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={isRateio ? "__RATEIO__" : form.cost_center_id} 
                onValueChange={(v) => {
                  if (v === "__RATEIO__") {
                    setIsRateio(true);
                    setForm({ ...form, cost_center_id: "" });
                  } else {
                    setIsRateio(false);
                    setApportionmentItems([]);
                    setForm({ ...form, cost_center_id: v });
                  }
                  if (errors.cost_center_id) setErrors({ ...errors, cost_center_id: undefined });
                }}
              >
                <SelectTrigger className={cn(errors.cost_center_id && "border-destructive")}>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {costCenters?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                  <SelectItem value="__RATEIO__">📊 Rateio entre Centros de Custo</SelectItem>
                </SelectContent>
              </Select>
              {errors.cost_center_id && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.cost_center_id}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Projeto <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={form.project_id} 
                onValueChange={(v) => {
                  setForm({ ...form, project_id: v });
                  if (errors.project_id) setErrors({ ...errors, project_id: undefined });
                }}
              >
                <SelectTrigger className={cn(errors.project_id && "border-destructive")}>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.project_id && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.project_id}
                </p>
              )}
            </div>
          </div>

          {isRateio && (
            <CostCenterApportionmentPanel
              totalAmount={parseCurrencyToNumber(form.amount)}
              items={apportionmentItems}
              onChange={setApportionmentItems}
            />
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Descrição <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Descrição do recebimento..."
              value={form.description}
              onChange={(e) => {
                setForm({ ...form, description: e.target.value });
                if (errors.description) setErrors({ ...errors, description: undefined });
              }}
              className={cn(errors.description && "border-destructive")}
            />
            {errors.description && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Nº Documento</Label>
              <Input
                placeholder="NF, Fatura..."
                value={form.document_number}
                onChange={(e) => setForm({ ...form, document_number: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Parcela</Label>
              <Input
                type="number"
                min="1"
                value={form.installment}
                onChange={(e) => setForm({ ...form, installment: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Total de Parcelas</Label>
              <Input
                type="number"
                min="1"
                value={form.total_installments}
                onChange={(e) => setForm({ ...form, total_installments: e.target.value })}
              />
            </div>
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
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Conta a Receber
          </Button>
        </DialogFooter>
      </DialogContent>

      <QuickCreateClientDialog
        open={showCreateClient}
        onOpenChange={setShowCreateClient}
        onCreated={(clientId) => {
          setForm({ ...form, customer_id: clientId });
          if (errors.customer_id) setErrors({ ...errors, customer_id: undefined });
        }}
      />
    </Dialog>
  );
}
