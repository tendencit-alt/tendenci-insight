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
  AlertTriangle 
} from "lucide-react";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reconcileMethod, setReconcileMethod] = useState<"manual" | "bank">("manual");
  const [documentNumber, setDocumentNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedBankTransactionId, setSelectedBankTransactionId] = useState<string>("");

  // Get unique bank account ids from selected entries
  const bankAccountIds = [...new Set(entries.map((e) => e.bank_account_id).filter(Boolean))];

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

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setReconcileMethod("manual");
      setDocumentNumber("");
      setNotes("");
      setSelectedBankTransactionId("");
    }
  }, [open]);

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

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Update ledger entries as reconciled
      const { error: updateError } = await supabase
        .from("fin_ledger_entries")
        .update({
          reconciled: true,
          document_number: documentNumber || null,
          notes: notes ? (entries.length === 1 ? notes : `[Conciliação em lote] ${notes}`) : undefined,
        })
        .in(
          "id",
          entries.map((e) => e.id)
        );

      if (updateError) throw updateError;

      // If bank transaction was selected, create reconciliation link and update bank transaction
      if (reconcileMethod === "bank" && selectedBankTransactionId) {
        // Update bank transaction status
        await supabase
          .from("fin_bank_transactions")
          .update({ status: "CONCILIADA" })
          .eq("id", selectedBankTransactionId);

        // Create reconciliation links for each entry
        const links = entries.map((entry) => ({
          bank_transaction_id: selectedBankTransactionId,
          ledger_entry_id: entry.id,
          match_type: "MANUAL" as const,
        }));

        await supabase.from("fin_reconciliation_links").insert(links);
      }

      toast.success(
        `${entries.length} lançamento(s) conciliado(s) com sucesso!`
      );
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

            {/* Manual reconciliation fields - always visible */}
            {reconcileMethod === "manual" && (
              <>
                <Separator />
                <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Informações da Conciliação Manual
                  </Label>
                  
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
              (reconcileMethod === "bank" && !selectedBankTransactionId)
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
