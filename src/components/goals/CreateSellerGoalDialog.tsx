import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CreateSellerGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateSellerGoalDialog({ open, onOpenChange, onSuccess }: CreateSellerGoalDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sellers, setSellers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    vendedor_id: "",
    tipo_meta: "vendas",
    valor_meta: "",
    quantidade_meta: "",
    data_inicio: "",
    data_fim: "",
    descricao: "",
  });

  useEffect(() => {
    if (open) {
      fetchSellers();
    }
  }, [open]);

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
      toast.error("Erro ao carregar vendedores");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const insertData: any = {
        vendedor_id: formData.vendedor_id,
        tipo_meta: formData.tipo_meta,
        data_inicio: formData.data_inicio,
        data_fim: formData.data_fim,
        descricao: formData.descricao,
        criado_por: user?.id,
        status: "ativa",
      };

      // Adicionar valor ou quantidade conforme o tipo
      if (formData.tipo_meta === "vendas") {
        insertData.valor_meta = parseFloat(formData.valor_meta);
      } else {
        insertData.quantidade_meta = parseInt(formData.quantidade_meta);
      }

      // Gerar UUID para a meta
      const goalId = crypto.randomUUID();
      
      const insertDataWithId = {
        ...insertData,
        id: goalId
      };

      const { error: insertError } = await supabase
        .from("tendenci_seller_goals" as any)
        .insert(insertDataWithId);

      if (insertError) throw insertError;

      // Criar registro de progresso inicial
      const { error: progressError } = await supabase
        .from("tendenci_goal_progress" as any)
        .insert({
          seller_goal_id: goalId,
          valor_vendido: 0,
          percentual: 0,
          quantidade_alcancada: 0
        });

      if (progressError) {
        console.error("Erro ao criar progresso inicial:", progressError);
      }

      toast.success("Meta individual criada com sucesso!");
      onSuccess();
      onOpenChange(false);
      setFormData({
        vendedor_id: "",
        tipo_meta: "vendas",
        valor_meta: "",
        quantidade_meta: "",
        data_inicio: "",
        data_fim: "",
        descricao: "",
      });
    } catch (error) {
      console.error("Erro ao criar meta:", error);
      toast.error("Erro ao criar meta individual");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Meta Individual</DialogTitle>
          <DialogDescription>Defina uma meta para um vendedor específico</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vendedor">Vendedor *</Label>
            <Select value={formData.vendedor_id} onValueChange={(value) => setFormData({ ...formData, vendedor_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o vendedor" />
              </SelectTrigger>
              <SelectContent>
                {sellers.map((seller) => (
                  <SelectItem key={seller.id} value={seller.id}>
                    {seller.full_name || seller.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo_meta">Tipo de Meta *</Label>
            <Select 
              value={formData.tipo_meta} 
              onValueChange={(value) => setFormData({ ...formData, tipo_meta: value, valor_meta: "", quantidade_meta: "" })}
            >
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
                {formData.tipo_meta === "captacao" ? "Quantidade de Parceiros Profissionais *" : "Quantidade de Projetos *"}
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
