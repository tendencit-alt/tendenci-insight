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
import { payPayableWithLedgerSync } from "@/lib/financeiroIntegration";
import { useFinanceiroSync } from "@/hooks/useFinanceiroSync";

interface PayPayableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payable: any;
  onSuccess: () => void;
}

export function PayPayableDialog({ open, onOpenChange, payable, onSuccess }: PayPayableDialogProps) {
  const [loading, setLoading] = useState(false);
  const { invalidatePayables } = useFinanceiroSync();
  const [form, setForm] = useState({
    amount: "",
    payment_date: format(new Date(), "yyyy-MM-dd"),
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
    if (payable) {
      const pendingAmount = Number(payable.amount) - Number(payable.paid_amount || 0);
      setForm({
        amount: pendingAmount.toFixed(2).replace(".", ","),
        payment_date: format(new Date(), "yyyy-MM-dd"),
        bank_account_id: "",
      });
    }
  }, [payable]);

  const handleSubmit = async () => {
    if (!form.amount || !form.payment_date || !form.bank_account_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const paymentAmount = parseFloat(form.amount.replace(",", "."));

      // Use integrated service for payment
      await payPayableWithLedgerSync(
        payable.id,
        paymentAmount,
        form.payment_date,
        form.bank_account_id,
        Number(payable.paid_amount || 0),
        Number(payable.amount),
        payable.ledger_entry_id,
        {
          description: payable.description,
          supplier_id: payable.supplier_id,
          supplier_name: payable.supplier?.name,
          competence_date: payable.competence_date,
          chart_account_id: payable.chart_account_id,
          cost_center_id: payable.cost_center_id,
          project_id: payable.project_id,
        }
      );

      toast.success("Pagamento registrado com sucesso!");
      invalidatePayables(); // Sync all related queries
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao registrar pagamento: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!payable) return null;

  const pendingAmount = Number(payable.amount) - Number(payable.paid_amount || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Fornecedor</p>
            <p className="font-medium">{payable.supplier?.name || "N/A"}</p>
            <p className="text-sm text-muted-foreground mt-2">Valor Pendente</p>
            <p className="font-medium text-lg">
              {pendingAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Valor do Pagamento *</Label>
            <Input
              type="text"
              placeholder="0,00"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Data do Pagamento *</Label>
            <DateBrInput
              value={form.payment_date}
              onChange={(e) =/> setForm({ ...form, payment_date: e.target.value })}
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
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
