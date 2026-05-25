import { useState, useEffect } from "react";
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
import { CurrencyInput, parseCurrencyToNumber, formatToCurrencyDisplay } from "@/components/ui/currency-input";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, AlertCircle, Eye, Edit, Plus } from "lucide-react";
import { QuickCreateSupplierDialog } from "./QuickCreateSupplierDialog";
import { cn } from "@/lib/utils";
import { useFinanceiroSync } from "@/hooks/useFinanceiroSync";
import { Badge } from "@/components/ui/badge";
import { CostCenterApportionmentPanel, ApportionmentItem } from "./CostCenterApportionmentPanel";

interface ViewEditPayableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payable: any;
  onSuccess: () => void;
  mode: "view" | "edit";
}

interface FormErrors {
  supplier_id?: string;
  amount?: string;
  due_date?: string;
  competence_date?: string;
  chart_account_id?: string;
  description?: string;
}

export function ViewEditPayableDialog({ open, onOpenChange, payable, onSuccess, mode }: ViewEditPayableDialogProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isEditing, setIsEditing] = useState(mode === "edit");
  const [showCreateSupplier, setShowCreateSupplier] = useState(false);
  const { invalidatePayables } = useFinanceiroSync();
  
  const [form, setForm] = useState({
    supplier_id: "",
    amount: "",
    due_date: "",
    competence_date: "",
    chart_account_id: "",
    cost_center_id: "",
    project_id: "",
    description: "",
    document_number: "",
    installment: "1",
    total_installments: "1",
    notes: "",
    status: "",
  });

  useEffect(() => {
    if (open && payable) {
      setForm({
        supplier_id: payable.supplier_id || "",
        amount: formatToCurrencyDisplay(Number(payable.amount) || 0),
        due_date: payable.due_date || "",
        competence_date: payable.competence_date || "",
        chart_account_id: payable.chart_account_id || "",
        cost_center_id: payable.cost_center_id || "",
        project_id: payable.project_id || "",
        description: payable.description || "",
        document_number: payable.document_number || "",
        installment: String(payable.installment || 1),
        total_installments: String(payable.total_installments || 1),
        notes: payable.notes || "",
        status: payable.status || "ABERTO",
      });
      setIsEditing(mode === "edit");
      setErrors({});
    }
  }, [open, payable, mode]);

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
      const { data } = await supabase.from("fin_cost_centers").select("id, name").eq("active", true).order("name");
      return data || [];
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["fin-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("fin_projects").select("id, name").eq("status", "ativo").order("name");
      return data || [];
    },
  });

  // Fetch splits if the entry has rateio
  const { data: splits } = useQuery({
    queryKey: ["fin-ledger-splits", payable?.ledger_entry_id],
    queryFn: async () => {
      if (!payable?.ledger_entry_id) return [];
      const { data } = await supabase
        .from("fin_ledger_splits")
        .select("id, cost_center_id, percentage, amount, description")
        .eq("parent_entry_id", payable.ledger_entry_id);
      return data || [];
    },
    enabled: !!payable?.ledger_entry_id,
  });

  const splitsAsApportionment: ApportionmentItem[] = (splits || []).map((s: any) => ({
    cost_center_id: s.cost_center_id,
    cost_center_name: costCenters?.find((cc) => cc.id === s.cost_center_id)?.name || "—",
    percentage: Number(s.percentage) || 0,
    amount: Number(s.amount) || 0,
  }));

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.supplier_id) newErrors.supplier_id = "Fornecedor é obrigatório";
    if (!form.amount || parseCurrencyToNumber(form.amount) <= 0) newErrors.amount = "Valor é obrigatório";
    if (!form.due_date) newErrors.due_date = "Data de vencimento é obrigatória";
    if (!form.description?.trim()) newErrors.description = "Descrição é obrigatória";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        supplier_id: form.supplier_id,
        amount: parseCurrencyToNumber(form.amount),
        due_date: form.due_date,
        competence_date: form.competence_date || form.due_date,
        chart_account_id: form.chart_account_id || null,
        cost_center_id: form.cost_center_id || null,
        project_id: form.project_id || null,
        description: form.description,
        document_number: form.document_number || null,
        installment: parseInt(form.installment) || 1,
        total_installments: parseInt(form.total_installments) || 1,
        notes: form.notes || null,
        status: form.status,
      };

      const { error } = await supabase
        .from("fin_payables")
        .update(updateData)
        .eq("id", payable.id);

      if (error) throw error;

      // Sync linked ledger entry with key fields (project, cost center, chart account, amount, description)
      if (payable.ledger_entry_id) {
        await supabase
          .from("fin_ledger_entries")
          .update({
            project_id: form.project_id || null,
            cost_center_id: form.cost_center_id || null,
            chart_account_id: form.chart_account_id || null,
            amount: parseCurrencyToNumber(form.amount),
            description: form.description,
            competence_date: form.competence_date || form.due_date,
            document_number: form.document_number || null,
            notes: form.notes || null,
          })
          .eq("id", payable.ledger_entry_id);
      }

      toast.success("Conta a pagar atualizada com sucesso!");
      invalidatePayables();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ABERTO": return <Badge variant="outline">Aberto</Badge>;
      case "VENCIDO": return <Badge variant="destructive">Vencido</Badge>;
      case "PAGO": return <Badge className="bg-green-600">Pago</Badge>;
      case "PARCIAL": return <Badge variant="secondary">Parcial</Badge>;
      case "CANCELADO": return <Badge variant="secondary">Cancelado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (!payable) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {isEditing ? <Edit className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              {isEditing ? "Editar Conta a Pagar" : "Visualizar Conta a Pagar"}
            </DialogTitle>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-1" /> Editar
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Status and Payment Info */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Status:</span>
              {isEditing ? (
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ABERTO">Aberto</SelectItem>
                    <SelectItem value="VENCIDO">Vencido</SelectItem>
                    <SelectItem value="PAGO">Pago</SelectItem>
                    <SelectItem value="PARCIAL">Parcial</SelectItem>
                    <SelectItem value="CANCELADO">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                getStatusBadge(payable.status)
              )}
            </div>
            {payable.paid_amount > 0 && (
              <div className="text-sm">
                <span className="text-muted-foreground">Pago: </span>
                <span className="font-medium text-green-600">{formatCurrency(Number(payable.paid_amount))}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fornecedor {isEditing && <span className="text-destructive">*</span>}</Label>
              {isEditing ? (
                <>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SearchableSelect
                        options={(suppliers || []).map(s => ({ value: s.id, label: s.name }))}
                        value={form.supplier_id}
                        onChange={(v) => setForm({ ...form, supplier_id: v })}
                        placeholder="Selecione o fornecedor..."
                        searchPlaceholder="Buscar fornecedor..."
                        emptyMessage="Nenhum fornecedor encontrado."
                        className={cn(errors.supplier_id && "border-destructive")}
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowCreateSupplier(true)}
                      title="Criar novo fornecedor"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {errors.supplier_id && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.supplier_id}</p>}
                </>
              ) : (
                <p className="text-sm font-medium p-2 bg-muted rounded">{payable.supplier?.name || "-"}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Valor {isEditing && <span className="text-destructive">*</span>}</Label>
              {isEditing ? (
                <>
                  <CurrencyInput value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} className={cn(errors.amount && "border-destructive")} />
                  {errors.amount && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.amount}</p>}
                </>
              ) : (
                <p className="text-sm font-medium p-2 bg-muted rounded">{formatCurrency(Number(payable.amount))}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Vencimento {isEditing && <span className="text-destructive">*</span>}</Label>
              {isEditing ? (
                <DateBrInput value={form.due_date} onChange={(iso) => setForm({ ...form, due_date: iso })} className={cn(errors.due_date && "border-destructive")} />
              ) : (
                <p className="text-sm font-medium p-2 bg-muted rounded">{payable.due_date ? format(new Date(payable.due_date), "dd/MM/yyyy", { locale: ptBR }) : "-"}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Data de Competência</Label>
              {isEditing ? (
                <DateBrInput value={form.competence_date} onChange={(iso) => setForm({ ...form, competence_date: iso })} />
              ) : (
                <p className="text-sm font-medium p-2 bg-muted rounded">{payable.competence_date ? format(new Date(payable.competence_date), "dd/MM/yyyy", { locale: ptBR }) : "-"}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Categoria (Plano de Contas)</Label>
            {isEditing ? (
              <SearchableSelect
                options={(chartAccounts || []).map(a => ({ value: a.id, label: a.name, code: a.code }))}
                value={form.chart_account_id}
                onChange={(v) => setForm({ ...form, chart_account_id: v })}
                placeholder="Selecione a categoria..."
                searchPlaceholder="Buscar categoria..."
                emptyMessage="Nenhuma categoria encontrada."
              />
            ) : (
              <p className="text-sm font-medium p-2 bg-muted rounded">{payable.chart_account?.name || "-"}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Centro de Custo</Label>
              {isEditing ? (
                <Select value={form.cost_center_id} onValueChange={(v) => setForm({ ...form, cost_center_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {costCenters?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium p-2 bg-muted rounded">{costCenters?.find(c => c.id === payable.cost_center_id)?.name || "-"}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Projeto</Label>
              {isEditing ? (
                <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {projects?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium p-2 bg-muted rounded">{projects?.find(p => p.id === payable.project_id)?.name || "-"}</p>
              )}
            </div>
          </div>

          {splitsAsApportionment.length > 0 && (
            <CostCenterApportionmentPanel
              totalAmount={Number(payable.amount) || 0}
              items={splitsAsApportionment}
              onChange={() => {}}
              readOnly
            />
          )}

          <div className="space-y-2">
            <Label>Descrição {isEditing && <span className="text-destructive">*</span>}</Label>
            {isEditing ? (
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={cn(errors.description && "border-destructive")} />
            ) : (
              <p className="text-sm font-medium p-2 bg-muted rounded">{payable.description || "-"}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Nº Documento</Label>
              {isEditing ? (
                <Input value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} />
              ) : (
                <p className="text-sm font-medium p-2 bg-muted rounded">{payable.document_number || "-"}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Parcela</Label>
              {isEditing ? (
                <Input type="number" min="1" value={form.installment} onChange={(e) => setForm({ ...form, installment: e.target.value })} />
              ) : (
                <p className="text-sm font-medium p-2 bg-muted rounded">{payable.installment || 1}/{payable.total_installments || 1}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Total Parcelas</Label>
              {isEditing ? (
                <Input type="number" min="1" value={form.total_installments} onChange={(e) => setForm({ ...form, total_installments: e.target.value })} />
              ) : (
                <p className="text-sm font-medium p-2 bg-muted rounded">{payable.total_installments || 1}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            {isEditing ? (
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            ) : (
              <p className="text-sm font-medium p-2 bg-muted rounded min-h-[60px]">{payable.notes || "-"}</p>
            )}
          </div>

          {payable.payment_date && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm">
                <span className="text-muted-foreground">Data de Pagamento: </span>
                <span className="font-medium">{format(new Date(payable.payment_date), "dd/MM/yyyy", { locale: ptBR })}</span>
              </p>
              {payable.bank_account && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Conta Bancária: </span>
                  <span className="font-medium">{payable.bank_account.nickname}</span>
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isEditing ? "Cancelar" : "Fechar"}
          </Button>
          {isEditing && (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <QuickCreateSupplierDialog
      open={showCreateSupplier}
      onOpenChange={setShowCreateSupplier}
      onCreated={(supplierId) => {
        setForm({ ...form, supplier_id: supplierId });
        if (errors.supplier_id) setErrors({ ...errors, supplier_id: undefined });
      }}
    />
    </>
  );
}
