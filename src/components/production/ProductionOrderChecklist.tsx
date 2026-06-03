import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  productionOrderId: string;
  statusSlug: string;
}

interface Row {
  id: string;
  label: string;
  required: boolean;
  completed: boolean;
  progress_id: string | null;
}

export function ProductionOrderChecklist({ productionOrderId, statusSlug }: Props) {
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["op_checklist", productionOrderId, statusSlug],
    enabled: !!productionOrderId && !!statusSlug,
    queryFn: async () => {
      const [{ data: items, error: e1 }, { data: progress, error: e2 }] = await Promise.all([
        supabase.from("production_status_checklist_items" as any)
          .select("id, label, required, active")
          .eq("status_slug", statusSlug)
          .eq("active", true)
          .order("position", { ascending: true }),
        supabase.from("production_order_checklist_progress" as any)
          .select("id, checklist_item_id, completed")
          .eq("production_order_id", productionOrderId),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const map = new Map<string, { id: string; completed: boolean }>(
        (progress ?? []).map((p: any) => [p.checklist_item_id, { id: p.id, completed: p.completed }])
      );
      return ((items ?? []) as any[]).map((it) => ({
        id: it.id,
        label: it.label,
        required: it.required,
        completed: map.get(it.id)?.completed ?? false,
        progress_id: map.get(it.id)?.id ?? null,
      })) as Row[];
    },
  });

  const toggle = useMutation({
    mutationFn: async (row: Row) => {
      const nextCompleted = !row.completed;
      if (row.progress_id) {
        const { error } = await supabase
          .from("production_order_checklist_progress" as any)
          .update({
            completed: nextCompleted,
            completed_at: nextCompleted ? new Date().toISOString() : null,
            completed_by: nextCompleted ? (await supabase.auth.getUser()).data.user?.id ?? null : null,
          })
          .eq("id", row.progress_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("production_order_checklist_progress" as any)
          .insert({
            production_order_id: productionOrderId,
            checklist_item_id: row.id,
            status_slug: statusSlug,
            completed: nextCompleted,
            completed_at: nextCompleted ? new Date().toISOString() : null,
            completed_by: nextCompleted ? (await supabase.auth.getUser()).data.user?.id ?? null : null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["op_checklist", productionOrderId, statusSlug] }),
  });

  if (isLoading) return null;
  if (rows.length === 0) {
    return (
      <div className="border border-dashed rounded-md p-3 text-xs text-muted-foreground bg-muted/10">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>
            Nenhum item de checklist configurado para o status <strong>{statusSlug}</strong>.
          </span>
        </div>
        <div className="mt-1 pl-5">
          Configure em <strong>Produção → Checklists por status</strong>.
        </div>
      </div>
    );
  }

  const pendingRequired = rows.filter((r) => r.required && !r.completed).length;
  const doneCount = rows.filter((r) => r.completed).length;

  return (
    <div className="border rounded-md p-3 space-y-2 bg-muted/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">Checklist da fase</h4>
          <Badge variant="outline" className="text-[10px]">{doneCount}/{rows.length}</Badge>
        </div>
        {pendingRequired > 0 ? (
          <Badge variant="outline" className="text-[10px] gap-1 bg-amber-500/10 text-amber-700 border-amber-500/30">
            <AlertCircle className="h-3 w-3" />
            {pendingRequired} obrigatório(s) pendente(s)
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3" />Liberado para avançar
          </Badge>
        )}
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/40 p-1.5 rounded">
            <Checkbox checked={r.completed} onCheckedChange={() => toggle.mutate(r)} disabled={toggle.isPending} />
            <span className={r.completed ? "line-through text-muted-foreground" : ""}>{r.label}</span>
            {r.required && <Badge variant="outline" className="text-[9px] ml-auto">obrigatório</Badge>}
          </label>
        ))}
      </div>
    </div>
  );
}
