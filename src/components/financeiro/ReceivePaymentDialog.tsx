import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface ReceivePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivable: any;
  onSuccess: () => void;
}

export function ReceivePaymentDialog({ open, onOpenChange, receivable, onSuccess }: ReceivePaymentDialogProps) {
  const [loading, setLoading] = useState(false);
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
      const newReceivedAmount = Number(receivable.received_amount || 0) + receiptAmount;
      const totalAmount = Number(receivable.amount);

      let newStatus = "PARCIAL";
      if (newReceivedAmount >= totalAmount) {
        newStatus = "RECEBIDO";
      }

      // Update receivable
      const { error: receivableError } = await supabase
        .from("fin_receivables")
        .update({
          received_amount: newReceivedAmount,
          status: newStatus,
          receipt_date: newStatus === "RECEBIDO" ? form.receipt_date : null,
          bank_account_id: form.bank_account_id,
        })
        .eq("id", receivable.id);

      if (receivableError) throw receivableError;

      // Create ledger entry
      const { error: ledgerError } = await supabase
        .from("fin_ledger_entries")
        .insert({
          type: "RECEITA",
          description: receivable.description || `Recebimento - ${receivable.customer?.name || "Cliente"}`,
          amount: receiptAmount,
          competence_date: receivable.competence_date || form.receipt_date,
          cash_date: form.receipt_date,
          bank_account_id: form.bank_account_id,
          chart_account_id: receivable.chart_account_id,
          cost_center_id: receivable.cost_center_id,
          project_id: receivable.project_id,
          party_id: receivable.customer_id,
          party_type: "client",
          status: "PAGO_RECEBIDO",
        });

      if (ledgerError) throw ledgerError;

      toast.success("Recebimento registrado com sucesso!");
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
            <Input
              type="date"
              value={form.receipt_date}
              onChange={(e) => setForm({ ...form, receipt_date: e.target.value })}
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
