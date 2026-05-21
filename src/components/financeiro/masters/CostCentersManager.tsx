import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Building2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { numericCodeSort } from "@/lib/numericCodeSort";

type CC = {
  id: string;
  name: string;
  code: string | null;
  active: boolean;
  parent_id: string | null;
  is_system_default?: boolean;
};

export function CostCentersManager() {
  const { activeTenantId } = useActiveTenant();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CC | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    active: true,
    parent_id: "none" as string,
  });

  const { data: centers, isLoading, refetch } = useQuery({
    queryKey: ["fin-cost-centers-all", activeTenantId],
    enabled: !!activeTenantId,
    queryFn: async () => {
      let q = supabase.from("fin_cost_centers").select("*").order("code");
      if (activeTenantId) q = q.eq("tenant_id", activeTenantId);
      const { data } = await q;
      return (data as CC[]) || [];
    },
  });

  const parents = useMemo(
    () => (centers || []).filter((c) => !c.parent_id),
    [centers]
  );

  const childrenByParent = useMemo(() => {
    const map = new Map<string, CC[]>();
    (centers || []).forEach((c) => {
      if (c.parent_id) {
        if (!map.has(c.parent_id)) map.set(c.parent_id, []);
        map.get(c.parent_id)!.push(c);
      }
    });
    map.forEach((arr, k) => map.set(k, numericCodeSort(arr, "code")));
    return map;
  }, [centers]);

  const hasChildren = (id: string) => (childrenByParent.get(id)?.length ?? 0) > 0;

  const handleEdit = (center: CC) => {
    setEditing(center);
    setForm({
      name: center.name || "",
      code: center.code || "",
      active: center.active ?? true,
      parent_id: center.parent_id || "none",
    });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditing(null);
    setForm({ name: "", code: "", active: true, parent_id: "none" });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (editing && form.parent_id !== "none" && form.parent_id === editing.id) {
      toast.error("Um centro de custo não pode ser pai de si mesmo");
      return;
    }

    setLoading(true);
    try {
      const data: any = {
        name: form.name,
        code: form.code || null,
        active: form.active,
        parent_id: form.parent_id === "none" ? null : form.parent_id,
      };

      if (editing) {
        const { error } = await supabase
          .from("fin_cost_centers")
          .update(data)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Centro de custo atualizado!");
      } else {
        const { error } = await supabase
          .from("fin_cost_centers")
          .insert(data);
        if (error) throw error;
        toast.success("Centro de custo criado!");
      }

      refetch();
      setDialogOpen(false);
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const sortedParents = useMemo(() => numericCodeSort(parents, "code"), [parents]);

  const isSystemDefault = editing?.is_system_default === true;

  const renderRow = (center: CC, isChild = false) => {
    const parent = hasChildren(center.id);
    return (
      <TableRow key={center.id}>
        <TableCell className="font-medium">
          <span className={isChild ? "pl-6 text-muted-foreground" : ""}>
            {isChild && "↳ "}
            {center.code || "-"}
          </span>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <span className={isChild ? "pl-2" : "font-semibold"}>{center.name}</span>
            {center.is_system_default && (
              <Tooltip>
                <TooltipTrigger>
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                </TooltipTrigger>
                <TooltipContent>Padrão do sistema</TooltipContent>
              </Tooltip>
            )}
            {parent && (
              <Badge variant="outline" className="text-[10px]">
                Consolidador
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          {center.active ? (
            <Badge className="bg-green-600">Ativo</Badge>
          ) : (
            <Badge variant="secondary">Inativo</Badge>
          )}
        </TableCell>
        <TableCell>
          <Button variant="ghost" size="sm" onClick={() => handleEdit(center)}>
            <Pencil className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Centros de Custo
        </CardTitle>
        <Button onClick={handleNew} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Centro
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Centros pai apenas consolidam os filhos e não recebem lançamentos. Lançamentos devem ser feitos nos centros filhos.
        </p>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedParents.flatMap((p) => [
                renderRow(p),
                ...(childrenByParent.get(p.id) || []).map((c) => renderRow(c, true)),
              ])}
              {centers?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhum centro de custo cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Centro de Custo" : "Novo Centro de Custo"}</DialogTitle>
          </DialogHeader>

          {isSystemDefault && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-sm">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span>Este centro de custo é padrão do sistema e não pode ser desativado ou excluído.</span>
            </div>
          )}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                placeholder="Ex: 110"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                placeholder="Nome do centro de custo..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Centro pai (opcional)</Label>
              <Select
                value={form.parent_id}
                onValueChange={(v) => setForm({ ...form, parent_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum (será um centro pai)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (centro pai / consolidador)</SelectItem>
                  {sortedParents
                    .filter((p) => !editing || p.id !== editing.id)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Centros sem pai funcionam como consolidadores e não recebem lançamentos.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.active}
                onCheckedChange={(checked) => setForm({ ...form, active: checked })}
                disabled={isSystemDefault}
              />
              <Label>Centro de custo ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
