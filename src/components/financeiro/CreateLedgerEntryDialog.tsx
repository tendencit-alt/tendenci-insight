import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "./SearchableSelect";
import { CurrencyInput, parseCurrencyToNumber } from "@/components/ui/currency-input";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

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
    bank_account_id: "",
    chart_account_id: "",
    cost_center_id: "",
    project_id: "",
    payment_method: "",
    document_number: "",
    notes: "",
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

  // Filter chart accounts based on type
  const filteredChartAccounts = chartAccounts?.filter((a) => {
    if (form.type === "RECEITA") return a.nature === "RECEITA";
    if (form.type === "DESPESA") return a.nature === "DESPESA";
    return true;
  });

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

    setLoading(true);
    try {
      const { error } = await supabase.from("fin_ledger_entries").insert({
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
        status: form.cash_date ? "PAGO_RECEBIDO" : "ABERTO",
      });

      if (error) throw error;

      toast.success("Lançamento criado com sucesso!");
      onSuccess();
      onOpenChange(false);
      setForm({
        type: "DESPESA",
        description: "",
        amount: "",
        competence_date: format(new Date(), "yyyy-MM-dd"),
        cash_date: format(new Date(), "yyyy-MM-dd"),
        bank_account_id: "",
        chart_account_id: "",
        cost_center_id: "",
        project_id: "",
        payment_method: "",
        document_number: "",
        notes: "",
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
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

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
            Criar Lançamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
