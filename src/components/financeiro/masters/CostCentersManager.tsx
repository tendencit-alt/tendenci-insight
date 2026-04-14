import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, Pencil, Building2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { numericCodeSort } from "@/lib/numericCodeSort";

export function CostCentersManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    active: true,
  });

  const { data: centers, isLoading, refetch } = useQuery({
    queryKey: ["fin-cost-centers-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_cost_centers")
        .select("*")
        .order("code");
      return data || [];
    },
  });

  const handleEdit = (center: any) => {
    setEditing(center);
    setForm({
      name: center.name || "",
      code: center.code || "",
      active: center.active ?? true,
    });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditing(null);
    setForm({ name: "", code: "", active: true });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name) {
      toast.error("Nome é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const data = {
        name: form.name,
        code: form.code || null,
        active: form.active,
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

  const sortedCenters = useMemo(() => numericCodeSort(centers || [], 'code'), [centers]);

  const isSystemDefault = editing?.is_system_default === true;

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
              {sortedCenters.map((center) => (
                <TableRow key={center.id}>
                  <TableCell className="font-medium">{center.code || "-"}</TableCell>
                  <TableCell className="flex items-center gap-2">
                    {center.name}
                    {(center as any).is_system_default && (
                      <Tooltip>
                        <TooltipTrigger>
                          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        </TooltipTrigger>
                        <TooltipContent>Padrão do sistema — não pode ser desativado</TooltipContent>
                      </Tooltip>
                    )}
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
              ))}
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
              <span>Este centro de custo é padrão do sistema e não pode ser desativado.</span>
            </div>
          )}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                placeholder="Ex: CC001"
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
