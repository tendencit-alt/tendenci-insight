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

type OrderResponsibleType = Database["public"]["Enums"]["order_responsible_type"];
type OrderResponsible = Database["public"]["Tables"]["order_responsibles"]["Row"];

const TYPE_OPTIONS: Array<{ value: OrderResponsibleType; label: string }> = [
  { value: "vendedor", label: "Vendedor" },
  { value: "orcamentista", label: "Orçamentista" },
  { value: "projetista", label: "Projetista" },
  { value: "montador", label: "Montador" },
  { value: "producao", label: "Produção" },
];

const TYPE_LABELS: Record<OrderResponsibleType, string> = {
  vendedor: "Vendedor",
  orcamentista: "Orçamentista",
  projetista: "Projetista",
  montador: "Montador",
  producao: "Produção",
};

export function OrderResponsiblesManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OrderResponsible | null>(null);
  const [deleting, setDeleting] = useState<OrderResponsible | null>(null);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"todos" | OrderResponsibleType>("todos");
  const [form, setForm] = useState<{ name: string; type: OrderResponsibleType; is_active: boolean; supplier_id: string }>({
    name: "",
    type: "vendedor",
    is_active: true,
    supplier_id: "",
  });

  const { data: responsibles, isLoading, refetch } = useQuery({
    queryKey: ["order-responsibles-manager"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_responsibles")
        .select("*")
        .order("type")
        .order("name");

      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredResponsibles = useMemo(() => {
    if (!responsibles) return [];
    return responsibles.filter((item) => typeFilter === "todos" || item.type === typeFilter);
  }, [responsibles, typeFilter]);

  const handleNew = () => {
    setEditing(null);
    setForm({
      name: "",
      type: "vendedor",
      is_active: true,
    });
    setDialogOpen(true);
  };

  const handleEdit = (responsible: OrderResponsible) => {
    setEditing(responsible);
    setForm({
      name: responsible.name,
      type: responsible.type,
      is_active: responsible.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        is_active: form.is_active,
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
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as "todos" | OrderResponsibleType)}>
            <SelectTrigger className="h-8 w-[180px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleNew} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Responsável
        </Button>
      </CardHeader>
      <CardContent>
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
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResponsibles.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{TYPE_LABELS[item.type]}</Badge>
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
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
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
              <Label>Tipo *</Label>
              <Select value={form.type} onValueChange={(value) => setForm((prev) => ({ ...prev, type: value as OrderResponsibleType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    </Card>
  );
}
