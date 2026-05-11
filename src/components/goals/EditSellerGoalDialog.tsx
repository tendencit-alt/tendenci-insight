import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface EditSellerGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: any;
  onSuccess: () => void;
}

export function EditSellerGoalDialog({ open, onOpenChange, goal, onSuccess }: EditSellerGoalDialogProps) {
  const [formData, setFormData] = useState({
    vendedor_id: "",
    tipo_meta: "vendas",
    valor_meta: "",
    quantidade_meta: "",
    data_inicio: "",
    data_fim: "",
    descricao: "",
  });
  const [loading, setLoading] = useState(false);
  const [sellers, setSellers] = useState<any[]>([]);

  useEffect(() => {
    if (open && goal) {
      setFormData({
        vendedor_id: goal.vendedor_id || "",
        tipo_meta: goal.tipo_meta || "vendas",
        valor_meta: goal.valor_meta?.toString() || "",
        quantidade_meta: goal.quantidade_meta?.toString() || "",
        data_inicio: goal.data_inicio ? format(new Date(goal.data_inicio), "yyyy-MM-dd") : "",
        data_fim: goal.data_fim ? format(new Date(goal.data_fim), "yyyy-MM-dd") : "",
        descricao: goal.descricao || "",
      });
      fetchSellers();
    }
  }, [open, goal]);

  const fetchSellers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "vendedor")
        .order("full_name");

      if (error) throw error;
      setSellers(data || []);
    } catch (error) {
      console.error("Erro ao buscar vendedores:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData: any = {
        vendedor_id: formData.vendedor_id,
        tipo_meta: formData.tipo_meta,
        data_inicio: new Date(formData.data_inicio).toISOString(),
        data_fim: new Date(formData.data_fim).toISOString(),
        descricao: formData.descricao || null,
      };

      if (formData.tipo_meta === "vendas") {
        updateData.valor_meta = parseFloat(formData.valor_meta);
        updateData.quantidade_meta = null;
      } else {
        updateData.valor_meta = null;
        updateData.quantidade_meta = parseInt(formData.quantidade_meta);
      }

      const { error } = await supabase
        .from("tendenci_seller_goals" as any)
        .update(updateData)
        .eq("id", goal.id);

      if (error) throw error;

      toast.success("Meta atualizada com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao atualizar meta:", error);
      toast.error("Erro ao atualizar meta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Meta Individual</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vendedor_id">Vendedor *</Label>
            <Select value={formData.vendedor_id} onValueChange={(value) => setFormData({ ...formData, vendedor_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o vendedor" />
              </SelectTrigger>
              <SelectContent>
                {sellers.map((seller) => (
                  <SelectItem key={seller.id} value={seller.id}>
                    {seller.full_name} ({seller.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo_meta">Tipo de Meta *</Label>
            <Select value={formData.tipo_meta} onValueChange={(value) => setFormData({ ...formData, tipo_meta: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vendas">Vendas (Valor em R$)</SelectItem>
                <SelectItem value="captacao">Captação (Quantidade de Profissionais Parceiros)</SelectItem>
                <SelectItem value="efetivacao">Efetivação (Quantidade de Projetos)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.tipo_meta === "vendas" ? (
            <div className="space-y-2">
              <Label htmlFor="valor_meta">Valor da Meta (R$) *</Label>
              <Input
                id="valor_meta"
                type="number"
                step="0.01"
                required
                value={formData.valor_meta}
                onChange={(e) => setFormData({ ...formData, valor_meta: e.target.value })}
                placeholder="Ex: 50000.00"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="quantidade_meta">
                {formData.tipo_meta === "captacao" ? "Quantidade de Profissionais Parceiros *" : "Quantidade de Projetos *"}
              </Label>
              <Input
                id="quantidade_meta"
                type="number"
                min="1"
                required
                value={formData.quantidade_meta}
                onChange={(e) => setFormData({ ...formData, quantidade_meta: e.target.value })}
                placeholder={formData.tipo_meta === "captacao" ? "Ex: 50" : "Ex: 30"}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_inicio">Data de Início *</Label>
              <Input
                id="data_inicio"
                type="date"
                required
                value={formData.data_inicio}
                onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_fim">Data de Término *</Label>
              <Input
                id="data_fim"
                type="date"
                required
                value={formData.data_fim}
                onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descrição opcional da meta..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
