import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, ShieldCheck } from "lucide-react";

const MODULES = [
  { value: "financeiro", label: "Financeiro" },
  { value: "comercial", label: "Comercial" },
  { value: "operacional", label: "Operacional" },
  { value: "estrutural", label: "Estrutural" },
];

const TRIGGER_TYPES = [
  "valor_acima_limite",
  "desconto_acima_alcada",
  "margem_abaixo_minima",
  "pagamento_sem_documento",
  "despesa_fora_orcamento",
  "pagamento_emergencial",
  "condicao_pagamento_fora_politica",
  "comissao_fora_regra",
  "custo_extra_nao_previsto",
  "retrabalho",
  "edicao_lancamento_conciliado",
  "reabertura_periodo",
  "alteracao_meta_global",
  "alteracao_plano_contas",
  "contratacao_emprestimo",
  "quitacao_antecipada",
];

const OPERATORS = [">", "<", ">=", "<=", "=", "!="];

interface RuleForm {
  id?: string;
  module: string;
  trigger_type: string;
  description: string;
  condition_field: string;
  condition_operator: string;
  condition_value: string;
  source_table: string;
  priority: number;
  active: boolean;
}

const emptyForm: RuleForm = {
  module: "financeiro",
  trigger_type: "valor_acima_limite",
  description: "",
  condition_field: "amount",
  condition_operator: ">",
  condition_value: "",
  source_table: "",
  priority: 0,
  active: true,
};

export function ApprovalRulesPanel() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<RuleForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: rules, isLoading } = useQuery({
    queryKey: ["approval-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_rules")
        .select("*, thresholds:approval_thresholds(id, min_value, max_value, approver_profile_type)")
        .order("priority", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const openEdit = (rule: any) => {
    setForm({
      id: rule.id,
      module: rule.module,
      trigger_type: rule.trigger_type,
      description: rule.description || "",
      condition_field: rule.condition_field || "",
      condition_operator: rule.condition_operator || ">",
      condition_value: rule.condition_value || "",
      source_table: rule.source_table || "",
      priority: rule.priority || 0,
      active: rule.active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.trigger_type || !form.module) {
      toast.error("Preencha módulo e tipo de gatilho");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        module: form.module,
        trigger_type: form.trigger_type,
        description: form.description || null,
        condition_field: form.condition_field || null,
        condition_operator: form.condition_operator || null,
        condition_value: form.condition_value || null,
        source_table: form.source_table || null,
        priority: form.priority,
        active: form.active,
      };

      if (form.id) {
        const { error } = await supabase.from("approval_rules").update(payload).eq("id", form.id);
        if (error) throw error;
        toast.success("Regra atualizada");
      } else {
        const { error } = await supabase.from("approval_rules").insert(payload);
        if (error) throw error;
        toast.success("Regra criada");
      }

      queryClient.invalidateQueries({ queryKey: ["approval-rules"] });
      setDialogOpen(false);
      setForm(emptyForm);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("approval_rules").update({ active: !active }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["approval-rules"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> Regras de Aprovação
        </h2>
        <Button size="sm" onClick={() => { setForm(emptyForm); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nova Regra
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Módulo</TableHead>
                <TableHead>Gatilho</TableHead>
                <TableHead>Condição</TableHead>
                <TableHead>Alçadas</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : (rules || []).length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma regra cadastrada</TableCell></TableRow>
              ) : (rules || []).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell><Badge variant="outline">{r.module}</Badge></TableCell>
                  <TableCell className="text-sm">{r.trigger_type}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.condition_field ? `${r.condition_field} ${r.condition_operator} ${r.condition_value}` : "—"}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">{r.thresholds?.length || 0} faixa(s)</span>
                  </TableCell>
                  <TableCell>{r.priority}</TableCell>
                  <TableCell>
                    <Switch checked={r.active} onCheckedChange={() => toggleActive(r.id, r.active)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar Regra" : "Nova Regra de Aprovação"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Módulo *</Label>
                <Select value={form.module} onValueChange={(v) => setForm({ ...form, module: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODULES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Gatilho *</Label>
                <Select value={form.trigger_type} onValueChange={(v) => setForm({ ...form, trigger_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Campo</Label>
                <Input value={form.condition_field} onChange={(e) => setForm({ ...form, condition_field: e.target.value })} placeholder="amount" />
              </div>
              <div className="space-y-1">
                <Label>Operador</Label>
                <Select value={form.condition_operator} onValueChange={(v) => setForm({ ...form, condition_operator: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Valor</Label>
                <Input value={form.condition_value} onChange={(e) => setForm({ ...form, condition_value: e.target.value })} placeholder="10000" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tabela Origem</Label>
                <Input value={form.source_table} onChange={(e) => setForm({ ...form, source_table: e.target.value })} placeholder="fin_payables" />
              </div>
              <div className="space-y-1">
                <Label>Prioridade</Label>
                <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Regra ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {form.id ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
