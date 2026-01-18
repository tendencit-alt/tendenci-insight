import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Loader2, Repeat, Info, Building2, Users } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CreateLedgerEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateLedgerEntryDialog({ open, onOpenChange, onSuccess }: CreateLedgerEntryDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: "DESPESA",
    description: "",
    amount: "",
    competence_date: format(new Date(), "yyyy-MM-dd"),
    cash_date: format(new Date(), "yyyy-MM-dd"),
    due_date: format(new Date(), "yyyy-MM-dd"),
    bank_account_id: "",
    chart_account_id: "",
    cost_center_id: "",
    project_id: "",
    payment_method: "",
    document_number: "",
    notes: "",
    // Supplier/Customer fields for integration
    supplier_id: "",
    customer_id: "",
    // Recurrence fields
    is_recurring: false,
    recurrence_type: "monthly" as "daily" | "weekly" | "monthly" | "yearly",
    recurrence_count: 12,
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
    queryKey: ["fin-chart-accounts-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name, nature")
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

  // Fetch suppliers for DESPESA
  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("active", true)
        .order("name");
      return data || [];
    },
  });

  // Fetch clients for RECEITA
  const { data: clients } = useQuery({
    queryKey: ["clients-list"],
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
    if (!form.type || !form.description || !form.amount || !form.competence_date) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    if (!form.chart_account_id) {
      toast.error("Selecione uma categoria (Plano de Contas) para que o lançamento apareça no DRE e Fluxo de Caixa");
      return;
    }

    if (!form.cost_center_id) {
      toast.error("Selecione um Centro de Custo");
      return;
    }

    if (!form.project_id) {
      toast.error("Selecione um Projeto");
      return;
    }

    if (form.is_recurring && (!form.recurrence_count || form.recurrence_count < 1)) {
      toast.error("Informe a quantidade de repetições");
      return;
    }

    setLoading(true);
    try {
      const amount = parseCurrencyToNumber(form.amount);
      const baseEntry = {
        type: form.type,
        description: form.description,
        amount,
        competence_date: form.competence_date,
        cash_date: form.cash_date || null,
        bank_account_id: form.bank_account_id || null,
        chart_account_id: form.chart_account_id || null,
        cost_center_id: form.cost_center_id || null,
        project_id: form.project_id || null,
        payment_method: form.payment_method || null,
        document_number: form.document_number || null,
        notes: form.notes || null,
        status: form.cash_date ? "PAGO_RECEBIDO" : "ABERTO",
        is_recurring: form.is_recurring,
        recurrence_type: form.is_recurring ? form.recurrence_type : null,
        recurrence_count: form.is_recurring ? form.recurrence_count : null,
      };

      // Helper function to create payable/receivable entries
      const createPayableReceivable = async (ledgerEntryId: string, dueDate: string, installmentNumber?: number, totalInstallments?: number) => {
        const docNumber = installmentNumber && totalInstallments 
          ? (form.document_number ? `${form.document_number} (${installmentNumber}/${totalInstallments})` : null)
          : form.document_number || null;

        if (form.type === "DESPESA" && form.supplier_id) {
          await supabase.from("fin_payables").insert({
            amount,
            description: form.description,
            due_date: dueDate,
            supplier_id: form.supplier_id,
            chart_account_id: form.chart_account_id || null,
            cost_center_id: form.cost_center_id || null,
            project_id: form.project_id || null,
            bank_account_id: form.bank_account_id || null,
            ledger_entry_id: ledgerEntryId,
            document_number: docNumber,
            notes: form.notes || null,
            status: form.cash_date ? "PAGO" : "ABERTO",
            payment_date: form.cash_date || null,
            paid_amount: form.cash_date ? amount : 0,
            installment: installmentNumber || null,
            total_installments: totalInstallments || null,
          });
        }

        if (form.type === "RECEITA" && form.customer_id) {
          await supabase.from("fin_receivables").insert({
            amount,
            description: form.description,
            due_date: dueDate,
            customer_id: form.customer_id,
            chart_account_id: form.chart_account_id || null,
            cost_center_id: form.cost_center_id || null,
            project_id: form.project_id || null,
            bank_account_id: form.bank_account_id || null,
            ledger_entry_id: ledgerEntryId,
            document_number: docNumber,
            notes: form.notes || null,
            status: form.cash_date ? "RECEBIDO" : "ABERTO",
            received_date: form.cash_date || null,
            received_amount: form.cash_date ? amount : 0,
            installment: installmentNumber || null,
            total_installments: totalInstallments || null,
          });
        }
      };

      if (form.is_recurring && form.recurrence_count > 1) {
        // Create the parent entry first
        const { data: parentEntry, error: parentError } = await supabase
          .from("fin_ledger_entries")
          .insert(baseEntry)
          .select("id")
          .single();

        if (parentError) throw parentError;

        // Create payable/receivable for parent entry
        await createPayableReceivable(parentEntry.id, form.due_date, 1, form.recurrence_count);

        // Create child entries for the remaining occurrences
        const childEntries = [];
        for (let i = 1; i < form.recurrence_count; i++) {
          const nextCompetenceDate = calculateNextDate(form.competence_date, form.recurrence_type, i);
          const nextCashDate = form.cash_date ? calculateNextDate(form.cash_date, form.recurrence_type, i) : null;
          
          childEntries.push({
            ...baseEntry,
            competence_date: nextCompetenceDate,
            cash_date: nextCashDate,
            parent_entry_id: parentEntry.id,
            document_number: form.document_number ? `${form.document_number} (${i + 1}/${form.recurrence_count})` : null,
            installment_number: i + 1,
            total_installments: form.recurrence_count,
            status: "ABERTO", // Child entries are always open initially
          });
        }

        if (childEntries.length > 0) {
          const { data: createdChildren, error: childError } = await supabase
            .from("fin_ledger_entries")
            .insert(childEntries)
            .select("id");
          
          if (childError) throw childError;

          // Create payables/receivables for child entries
          if (createdChildren && (form.supplier_id || form.customer_id)) {
            for (let i = 0; i < createdChildren.length; i++) {
              const nextDueDate = calculateNextDate(form.due_date, form.recurrence_type, i + 1);
              await createPayableReceivable(createdChildren[i].id, nextDueDate, i + 2, form.recurrence_count);
            }
          }
        }

        toast.success(`${form.recurrence_count} lançamentos criados com sucesso!`);
      } else {
        // Single entry
        const { data: createdEntry, error } = await supabase
          .from("fin_ledger_entries")
          .insert(baseEntry)
          .select("id")
          .single();
        
        if (error) throw error;

        // Create corresponding payable/receivable if supplier/customer is selected
        await createPayableReceivable(createdEntry.id, form.due_date);

        toast.success("Lançamento criado com sucesso!");
      }

      onSuccess();
      onOpenChange(false);
      setForm({
        type: "DESPESA",
        description: "",
        amount: "",
        competence_date: format(new Date(), "yyyy-MM-dd"),
        cash_date: format(new Date(), "yyyy-MM-dd"),
        due_date: format(new Date(), "yyyy-MM-dd"),
        bank_account_id: "",
        chart_account_id: "",
        cost_center_id: "",
        project_id: "",
        payment_method: "",
        document_number: "",
        notes: "",
        supplier_id: "",
        customer_id: "",
        is_recurring: false,
        recurrence_type: "monthly",
        recurrence_count: 12,
      });
    } catch (error: any) {
      toast.error("Erro ao criar lançamento: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Check if supplier/customer section should be shown
  const showSupplierSection = form.type === "DESPESA";
  const showCustomerSection = form.type === "RECEITA";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-visible">
        <DialogHeader>
          <DialogTitle>Novo Lançamento</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, chart_account_id: "", supplier_id: "", customer_id: "" })}>
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
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Supplier/Customer Section - Conditional based on type */}
          {(showSupplierSection || showCustomerSection) && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="flex items-center gap-2">
                {showSupplierSection ? (
                  <>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium">Vincular a Conta a Pagar</Label>
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium">Vincular a Conta a Receber</Label>
                  </>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px] text-xs">
                      <p>
                        {showSupplierSection 
                          ? "Ao selecionar um fornecedor, este lançamento também aparecerá na aba 'Contas a Pagar' com controle de vencimento."
                          : "Ao selecionar um cliente, este lançamento também aparecerá na aba 'Contas a Receber' com controle de vencimento."
                        }
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {showSupplierSection && (
                  <div className="space-y-2">
                    <Label>Fornecedor</Label>
                    <SearchableSelect
                      options={(suppliers || []).map(s => ({ value: s.id, label: s.name }))}
                      value={form.supplier_id}
                      onChange={(v) => setForm({ ...form, supplier_id: v })}
                      placeholder="Selecione o fornecedor..."
                      searchPlaceholder="Buscar fornecedor..."
                      emptyMessage="Nenhum fornecedor encontrado."
                    />
                  </div>
                )}

                {showCustomerSection && (
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <SearchableSelect
                      options={(clients || []).map(c => ({ value: c.id, label: c.name }))}
                      value={form.customer_id}
                      onChange={(v) => setForm({ ...form, customer_id: v })}
                      placeholder="Selecione o cliente..."
                      searchPlaceholder="Buscar cliente..."
                      emptyMessage="Nenhum cliente encontrado."
                    />
                  </div>
                )}

                {(form.supplier_id || form.customer_id) && (
                  <div className="space-y-2">
                    <Label>Data de Vencimento</Label>
                    <Input
                      type="date"
                      value={form.due_date}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {(form.supplier_id || form.customer_id) && (
                <p className="text-xs text-muted-foreground">
                  ✓ Este lançamento será automaticamente listado em "{showSupplierSection ? "Contas a Pagar" : "Contas a Receber"}"
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Competência *</Label>
              <Input
                type="date"
                value={form.competence_date}
                onChange={(e) => setForm({ ...form, competence_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Data de Caixa (Pagamento/Recebimento)</Label>
              <Input
                type="date"
                value={form.cash_date}
                onChange={(e) => setForm({ ...form, cash_date: e.target.value })}
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
                    {(form.supplier_id || form.customer_id) && (
                      <p className="mt-1 text-primary">
                        ✓ Também serão criados {form.recurrence_count} títulos em "{form.supplier_id ? "Contas a Pagar" : "Contas a Receber"}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

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
