import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2 } from "lucide-react";

export default function CategoriesManager() {
  const { toast } = useToast();
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: categories = [], refetch } = useQuery({
    queryKey: ["product-categories-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .order("position");
      if (error) throw error;
      return data;
    }
  });

  const handleCreate = async () => {
    if (!newName.trim()) return;

    setLoading(true);
    try {
      const maxPosition = Math.max(0, ...categories.map((c: any) => c.position));
      const { error } = await supabase.from("product_categories").insert({
        name: newName.trim(),
        position: maxPosition + 1
      });
      if (error) throw error;

      toast({ title: "Categoria criada!" });
      setNewName("");
      refetch();
    } catch (error: any) {
      toast({ title: "Erro ao criar categoria", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("product_categories").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Categoria removida" });
      refetch();
    } catch (error: any) {
      toast({ title: "Erro ao remover categoria", description: error.message, variant: "destructive" });
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from("product_categories")
        .update({ active: !active })
        .eq("id", id);
      if (error) throw error;
      refetch();
    } catch (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Categorias de Produtos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Nova categoria..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button onClick={handleCreate} disabled={loading || !newName.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        <div className="space-y-2">
          {categories.map((cat: any) => (
            <div key={cat.id} className="flex items-center justify-between p-2 border rounded-lg">
              <div className="flex items-center gap-2">
                <span className="font-medium">{cat.name}</span>
                <Badge variant={cat.active ? "default" : "secondary"} className="cursor-pointer" onClick={() => toggleActive(cat.id, cat.active)}>
                  {cat.active ? "Ativa" : "Inativa"}
                </Badge>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(cat.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
