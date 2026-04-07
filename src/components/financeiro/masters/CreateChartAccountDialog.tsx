import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/financeiro/SearchableSelect";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type ChartAccount = {
  id: string;
  code: string;
  name: string;
  parent_id: string | null;
};

interface CreateChartAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}

export function CreateChartAccountDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateChartAccountDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: parentAccounts } = useQuery({
    queryKey: ["fin-chart-accounts-despesa-parents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fin_chart_accounts")
        .select("id, code, name, parent_id")
        .eq("nature", "DESPESA")
        .eq("active", true)
        .order("code");
      if (error) throw error;
      return (data ?? []) as ChartAccount[];
    },
    enabled: open,
  });

  const parentOptions = useMemo(
    () =>
      (parentAccounts ?? []).map((a) => ({
        value: a.id,
        label: `${a.code} - ${a.name}`,
      })),
    [parentAccounts],
  );

  const generateNextCode = (parentCode: string | null, siblings: ChartAccount[]) => {
    if (!parentCode) {
      const rootCodes = siblings
        .filter((a) => !a.parent_id)
        .map((a) => parseInt(a.code, 10))
        .filter((n) => !isNaN(n));
      const next = rootCodes.length > 0 ? Math.max(...rootCodes) + 1 : 1;
      return String(next);
    }
    const childCodes = siblings
      .map((a) => a.code)
      .filter((c) => c.startsWith(parentCode + "."))
      .map((c) => {
        const parts = c.split(".");
        return parseInt(parts[parts.length - 1], 10);
      })
      .filter((n) => !isNaN(n));
    const next = childCodes.length > 0 ? Math.max(...childCodes) + 1 : 1;
    return `${parentCode}.${next}`;
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome da categoria.");
      return;
    }
    setSaving(true);
    try {
      const allAccounts = parentAccounts ?? [];
      const parent = parentId ? allAccounts.find((a) => a.id === parentId) : null;
      const newCode = generateNextCode(parent?.code ?? null, allAccounts);

      const { data, error } = await supabase
        .from("fin_chart_accounts")
        .insert({
          code: newCode,
          name: name.trim(),
          nature: "DESPESA",
          in_dre: true,
          in_cashflow: true,
          active: true,
          parent_id: parentId,
        })
        .select("id")
        .single();

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["fin-chart-accounts-despesa-active"] });
      await queryClient.invalidateQueries({ queryKey: ["fin-chart-accounts-despesa-parents"] });
      toast.success(`Categoria "${name.trim()}" criada com código ${newCode}`);
      onCreated(data.id);
      setName("");
      setParentId(null);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar categoria");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Categoria no Plano de Contas</DialogTitle>
          <DialogDescription>
            A categoria será criada como DESPESA e aparecerá automaticamente no DRE e Fluxo de Caixa.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome da categoria</Label>
            <Input
              placeholder="Ex: Comissão Vendedor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Categoria pai (opcional)</Label>
            <SearchableSelect
              options={[{ value: "__none__", label: "Raiz (sem pai)" }, ...parentOptions]}
              value={parentId ?? "__none__"}
              onChange={(v) => setParentId(v === "__none__" ? null : v)}
              placeholder="Selecione a categoria pai..."
              searchPlaceholder="Buscar..."
              emptyMessage="Nenhuma categoria encontrada."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Categoria
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
