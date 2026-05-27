import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { BriefcaseBusiness, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCompromissosVendaCategories } from "@/hooks/useCompromissosVendaCategories";
import CreateSupplierDialog from "@/components/suppliers/CreateSupplierDialog";

type OrderResponsible = Database["public"]["Tables"]["order_responsibles"]["Row"] & {
  chart_account_id: string | null;
};

export function OrderResponsiblesManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OrderResponsible | null>(null);
  const [deleting, setDeleting] = useState<OrderResponsible | null>(null);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("todos");
  const [newSupplierOpen, setNewSupplierOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [creatingSup, setCreatingSup] = useState(false);
  const [form, setForm] = useState<{ name: string; chart_account_id: string; is_active: boolean; supplier_id: string }>({
    name: "",
    chart_account_id: "",
    is_active: true,
    supplier_id: "",
  });

  const { data: categories = [], isLoading: catsLoading } = useCompromissosVendaCategories(true);

  const categoryById = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    categories.forEach((c) => map.set(c.id, { code: c.code, name: c.name }));
    return map;
  }, [categories]);

  const labelFor = (chartAccountId: string | null | undefined) => {
    if (!chartAccountId) return "—";
    const c = categoryById.get(chartAccountId);
    return c ? `${c.code} ${c.name}` : "—";
  };

  const { data: responsibles, isLoading, refetch } = useQuery({
    queryKey: ["order-responsibles-manager"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_responsibles")
        .select("*, suppliers(id, name)")
        .order("name");

      if (error) throw error;
      return (data ?? []) as unknown as Array<OrderResponsible & { suppliers?: { id: string; name: string } | null }>;
    },
  });

  const { data: suppliers, refetch: refetchSuppliers } = useQuery({
    queryKey: ["suppliers-for-responsibles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleSupplierCreated = async () => {
    const { data: latest } = await supabase
      .from("suppliers")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    await refetchSuppliers();
    if (latest?.id) {
      setForm((prev) => ({ ...prev, supplier_id: latest.id }));
    }
    setNewSupplierOpen(false);
  };


  const filteredResponsibles = useMemo(() => {
    if (!responsibles) return [];
    return responsibles.filter(
      (item) => typeFilter === "todos" || item.chart_account_id === typeFilter,
    );
  }, [responsibles, typeFilter]);

  const handleNew = () => {
    setEditing(null);
    setForm({
      name: "",
      chart_account_id: categories[0]?.id ?? "",
      is_active: true,
      supplier_id: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (responsible: OrderResponsible) => {
    setEditing(responsible);
    setForm({
      name: responsible.name,
      chart_account_id: responsible.chart_account_id ?? "",
      is_active: responsible.is_active,
      supplier_id: responsible.supplier_id || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!form.chart_account_id) {
      toast.error("Selecione o tipo (compromisso sobre venda)");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        chart_account_id: form.chart_account_id,
        is_active: form.is_active,
        supplier_id: form.supplier_id || null,
      };

      if (editing) {
        const { error } = await supabase
          .from("order_responsibles")
          .update(payload)
          .eq("id", editing.id);

        if (error) throw error;
        toast.success("Responsável atualizado!");
      } else {
        const { error } = await supabase
          .from("order_responsibles")
          .insert(payload);

        if (error) throw error;
        toast.success("Responsável criado!");
      }

      await refetch();
      setDialogOpen(false);
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("order_responsibles")
        .delete()
        .eq("id", deleting.id);

      if (error) throw error;

      toast.success("Responsável excluído!");
      setDeleting(null);
      await refetch();
    } catch (error: any) {
      toast.error(error.message?.includes("violates foreign key") ? "Esse responsável já está em uso. Inative em vez de excluir." : "Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-4">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <BriefcaseBusiness className="h-5 w-5" />
            Responsáveis Avulsos
          </CardTitle>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-[240px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleNew} size="sm" className="gap-2" disabled={catsLoading || categories.length === 0}>
          <Plus className="h-4 w-4" />
          Novo Responsável
        </Button>
      </CardHeader>
      <CardContent>
        {categories.length === 0 && !catsLoading && (
          <p className="text-sm text-muted-foreground py-2">
            Nenhuma categoria de Compromissos Sobre Venda ativa. Configure em Cadastros Financeiros → Compromissos Sobre Venda.
          </p>
        )}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo (Compromisso)</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResponsibles.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{labelFor(item.chart_account_id)}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {(item as any).suppliers?.name || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleting(item)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredResponsibles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Nenhum responsável encontrado
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
            <DialogTitle>{editing ? "Editar responsável" : "Novo responsável"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                placeholder="Nome do responsável"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo (Compromisso Sobre Venda) *</Label>
              <Select
                value={form.chart_account_id}
                onValueChange={(value) => setForm((prev) => ({ ...prev, chart_account_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o compromisso..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O tipo segue o padrão cadastrado em Compromissos Sobre Venda. No pedido, o responsável aparecerá no compromisso correspondente.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Fornecedor (Contas a Pagar)</Label>
              <div className="flex gap-2">
                <Select
                  value={form.supplier_id || "none"}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, supplier_id: value === "none" ? "" : value }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione o fornecedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {(suppliers || []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setNewSupplierOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
              />
              <Label>Cadastro ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir responsável?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `Isso removerá ${deleting.name} do cadastro avulso.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateSupplierDialog
        open={newSupplierOpen}
        onOpenChange={setNewSupplierOpen}
        onSuccess={handleSupplierCreated}
      />
    </Card>
  );
}
