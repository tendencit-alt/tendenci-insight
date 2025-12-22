import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateBudgetDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateBudgetDialog({ projectId, open, onOpenChange, onSuccess }: CreateBudgetDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [markup, setMarkup] = useState(50);
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('project_budgets')
        .insert({
          project_id: projectId,
          name: name.trim(),
          description: description.trim() || null,
          markup_percent: markup,
          discount_percent: discount,
          total_cost: 0,
          total_price: 0,
          created_by: user?.id
        });

      if (error) throw error;

      toast.success("Orçamento criado com sucesso!");
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar orçamento");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setMarkup(50);
    setDiscount(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Orçamento Técnico</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Orçamento *</Label>
            <Input
              id="name"
              placeholder="Ex: Cozinha Planejada"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descrição detalhada do orçamento..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="markup">Markup (%)</Label>
              <Input
                id="markup"
                type="number"
                min={0}
                max={200}
                value={markup}
                onChange={(e) => setMarkup(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Margem sobre o custo
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Desconto (%)</Label>
              <Input
                id="discount"
                type="number"
                min={0}
                max={100}
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Desconto sobre o preço
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Orçamento"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
