import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface CreatePayableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreatePayableDialog({ open, onOpenChange, onSuccess }: CreatePayableDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    supplier_id: "",
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

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: chartAccounts } = useQuery({
    queryKey: ["fin-chart-accounts-despesa"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name")
        .eq("nature", "DESPESA")
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

  const handleSubmit = async () => {
    if (!form.amount || !form.due_date) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("fin_payables").insert({
        supplier_id: form.supplier_id || null,
        amount: parseFloat(form.amount.replace(",", ".")),
        due_date: form.due_date,
        competence_date: form.competence_date || null,
        chart_account_id: form.chart_account_id || null,
        cost_center_id: form.cost_center_id || null,
        project_id: form.project_id || null,
        description: form.description || null,
        document_number: form.document_number || null,
        installment: parseInt(form.installment) || 1,
        total_installments: parseInt(form.total_installments) || 1,
        notes: form.notes || null,
      });

      if (error) throw error;

      toast.success("Conta a pagar criada com sucesso!");
      onSuccess();
      onOpenChange(false);
      setForm({
        supplier_id: "",
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
    } catch (error: any) {
      toast.error("Erro ao criar conta a pagar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Conta a Pagar</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor *</Label>
              <Input
                type="text"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Vencimento *</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Data de Competência</Label>
              <Input
                type="date"
                value={form.competence_date}
                onChange={(e) => setForm({ ...form, competence_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Categoria (Plano de Contas)</Label>
            <Select value={form.chart_account_id} onValueChange={(v) => setForm({ ...form, chart_account_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria..." />
              </SelectTrigger>
              <SelectContent>
                {chartAccounts?.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Centro de Custo</Label>
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
              <Label>Projeto</Label>
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
            <Label>Descrição</Label>
            <Input
              placeholder="Descrição do pagamento..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Nº Documento</Label>
              <Input
                placeholder="NF, Boleto..."
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Conta a Pagar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
