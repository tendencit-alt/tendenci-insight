import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, History } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderLabel: string;
  currentDeadline: string | null;
  tenantId?: string | null;
  onSaved?: () => void;
}

interface HistoryRow {
  id: string;
  old_deadline: string | null;
  new_deadline: string | null;
  reason: string;
  created_at: string;
}

export function EditOrderDeadlineDialog({ open, onOpenChange, orderId, orderLabel, currentDeadline, tenantId, onSaved }: Props) {
  const queryClient = useQueryClient();
  const [newDate, setNewDate] = useState<string>(currentDeadline ? currentDeadline.slice(0, 10) : "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNewDate(currentDeadline ? currentDeadline.slice(0, 10) : "");
    setReason("");
    (async () => {
      setLoadingHistory(true);
      const { data } = await supabase
        .from("order_deadline_history")
        .select("id, old_deadline, new_deadline, reason, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(20);
      setHistory((data as HistoryRow[]) ?? []);
      setLoadingHistory(false);
    })();
  }, [open, orderId, currentDeadline]);

  const handleSave = async () => {
    if (!newDate) return toast.error("Informe a nova data");
    if (!reason.trim()) return toast.error("Informe o motivo da alteração");
    if (newDate === (currentDeadline ?? "").slice(0, 10)) {
      return toast.info("A data informada é igual à atual");
    }
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ data_entrega_prevista: newDate })
        .eq("id", orderId);
      if (updateError) throw updateError;

      const { data: userResult } = await supabase.auth.getUser();
      const { error: histError } = await supabase
        .from("order_deadline_history")
        .insert({
          order_id: orderId,
          tenant_id: tenantId ?? null,
          old_deadline: currentDeadline ? currentDeadline.slice(0, 10) : null,
          new_deadline: newDate,
          reason: reason.trim(),
          changed_by: userResult.user?.id ?? null,
        });
      if (histError) throw histError;

      toast.success("Prazo atualizado");
      // Invalida caches relacionados para refletir nas demais telas
      await queryClient.invalidateQueries({
        predicate: (q) => {
          const k = q.queryKey[0];
          return typeof k === "string" && (
            k === "orders" || k.startsWith("order-") ||
            k === "fin-projects-active" || k.startsWith("fin-projects") || k.startsWith("projects") ||
            k.startsWith("production")
          );
        },
      });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao atualizar prazo");
    } finally {
      setSaving(false);
    }
  };

  const fmt = (d: string | null) => (d ? new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR") : "—");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Atualizar prazo de entrega</DialogTitle>
          <DialogDescription>
            {orderLabel} — prazo atual: <strong>{fmt(currentDeadline)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="new-deadline">Novo prazo</Label>
            <Input id="new-deadline" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="reason">Motivo da alteração *</Label>
            <Textarea
              id="reason"
              rows={3}
              placeholder="Ex.: cliente solicitou postergação, atraso de fornecedor, replanejamento de produção…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
              <History className="h-3.5 w-3.5" /> Histórico de alterações
            </div>
            {loadingHistory ? (
              <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />Carregando…</div>
            ) : history.length === 0 ? (
              <div className="text-xs text-muted-foreground">Nenhuma alteração registrada.</div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.map((h) => (
                  <div key={h.id} className="text-xs border rounded-md p-2 bg-muted/40">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px]">{fmt(h.old_deadline)}</Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="secondary" className="text-[10px]">{fmt(h.new_deadline)}</Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground italic">"{h.reason}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar novo prazo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
