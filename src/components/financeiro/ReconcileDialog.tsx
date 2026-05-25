import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DateBrInput } from "@/components/ui/date-br-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Check, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Link2, 
  FileText, 
  Building2,
  Calendar,
  AlertTriangle,
  Lock
} from "lucide-react";
import { useFinanceiroSync } from "@/hooks/useFinanceiroSync";
import { reconcileWithSync } from "@/lib/financeiroIntegration";
import { CurrencyInput, MoneyInput, parseCurrencyToNumber, formatToCurrencyDisplay } from "@/components/ui/currency-input";

interface LedgerEntry {
  id: string;
  description: string;
  amount: number;
  type: string;
  cash_date: string;
  bank_account_id?: string;
  bank_account?: { nickname: string } | null;
  chart_account?: { name: string; code: string } | null;
}

interface ReconcileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: LedgerEntry[];
  onSuccess: () => void;
}

export function ReconcileDialog({
  open,
  onOpenChange,
  entries,
  onSuccess,
}: ReconcileDialogProps) {
  const { invalidateReconciliation } = useFinanceiroSync();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reconcileMethod, setReconcileMethod] = useState<"manual" | "bank">("manual");
  const [documentNumber, setDocumentNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedBankTransactionId, setSelectedBankTransactionId] = useState<string>("");
  
  // New required fields for manual reconciliation
  const [dataMovimento, setDataMovimento] = useState("");
  const [contaBancariaId, setContaBancariaId] = useState("");
  const [chartAccountId, setChartAccountId] = useState("");
  const [vinculo, setVinculo] = useState("");
  const [jurosAtraso, setJurosAtraso] = useState<number>(0);
  
  // Partial payment fields
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [partialAmount, setPartialAmount] = useState("");

  // Get unique bank account ids from selected entries
  const bankAccountIds = [...new Set(entries.map((e) => e.bank_account_id).filter(Boolean))];

  // Fetch bank accounts
  const { data: bankAccounts } = useQuery({
    queryKey: ["bank-accounts-reconcile"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_bank_accounts")
        .select("id, nickname, bank_name")
        .eq("active", true)
        .order("nickname");
      return data || [];
    },
    enabled: open,
  });

  // Fetch chart accounts (grouped)
  const { data: chartAccounts } = useQuery({
    queryKey: ["chart-accounts-reconcile"],
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

  // Fetch pending bank transactions for matching
  const { data: bankTransactions } = useQuery({
    queryKey: ["pending-bank-transactions", bankAccountIds],
    queryFn: async () => {
      if (bankAccountIds.length === 0) return [];

      const { data } = await supabase
        .from("fin_bank_transactions")
        .select(`
          *,
          bank_account:fin_bank_accounts(nickname)
        `)
        .in("bank_account_id", bankAccountIds)
        .in("status", ["PENDENTE", "SUGERIDA"])
        .order("date", { ascending: false })
        .limit(50);

      return data || [];
    },
    enabled: open && bankAccountIds.length > 0,
  });

  // Auto payment date (today, non-editable)
  const dataPagamento = format(new Date(), "yyyy-MM-dd");
  const dataPagamentoFormatted = format(new Date(), "dd/MM/yyyy", { locale: ptBR });

  // Group chart accounts by parent
  const groupedChartAccounts = chartAccounts?.reduce((acc, account) => {
    if (!account.parent_id) {
      // This is a parent account
      if (!acc[account.id]) {
        acc[account.id] = { parent: account, children: [] };
      } else {
        acc[account.id].parent = account;
      }
    } else {
      // This is a child account
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
    if (open) {
      setReconcileMethod("manual");
      setDocumentNumber("");
      setNotes("");
      setSelectedBankTransactionId("");
      setDataMovimento("");
      setContaBancariaId("");
      setChartAccountId("");
      setVinculo("");
      setJurosAtraso(0);
      setIsPartialPayment(false);
      setPartialAmount("");
    }
  }, [open]);
  
  // Update partial amount when entries change
  useEffect(() => {
    if (open && entries.length > 0) {
      const total = entries.reduce((sum, e) => sum + Math.abs(Number(e.amount)), 0);
      setPartialAmount(formatToCurrencyDisplay(total));
    }
  }, [open, entries]);

  const totalAmount = entries.reduce((sum, e) => {
    const amt = Number(e.amount);
    return sum + (e.type === "DESPESA" ? -amt : amt);
  }, 0);

  const formatCurrency = (value: number) => {
    return Math.abs(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  // Validation for manual reconciliation
  const isManualFormValid = reconcileMethod === "manual" 
    ? dataMovimento && contaBancariaId && chartAccountId && vinculo && (!isPartialPayment || parseCurrencyToNumber(partialAmount) > 0)
    : true;
    
  // Calculate the amount being reconciled
  const totalEntryAmount = entries.reduce((sum, e) => sum + Math.abs(Number(e.amount)), 0);
  const reconcileAmount = isPartialPayment ? parseCurrencyToNumber(partialAmount) : totalEntryAmount;
  const isPartial = isPartialPayment && reconcileAmount < totalEntryAmount;

  const handleSubmit = async () => {
    // Validate required fields for manual reconciliation
    if (reconcileMethod === "manual") {
      if (!dataMovimento) {
        toast.error("Data do Movimento é obrigatória");
        return;
      }
      if (!contaBancariaId) {
        toast.error("Conta Bancária é obrigatória");
        return;
      }
      if (!chartAccountId) {
        toast.error("Plano de Conta é obrigatório");
        return;
      }
      if (!vinculo) {
        toast.error("Vínculo é obrigatório");
        return;
      }
      if (isPartialPayment && reconcileAmount <= 0) {
        toast.error("Valor a conciliar deve ser maior que zero");
        return;
      }
      if (isPartialPayment && reconcileAmount > totalEntryAmount) {
        toast.error("Valor a conciliar não pode ser maior que o valor total");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // For partial payments, we need to handle each entry individually
      if (isPartial && entries.length === 1) {
        const entry = entries[0];
        const originalAmount = Math.abs(Number(entry.amount));
        const remainingAmount = originalAmount - reconcileAmount;
        
        // Update the original entry with the partial amount as reconciled
        const updateData: any = {
          amount: reconcileAmount,
          reconciled: true,
          document_number: documentNumber || null,
          cash_date: dataPagamento,
          bank_account_id: contaBancariaId,
          chart_account_id: chartAccountId,
          juros_atraso: jurosAtraso || 0,
          notes: notes 
            ? `[Vínculo: ${vinculo}] [Pagamento Parcial] ${notes}` 
            : `[Vínculo: ${vinculo}] [Pagamento Parcial]`,
        };

        const { error: updateError } = await supabase
          .from("fin_ledger_entries")
          .update(updateData)
          .eq("id", entry.id);

        if (updateError) throw updateError;

        // Create a new entry for the remaining amount, linked to the original
        const { error: insertError } = await supabase
          .from("fin_ledger_entries")
          .insert({
            type: entry.type,
            description: `${entry.description} (Saldo pendente)`,
            amount: remainingAmount,
            competence_date: entry.cash_date,
            cash_date: null,
            bank_account_id: entry.bank_account_id,
            chart_account_id: chartAccountId || null,
            status: "PENDENTE",
            reconciled: false,
            parent_entry_id: entry.id, // Link to original entry for traceability
            notes: `Saldo restante de pagamento parcial - Vinculado ao lançamento #${entry.id.slice(0, 8)} - Original: ${formatCurrency(originalAmount)}, Pago: ${formatCurrency(reconcileAmount)}`,
          });

        if (insertError) throw insertError;
        
        toast.success(`Pagamento parcial de ${formatCurrency(reconcileAmount)} conciliado! Saldo de ${formatCurrency(remainingAmount)} pendente.`);
      } else {
        // Full reconciliation (original logic)
        const updateData: any = {
          reconciled: true,
          document_number: documentNumber || null,
          notes: notes ? (entries.length === 1 ? notes : `[Conciliação em lote] ${notes}`) : undefined,
        };

        // Add manual reconciliation fields
        if (reconcileMethod === "manual") {
          updateData.cash_date = dataPagamento;
          updateData.bank_account_id = contaBancariaId;
          updateData.chart_account_id = chartAccountId;
          updateData.juros_atraso = jurosAtraso || 0;
          updateData.notes = notes 
            ? `[Vínculo: ${vinculo}] ${notes}` 
            : `[Vínculo: ${vinculo}]`;
        }

        const { error: updateError } = await supabase
          .from("fin_ledger_entries")
          .update(updateData)
          .in("id", entries.map((e) => e.id));

        if (updateError) throw updateError;

        // If bank transaction was selected, create reconciliation link and update bank transaction
        if (reconcileMethod === "bank" && selectedBankTransactionId) {
          await supabase
            .from("fin_bank_transactions")
            .update({ status: "CONCILIADA" })
            .eq("id", selectedBankTransactionId);

          const links = entries.map((entry) => ({
            bank_transaction_id: selectedBankTransactionId,
            ledger_entry_id: entry.id,
            match_type: "MANUAL" as const,
          }));

          await supabase.from("fin_reconciliation_links").insert(links);
        }

        toast.success(`${entries.length} lançamento(s) conciliado(s) com sucesso!`);
      }

      invalidateReconciliation();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error reconciling entries:", error);
      toast.error("Erro ao conciliar: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            Conciliar Lançamentos
          </DialogTitle>
          <DialogDescription>
            Preencha as informações para conciliar{" "}
            {entries.length === 1
              ? "o lançamento selecionado"
              : `os ${entries.length} lançamentos selecionados`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Summary of selected entries */}
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Resumo dos Lançamentos
              </Label>
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between text-sm gap-2"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {entry.type === "RECEITA" ? (
                        <ArrowUpCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <ArrowDownCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      )}
                      <span className="truncate">{entry.description}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {entry.cash_date &&
                          format(new Date(entry.cash_date), "dd/MM", {
                            locale: ptBR,
                          })}
                      </span>
                      <span
                        className={`font-medium ${
                          entry.type === "DESPESA"
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {entry.type === "DESPESA" ? "-" : "+"}
                        {formatCurrency(Number(entry.amount))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span
                  className={totalAmount >= 0 ? "text-green-600" : "text-red-600"}
                >
                  {totalAmount >= 0 ? "+" : "-"}
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            {/* Reconciliation method */}
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Método de Conciliação
              </Label>
              <RadioGroup
                value={reconcileMethod}
                onValueChange={(v) => setReconcileMethod(v as "manual" | "bank")}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem
                    value="manual"
                    id="manual"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="manual"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <FileText className="mb-3 h-6 w-6" />
                    <span className="text-sm font-medium">Manual</span>
                    <span className="text-xs text-muted-foreground text-center">
                      Confirmar sem extrato bancário
                    </span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="bank"
                    id="bank"
                    className="peer sr-only"
                    disabled={!bankTransactions?.length}
                  />
                  <Label
                    htmlFor="bank"
                    className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary ${
                      !bankTransactions?.length
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                  >
                    <Link2 className="mb-3 h-6 w-6" />
                    <span className="text-sm font-medium">Com Extrato</span>
                    <span className="text-xs text-muted-foreground text-center">
                      Vincular a transação bancária
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Bank transaction selection */}
            {reconcileMethod === "bank" && bankTransactions && bankTransactions.length > 0 && (
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Selecionar Transação Bancária
                </Label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto rounded-lg border p-2">
                  {bankTransactions.map((txn) => {
                    const isSelected = selectedBankTransactionId === txn.id;
                    const amountMatch =
                      Math.abs(Number(txn.amount) - Math.abs(totalAmount)) < 0.01;

                    return (
                      <div
                        key={txn.id}
                        onClick={() => setSelectedBankTransactionId(txn.id)}
                        className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary/10 border-primary border"
                            : "bg-muted/50 hover:bg-muted border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium truncate max-w-[200px]">
                              {txn.bank_memo || "Sem descrição"}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(txn.date), "dd/MM/yyyy", {
                                locale: ptBR,
                              })}
                              <span>•</span>
                              <span>{txn.bank_account?.nickname}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {amountMatch && (
                            <Badge className="bg-green-600 text-xs">
                              Valor igual
                            </Badge>
                          )}
                          <span
                            className={`font-medium ${
                              txn.direction === "OUT"
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {txn.direction === "OUT" ? "-" : "+"}
                            {formatCurrency(Number(txn.amount))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {reconcileMethod === "bank" && !selectedBankTransactionId && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Selecione uma transação bancária para vincular
                  </p>
                )}
              </div>
            )}

            {/* Manual reconciliation fields */}
            {reconcileMethod === "manual" && (
              <>
                <Separator />
                <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Informações da Conciliação Manual
                  </Label>

                  {/* Alert for missing document */}
                  {!documentNumber && (
                    <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-700 dark:text-amber-400 text-sm">
                        Conciliação sem documento de referência. Recomenda-se incluir para auditoria.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Partial Payment Option - Only for single entries */}
                  {entries.length === 1 && (
                    <div className="space-y-3 p-3 rounded-lg border bg-background">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="partialPayment"
                          checked={isPartialPayment}
                          onCheckedChange={(checked) => setIsPartialPayment(checked === true)}
                        />
                        <Label htmlFor="partialPayment" className="text-sm font-medium cursor-pointer">
                          Pagamento Parcial
                        </Label>
                      </div>
                      
                      {isPartialPayment && (
                        <div className="space-y-2 pl-6">
                          <Label className="flex items-center gap-1">
                            Valor a Conciliar <span className="text-red-500">*</span>
                          </Label>
                          <CurrencyInput
                            value={partialAmount}
                            onChange={setPartialAmount}
                          />
                          <p className="text-xs text-muted-foreground">
                            Valor total: {formatCurrency(totalEntryAmount)} — Restante: {formatCurrency(totalEntryAmount - parseCurrencyToNumber(partialAmount))}
                          </p>
                          {parseCurrencyToNumber(partialAmount) > totalEntryAmount && (
                            <p className="text-xs text-destructive">
                              O valor não pode ser maior que o total
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Data de Pagamento/Recebimento - Auto and locked */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                      Data de Pagamento / Recebimento
                    </Label>
                    <Input
                      value={dataPagamentoFormatted}
                      disabled
                      className="bg-muted cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground">
                      Data automática do sistema (não editável)
                    </p>
                  </div>

                  {/* Data do Movimento - Required */}
                  <div className="space-y-2">
                    <Label htmlFor="dataMovimento" className="flex items-center gap-1">
                      Data do Movimento
                      <span className="text-red-500">*</span>
                    </Label>
                    <DateBrInput
                      id="dataMovimento"
                      value={dataMovimento}
                      onChange={(iso) => setDataMovimento(iso)}
                      required
                    />
                  </div>

                  {/* Conta Bancária - Required */}
                  <div className="space-y-2">
                    <Label htmlFor="contaBancaria" className="flex items-center gap-1">
                      Conta Bancária
                      <span className="text-red-500">*</span>
                    </Label>
                    <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a conta bancária" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts?.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.nickname} {account.bank_name && `(${account.bank_name})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Plano de Conta (Grupo e Subgrupo) - Required */}
                  <div className="space-y-2">
                    <Label htmlFor="chartAccount" className="flex items-center gap-1">
                      Plano de Conta (Grupo / Subgrupo)
                      <span className="text-red-500">*</span>
                    </Label>
                    <Select value={chartAccountId} onValueChange={setChartAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o plano de conta" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(groupedChartAccounts).map((group) => (
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
                                <SelectItem key={child.id} value={child.id} className="pl-6">
                                  {child.code} - {child.name}
                                </SelectItem>
                              ))}
                            </div>
                          )
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Vínculo - Required */}
                  <div className="space-y-2">
                    <Label htmlFor="vinculo" className="flex items-center gap-1">
                      Vínculo
                      <span className="text-red-500">*</span>
                    </Label>
                    <Select value={vinculo} onValueChange={setVinculo}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o vínculo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cliente">Cliente</SelectItem>
                        <SelectItem value="fornecedor">Fornecedor</SelectItem>
                        <SelectItem value="funcionario">Funcionário</SelectItem>
                        <SelectItem value="socio">Sócio</SelectItem>
                        <SelectItem value="banco">Banco / Instituição Financeira</SelectItem>
                        <SelectItem value="governo">Governo / Impostos</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Juros por Atraso */}
                  <div className="space-y-2">
                    <Label htmlFor="jurosAtraso">
                      Juros por Atraso (R$)
                    </Label>
                    <MoneyInput
                      id="jurosAtraso"
                      value={jurosAtraso || 0}
                      onChange={setJurosAtraso}
                    />
                    <p className="text-xs text-muted-foreground">
                      Informe se houve cobrança de juros por atraso no pagamento
                    </p>
                  </div>
                  
                  {/* Document Number */}
                  <div className="space-y-2">
                    <Label htmlFor="documentNumber">
                      Número do Documento / Referência
                    </Label>
                    <Input
                      id="documentNumber"
                      placeholder="Ex: NF 12345, TED 98765, PIX..."
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações da Conciliação</Label>
                    <Textarea
                      id="notes"
                      placeholder="Adicione observações sobre esta conciliação..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Bank reconciliation - additional fields */}
            {reconcileMethod === "bank" && selectedBankTransactionId && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="documentNumber">
                      Número do Documento / Referência (opcional)
                    </Label>
                    <Input
                      id="documentNumber"
                      placeholder="Ex: NF 12345, TED 98765, PIX..."
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações (opcional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Adicione observações sobre esta conciliação..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              (reconcileMethod === "bank" && !selectedBankTransactionId) ||
              (reconcileMethod === "manual" && !isManualFormValid)
            }
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4" />
            {isSubmitting ? "Conciliando..." : "Confirmar Conciliação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
