import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface CostCenterTag {
  id: string;
  name: string;
  color: string;
  active: boolean;
  created_at: string;
}

const AVAILABLE_COLORS = [
  { value: "bg-purple-100 text-purple-800", label: "Roxo" },
  { value: "bg-blue-100 text-blue-800", label: "Azul" },
  { value: "bg-amber-100 text-amber-800", label: "Âmbar" },
  { value: "bg-green-100 text-green-800", label: "Verde" },
  { value: "bg-pink-100 text-pink-800", label: "Rosa" },
  { value: "bg-yellow-100 text-yellow-800", label: "Amarelo" },
  { value: "bg-emerald-100 text-emerald-800", label: "Esmeralda" },
  { value: "bg-red-100 text-red-800", label: "Vermelho" },
  { value: "bg-indigo-100 text-indigo-800", label: "Índigo" },
  { value: "bg-cyan-100 text-cyan-800", label: "Ciano" },
  { value: "bg-orange-100 text-orange-800", label: "Laranja" },
  { value: "bg-slate-100 text-slate-800", label: "Cinza" }
];

export default function CostCenterManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<CostCenterTag | null>(null);
  const [formData, setFormData] = useState({ name: "", color: AVAILABLE_COLORS[0].value });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ["cost-center-tags-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_center_tags")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as CostCenterTag[];
    }
  });

  const { data: usageCounts = {} } = useQuery({
    queryKey: ["cost-center-usage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_cost_centers")
        .select("cost_center_id");
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(item => {
        counts[item.cost_center_id] = (counts[item.cost_center_id] || 0) + 1;
      });
      return counts;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      const { error } = await supabase
        .from("cost_center_tags")
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-center-tags-all"] });
      queryClient.invalidateQueries({ queryKey: ["cost-center-tags"] });
      setDialogOpen(false);
      setFormData({ name: "", color: AVAILABLE_COLORS[0].value });
      toast({ title: "Centro de custo criado!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar",
        description: error.message?.includes("duplicate") ? "Já existe um centro de custo com esse nome" : error.message,
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CostCenterTag> }) => {
      const { error } = await supabase
        .from("cost_center_tags")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-center-tags-all"] });
      queryClient.invalidateQueries({ queryKey: ["cost-center-tags"] });
      setDialogOpen(false);
      setEditingTag(null);
      setFormData({ name: "", color: AVAILABLE_COLORS[0].value });
      toast({ title: "Centro de custo atualizado!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cost_center_tags")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-center-tags-all"] });
      queryClient.invalidateQueries({ queryKey: ["cost-center-tags"] });
      queryClient.invalidateQueries({ queryKey: ["cost-center-usage"] });
      toast({ title: "Centro de custo removido!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleOpenCreate = () => {
    setEditingTag(null);
    setFormData({ name: "", color: AVAILABLE_COLORS[0].value });
    setDialogOpen(true);
  };

  const handleOpenEdit = (tag: CostCenterTag) => {
    setEditingTag(tag);
    setFormData({ name: tag.name, color: tag.color });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "Digite um nome", variant: "destructive" });
      return;
    }

    if (editingTag) {
      updateMutation.mutate({ id: editingTag.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleToggleActive = (tag: CostCenterTag) => {
    updateMutation.mutate({ id: tag.id, data: { active: !tag.active } });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5" />
              Centros de Custo
            </CardTitle>
            <CardDescription>
              Gerencie as tags de centro de custo para classificar produtos
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Centro de Custo
          </Button>
        </CardHeader>
        <CardContent>
          {tags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tags className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum centro de custo cadastrado</p>
              <Button onClick={handleOpenCreate} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro centro de custo
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead className="text-center">Produtos</TableHead>
                    <TableHead className="text-center">Ativo</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tags.map(tag => (
                    <TableRow key={tag.id} className={!tag.active ? "opacity-50" : ""}>
                      <TableCell className="font-medium">{tag.name}</TableCell>
                      <TableCell>
                        <Badge className={cn(tag.color, "text-xs")}>{tag.name}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {usageCounts[tag.id] || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={tag.active}
                          onCheckedChange={() => handleToggleActive(tag)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(tag)}
                            aria-label={`Editar ${tag.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(tag.id)}
                            disabled={(usageCounts[tag.id] || 0) > 0}
                            title={(usageCounts[tag.id] || 0) > 0 ? "Remova os produtos antes de excluir" : "Excluir"}
                            aria-label={`Excluir ${tag.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTag ? "Editar Centro de Custo" : "Novo Centro de Custo"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Marcenaria"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="color">Cor</Label>
              <Select
                value={formData.color}
                onValueChange={(value) => setFormData({ ...formData, color: value })}
              >
                <SelectTrigger>
                  <SelectValue>
                    <Badge className={cn(formData.color, "text-xs")}>
                      {formData.name || "Exemplo"}
                    </Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_COLORS.map(color => (
                    <SelectItem key={color.value} value={color.value}>
                      <Badge className={cn(color.value, "text-xs")}>{color.label}</Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingTag ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
