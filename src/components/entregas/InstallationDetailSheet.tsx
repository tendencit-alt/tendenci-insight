import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INSTALL_STATUSES, InstallStatusBadge } from "./StatusBadge";
import {
  useUpdateInstallation, useChecklist, useChecklistOps, useIssues, useIssueOps,
  type InstallationOrder,
} from "@/hooks/useFulfillment";
import { useEffect, useState } from "react";
import { CheckCircle2, Plus, AlertTriangle } from "lucide-react";

export function InstallationDetailSheet({
  install, open, onOpenChange,
}: { install: InstallationOrder | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const update = useUpdateInstallation();
  const { data: checklist = [] } = useChecklist(install?.id ?? null);
  const { add: addItem, toggle } = useChecklistOps(install?.id ?? null);
  const { data: issues = [] } = useIssues(install?.id ?? null);
  const { add: addIssue, resolve } = useIssueOps(install?.id ?? null);

  const [form, setForm] = useState<Partial<InstallationOrder>>({});
  const [newItem, setNewItem] = useState("");
  const [newIssue, setNewIssue] = useState("");
  const [severidade, setSeveridade] = useState<"baixa" | "media" | "alta">("media");

  useEffect(() => { setForm(install ?? {}); }, [install]);
  if (!install) return null;

  const save = () => update.mutate({ id: install.id, patch: form });
  const markDone = () =>
    update.mutate({
      id: install.id,
      patch: { status: "concluida", completed_date: new Date().toISOString() } as any,
    });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Montagem — Pedido #{install.order?.order_number}
            <InstallStatusBadge status={install.status} />
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Status</Label>
              <Select value={form.status ?? install.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSTALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data prevista</Label>
              <Input
                type="datetime-local"
                value={form.scheduled_date ? form.scheduled_date.slice(0, 16) : ""}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value || null }))}
              />
            </div>
          </div>
          <div><Label>Equipe responsável</Label><Input value={form.equipe_responsavel ?? ""} onChange={(e) => setForm((f) => ({ ...f, equipe_responsavel: e.target.value }))} /></div>
          <div><Label>Endereço</Label><Input value={form.endereco ?? ""} onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))} /></div>
          <div><Label>Observações</Label><Textarea rows={2} value={form.observacoes ?? ""} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} /></div>

          <div className="flex gap-2">
            <Button onClick={save} disabled={update.isPending}>Salvar</Button>
            {install.status !== "concluida" && (
              <Button onClick={markDone} disabled={update.isPending}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Marcar como concluída
              </Button>
            )}
          </div>

          {/* Checklist */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-2">Checklist</h3>
            <div className="space-y-1">
              {checklist.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm py-1">
                  <Checkbox checked={c.concluido} onCheckedChange={() => toggle.mutate(c)} />
                  <span className={c.concluido ? "line-through text-muted-foreground" : ""}>{c.descricao}</span>
                </label>
              ))}
              {checklist.length === 0 && <p className="text-xs text-muted-foreground">Sem itens.</p>}
            </div>
            <div className="flex gap-2 mt-2">
              <Input placeholder="Novo item" value={newItem} onChange={(e) => setNewItem(e.target.value)} />
              <Button size="sm" onClick={() => { if (newItem) { addItem.mutate(newItem); setNewItem(""); } }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Issues */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-2">Pendências</h3>
            <div className="space-y-1">
              {issues.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-2 text-sm py-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={
                      i.severidade === "alta" ? "h-3.5 w-3.5 text-destructive" :
                      i.severidade === "media" ? "h-3.5 w-3.5 text-amber-500" :
                      "h-3.5 w-3.5 text-muted-foreground"
                    } />
                    <span className={i.status === "resolvida" ? "line-through text-muted-foreground" : ""}>
                      {i.descricao}
                    </span>
                  </div>
                  {i.status === "aberta" && (
                    <Button size="sm" variant="ghost" onClick={() => resolve.mutate(i.id)}>Resolver</Button>
                  )}
                </div>
              ))}
              {issues.length === 0 && <p className="text-xs text-muted-foreground">Sem pendências.</p>}
            </div>
            <div className="flex gap-2 mt-2">
              <Input placeholder="Nova pendência" value={newIssue} onChange={(e) => setNewIssue(e.target.value)} />
              <Select value={severidade} onValueChange={(v) => setSeveridade(v as any)}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">baixa</SelectItem>
                  <SelectItem value="media">média</SelectItem>
                  <SelectItem value="alta">alta</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => { if (newIssue) { addIssue.mutate({ descricao: newIssue, severidade }); setNewIssue(""); } }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
