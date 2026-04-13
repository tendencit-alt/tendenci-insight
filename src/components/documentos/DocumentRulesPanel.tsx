import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, ShieldCheck } from "lucide-react";

const MODULES = ["comercial", "financeiro", "operacional", "estrutural", "producao", "aprovacao"];
const DOC_TYPES = ["fiscal", "financeiro", "contratual", "operacional", "comercial", "comprovante", "imagem", "arquivo_tecnico"];
const OPERATORS = [">", "<", ">=", "<=", "=", "!="];

interface RuleForm {
  id?: string;
  module: string;
  entity_table: string;
  document_type: string;
  description: string;
  is_mandatory: boolean;
  condition_field: string;
  condition_operator: string;
  condition_value: string;
  active: boolean;
}

const emptyForm: RuleForm = {
  module: "financeiro",
  entity_table: "fin_payables",
  document_type: "fiscal",
  description: "",
  is_mandatory: true,
  condition_field: "",
  condition_operator: ">",
  condition_value: "",
  active: true,
};

export function DocumentRulesPanel() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<RuleForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: rules, isLoading } = useQuery({
    queryKey: ["erp-document-rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("erp_document_rules").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const openEdit = (rule: any) => {
    setForm({
      id: rule.id,
      module: rule.module,
      entity_table: rule.entity_table,
      document_type: rule.document_type,
      description: rule.description || "",
      is_mandatory: rule.is_mandatory,
      condition_field: rule.condition_field || "",
      condition_operator: rule.condition_operator || ">",
      condition_value: rule.condition_value || "",
      active: rule.active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        module: form.module,
        entity_table: form.entity_table,
        document_type: form.document_type,
        description: form.description || null,
        is_mandatory: form.is_mandatory,
        condition_field: form.condition_field || null,
        condition_operator: form.condition_operator || null,
        condition_value: form.condition_value || null,
        active: form.active,
      };

      if (form.id) {
        const { error } = await supabase.from("erp_document_rules").update(payload).eq("id", form.id);
        if (error) throw error;
        toast.success("Regra atualizada");
      } else {
        const { error } = await supabase.from("erp_document_rules").insert(payload);
        if (error) throw error;
        toast.success("Regra criada");
      }

      queryClient.invalidateQueries({ queryKey: ["erp-document-rules"] });
      setDialogOpen(false);
      setForm(emptyForm);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("erp_document_rules").update({ active: !active }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["erp-document-rules"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> Regras de Obrigatoriedade
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
                <TableHead>Entidade</TableHead>
                <TableHead>Tipo Documento</TableHead>
                <TableHead>Condição</TableHead>
                <TableHead>Obrigatório</TableHead>
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
                  <TableCell className="text-sm">{r.entity_table}</TableCell>
                  <TableCell className="text-sm">{r.document_type}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.condition_field ? `${r.condition_field} ${r.condition_operator} ${r.condition_value}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.is_mandatory ? "destructive" : "outline"} className="text-xs">
                      {r.is_mandatory ? "Obrigatório" : "Opcional"}
                    </Badge>
                  </TableCell>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar Regra" : "Nova Regra de Obrigatoriedade"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Módulo *</Label>
                <Select value={form.module} onValueChange={(v) => setForm({ ...form, module: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tipo Documento *</Label>
                <Select value={form.document_type} onValueChange={(v) => setForm({ ...form, document_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Tabela Entidade *</Label>
              <Input value={form.entity_table} onChange={(e) => setForm({ ...form, entity_table: e.target.value })} placeholder="fin_payables, orders..." />
            </div>

            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Nota fiscal obrigatória para pagamento acima de R$ 5.000" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Campo Condição</Label>
                <Input value={form.condition_field} onChange={(e) => setForm({ ...form, condition_field: e.target.value })} placeholder="amount" />
              </div>
              <div className="space-y-1">
                <Label>Operador</Label>
                <Select value={form.condition_operator} onValueChange={(v) => setForm({ ...form, condition_operator: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OPERATORS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Valor</Label>
                <Input value={form.condition_value} onChange={(e) => setForm({ ...form, condition_value: e.target.value })} placeholder="5000" />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_mandatory} onCheckedChange={(v) => setForm({ ...form, is_mandatory: v })} />
                <Label>Obrigatório (bloqueia avanço)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <Label>Ativo</Label>
              </div>
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
