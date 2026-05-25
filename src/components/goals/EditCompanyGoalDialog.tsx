import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DateBrInput } from "@/components/ui/date-br-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface EditCompanyGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: any;
  onSuccess: () => void;
}

export function EditCompanyGoalDialog({ open, onOpenChange, goal, onSuccess }: EditCompanyGoalDialogProps) {
  const [formData, setFormData] = useState({
    tipo_meta: "vendas",
    valor_meta_total: "",
    quantidade_meta: "",
    data_inicio: "",
    data_fim: "",
    descricao: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && goal) {
      setFormData({
        tipo_meta: goal.tipo_meta || "vendas",
        valor_meta_total: goal.valor_meta_total?.toString() || "",
        quantidade_meta: goal.quantidade_meta?.toString() || "",
        data_inicio: goal.data_inicio ? format(new Date(goal.data_inicio), "yyyy-MM-dd") : "",
        data_fim: goal.data_fim ? format(new Date(goal.data_fim), "yyyy-MM-dd") : "",
        descricao: goal.descricao || "",
      });
    }
  }, [open, goal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData: any = {
        tipo_meta: formData.tipo_meta,
        data_inicio: new Date(formData.data_inicio).toISOString(),
        data_fim: new Date(formData.data_fim).toISOString(),
        descricao: formData.descricao || null,
      };

      if (formData.tipo_meta === "vendas") {
        updateData.valor_meta_total = parseFloat(formData.valor_meta_total);
        updateData.quantidade_meta = null;
      } else {
        updateData.valor_meta_total = null;
        updateData.quantidade_meta = parseInt(formData.quantidade_meta);
      }

      const { error } = await supabase
        .from("tendenci_company_goals" as any)
        .update(updateData)
        .eq("id", goal.id);

      if (error) throw error;

      toast.success("Meta da empresa atualizada com sucesso!");
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
          <DialogTitle>Editar Meta da Empresa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tipo_meta">Tipo de Meta *</Label>
            <Select value={formData.tipo_meta} onValueChange={(value) => setFormData({ ...formData, tipo_meta: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vendas">Vendas (Valor em R$)</SelectItem>
                <SelectItem value="captacao">Captação (Quantidade de Parceiros Profissionais)</SelectItem>
                <SelectItem value="efetivacao">Efetivação (Quantidade de Projetos)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.tipo_meta === "vendas" ? (
            <div className="space-y-2">
              <Label htmlFor="valor_meta_total">Valor Total da Meta (R$) *</Label>
              <Input
                id="valor_meta_total"
                type="number"
                step="0.01"
                required
                value={formData.valor_meta_total}
                onChange={(e) => setFormData({ ...formData, valor_meta_total: e.target.value })}
                placeholder="Ex: 500000.00"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="quantidade_meta">
                {formData.tipo_meta === "captacao" ? "Quantidade Total de Parceiros Profissionais *" : "Quantidade Total de Projetos *"}
              </Label>
              <Input
                id="quantidade_meta"
                type="number"
                min="1"
                required
                value={formData.quantidade_meta}
                onChange={(e) => setFormData({ ...formData, quantidade_meta: e.target.value })}
                placeholder={formData.tipo_meta === "captacao" ? "Ex: 500" : "Ex: 300"}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_inicio">Data de Início *</Label>
              <DateBrInput
                id="data_inicio"
                required
                value={formData.data_inicio}
                onChange={(iso) => setFormData({ ...formData, data_inicio: iso })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_fim">Data de Término *</Label>
              <DateBrInput
                id="data_fim"
                required
                value={formData.data_fim}
                onChange={(iso) => setFormData({ ...formData, data_fim: iso })}
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
