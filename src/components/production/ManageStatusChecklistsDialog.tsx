import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useProductionStatusColumns } from "@/hooks/useProductionStatusColumns";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

interface ChecklistItem {
  id: string;
  status_slug: string;
  label: string;
  position: number;
  required: boolean;
  active: boolean;
}

export function ManageStatusChecklistsDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { data: statuses = [] } = useProductionStatusColumns();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const currentSlug = activeSlug ?? statuses[0]?.slug ?? null;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["status_checklist_items", currentSlug],
    enabled: !!currentSlug && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_status_checklist_items" as any)
        .select("*")
        .eq("status_slug", currentSlug!)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ChecklistItem[];
    },
  });

  const create = useMutation({
    mutationFn: async (label: string) => {
      const { error } = await supabase.from("production_status_checklist_items" as any).insert({
        status_slug: currentSlug, label, position: items.length, required: true, active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["status_checklist_items", currentSlug] }); },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  const update = useMutation({
    mutationFn: async (p: { id: string; patch: Partial<ChecklistItem> }) => {
      const { error } = await supabase.from("production_status_checklist_items" as any).update(p.patch).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["status_checklist_items", currentSlug] }); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("production_status_checklist_items" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["status_checklist_items", currentSlug] }); },
  });

  const [newLabel, setNewLabel] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Checklists por Status</DialogTitle>
          <DialogDescription>
            Defina itens obrigatórios para cada status. A OP só avança para o próximo status quando todos os itens obrigatórios da fase atual estiverem concluídos.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentSlug ?? ""} onValueChange={setActiveSlug}>
          <ScrollArea className="w-full">
            <TabsList className="w-max">
              {statuses.map((s) => (
                <TabsTrigger key={s.slug} value={s.slug} className="text-xs">{s.label}</TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>

          {statuses.map((s) => (
            <TabsContent key={s.slug} value={s.slug} className="mt-3 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Novo item do checklist…"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newLabel.trim()) {
                      create.mutate(newLabel.trim(), { onSuccess: () => setNewLabel("") });
                    }
                  }}
                />
                <Button
                  onClick={() => newLabel.trim() && create.mutate(newLabel.trim(), { onSuccess: () => setNewLabel("") })}
                  disabled={!newLabel.trim() || create.isPending}
                  className="gap-1"
                >
                  {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Adicionar
                </Button>
              </div>

              <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
                {isLoading && <div className="p-4 text-sm text-muted-foreground">Carregando…</div>}
                {!isLoading && items.length === 0 && (
                  <div className="p-4 text-sm text-muted-foreground text-center">Nenhum item configurado para "{s.label}"</div>
                )}
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 p-2.5">
                    <Input
                      defaultValue={it.label}
                      className="flex-1 h-8"
                      onBlur={(e) => {
                        if (e.target.value !== it.label && e.target.value.trim()) {
                          update.mutate({ id: it.id, patch: { label: e.target.value.trim() } });
                        }
                      }}
                    />
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-muted-foreground">Obrigatório</Label>
                      <Switch
                        checked={it.required}
                        onCheckedChange={(v) => update.mutate({ id: it.id, patch: { required: v } })}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-muted-foreground">Ativo</Label>
                      <Switch
                        checked={it.active}
                        onCheckedChange={(v) => update.mutate({ id: it.id, patch: { active: v } })}
                      />
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => del.mutate(it.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
