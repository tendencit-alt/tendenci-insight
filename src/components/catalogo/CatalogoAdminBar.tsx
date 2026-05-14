import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Tags, Loader2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import CreateProductDialog from "@/components/inventory/CreateProductDialog";

interface Props {
  onProductCreated: () => void;
}

export function CatalogoAdminBar({ onProductCreated }: Props) {
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: categories = [], refetch } = useQuery({
    queryKey: ["product-categories"],
    enabled: categoriesOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("id, name, active")
        .order("position");
      if (error) throw error;
      return data || [];
    },
  });

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("product_categories")
        .insert({ name: newCategory.trim(), active: true } as any);
      if (error) throw error;
      setNewCategory("");
      await refetch();
      qc.invalidateQueries({ queryKey: ["product-categories"] });
      toast({ title: "Categoria criada" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from("product_categories")
        .update({ active: false } as any)
        .eq("id", id);
      if (error) throw error;
      await refetch();
      qc.invalidateQueries({ queryKey: ["product-categories"] });
      toast({ title: "Categoria removida" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <>
      <div className="flex justify-end gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={() => setCategoriesOpen(true)}>
          <Tags className="h-4 w-4 mr-2" />
          Categorias
        </Button>
        <Button size="sm" onClick={() => setCreateProductOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      <CreateProductDialog
        open={createProductOpen}
        onOpenChange={setCreateProductOpen}
        onSuccess={onProductCreated}
        ativoNoCatalogoDefault
      />

      <Dialog open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Categorias do Catálogo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Nova categoria"
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
              />
              <Button onClick={addCategory} disabled={saving || !newCategory.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
              </Button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {categories.filter((c: any) => c.active).map((cat: any) => (
                <div key={cat.id} className="flex items-center justify-between p-2 rounded border">
                  <Badge variant="secondary">{cat.name}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCategory(cat.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {categories.filter((c: any) => c.active).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma categoria cadastrada
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoriesOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
