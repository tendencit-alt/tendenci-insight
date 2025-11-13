import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CreateCompanyGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCompanyGoalDialog({ open, onOpenChange, onSuccess }: CreateCompanyGoalDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    valor_meta_total: "",
    data_inicio: "",
    data_fim: "",
    descricao: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("tendenci_company_goals").insert({
        valor_meta_total: parseFloat(formData.valor_meta_total),
        data_inicio: formData.data_inicio,
        data_fim: formData.data_fim,
        descricao: formData.descricao,
        criado_por: user?.id,
        status: "ativa",
      });

      if (error) throw error;

      toast.success("Meta consolidada criada com sucesso!");
      onSuccess();
      onOpenChange(false);
      setFormData({
        valor_meta_total: "",
        data_inicio: "",
        data_fim: "",
        descricao: "",
      });
    } catch (error) {
      console.error("Erro ao criar meta:", error);
      toast.error("Erro ao criar meta consolidada");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Meta da Empresa</DialogTitle>
          <DialogDescription>Defina a meta consolidada de vendas para toda a equipe</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_inicio">Data Início *</Label>
              <Input
                id="data_inicio"
                type="date"
                required
                value={formData.data_inicio}
                onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_fim">Data Fim *</Label>
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
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Meta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
