import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DateBrInput } from "@/components/ui/date-br-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { receivePaymentWithLedgerSync } from "@/lib/financeiroIntegration";
import { useFinanceiroSync } from "@/hooks/useFinanceiroSync";

interface ReceivePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivable: any;
  onSuccess: () => void;
}

export function ReceivePaymentDialog({ open, onOpenChange, receivable, onSuccess }: ReceivePaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const { invalidateReceivables } = useFinanceiroSync();
  const [form, setForm] = useState({
    amount: "",
    receipt_date: format(new Date(), "yyyy-MM-dd"),
    bank_account_id: "",
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

  useEffect(() => {
    if (receivable) {
      const pendingAmount = Number(receivable.amount) - Number(receivable.received_amount || 0);
      setForm({
        amount: pendingAmount.toFixed(2).replace(".", ","),
        receipt_date: format(new Date(), "yyyy-MM-dd"),
        bank_account_id: "",
      });
    }
  }, [receivable]);

  const handleSubmit = async () => {
    if (!form.amount || !form.receipt_date || !form.bank_account_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const receiptAmount = parseFloat(form.amount.replace(",", "."));

      // Use integrated service for receipt
      await receivePaymentWithLedgerSync(
        receivable.id,
        receiptAmount,
        form.receipt_date,
        form.bank_account_id,
        Number(receivable.received_amount || 0),
        Number(receivable.amount),
        receivable.ledger_entry_id,
        {
          description: receivable.description,
          customer_id: receivable.customer_id,
          customer_name: receivable.customer?.name,
          competence_date: receivable.competence_date,
          chart_account_id: receivable.chart_account_id,
          cost_center_id: receivable.cost_center_id,
          project_id: receivable.project_id,
        }
      );

      toast.success("Recebimento registrado com sucesso!");
      invalidateReceivables(); // Sync all related queries
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao registrar recebimento: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!receivable) return null;

  const pendingAmount = Number(receivable.amount) - Number(receivable.received_amount || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Recebimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Cliente</p>
            <p className="font-medium">{receivable.customer?.name || "N/A"}</p>
            <p className="text-sm text-muted-foreground mt-2">Valor Pendente</p>
            <p className="font-medium text-lg">
              {pendingAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Valor do Recebimento *</Label>
            <Input
              type="text"
              placeholder="0,00"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Data do Recebimento *</Label>
            <DateBrInput
              value={form.receipt_date}
              onChange={(e) =/> setForm({ ...form, receipt_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Conta Bancária *</Label>
            <Select value={form.bank_account_id} onValueChange={(v) => setForm({ ...form, bank_account_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta..." />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts?.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.nickname}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Recebimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
