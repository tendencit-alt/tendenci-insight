import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Star } from "lucide-react";

export default function LocationsManager() {
  const { toast } = useToast();
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: locations = [], refetch } = useQuery({
    queryKey: ["stock-locations-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_locations")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    }
  });

  const handleCreate = async () => {
    if (!newName.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("stock_locations").insert({
        name: newName.trim()
      });
      if (error) throw error;

      toast({ title: "Local criado!" });
      setNewName("");
      refetch();
    } catch (error: any) {
      toast({ title: "Erro ao criar local", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("stock_locations").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Local removido" });
      refetch();
    } catch (error: any) {
      toast({ title: "Erro ao remover local", description: error.message, variant: "destructive" });
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from("stock_locations")
        .update({ active: !active })
        .eq("id", id);
      if (error) throw error;
      refetch();
    } catch (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const setDefault = async (id: string) => {
    try {
      // Remove default de todos
      await supabase.from("stock_locations").update({ is_default: false }).neq("id", "");
      // Define o novo default
      await supabase.from("stock_locations").update({ is_default: true }).eq("id", id);
      refetch();
    } catch (error) {
      toast({ title: "Erro ao definir padrão", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Locais de Estoque</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Novo local/depósito..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button onClick={handleCreate} disabled={loading || !newName.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        <div className="space-y-2">
          {locations.map((loc: any) => (
            <div key={loc.id} className="flex items-center justify-between p-2 border rounded-lg">
              <div className="flex items-center gap-2">
                <span className="font-medium">{loc.name}</span>
                {loc.is_default && (
                  <Badge variant="secondary" className="text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    Padrão
                  </Badge>
                )}
                <Badge variant={loc.active ? "default" : "secondary"} className="cursor-pointer" onClick={() => toggleActive(loc.id, loc.active)}>
                  {loc.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <div className="flex gap-1">
                {!loc.is_default && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDefault(loc.id)} title="Definir como padrão" aria-label="Definir local como padrão">
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(loc.id)} aria-label="Excluir local">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
