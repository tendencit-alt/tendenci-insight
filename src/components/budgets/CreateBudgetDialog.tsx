import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

interface CreateBudgetDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (budgetId: string) => void;
}

export function CreateBudgetDialog({ projectId, open, onOpenChange, onSuccess }: CreateBudgetDialogProps) {
  const [name, setName] = useState("");
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
      
      const { data, error } = await supabase
        .from('project_budgets')
        .insert({
          project_id: projectId,
          name: name.trim(),
          markup_percent: 50,
          discount_percent: 0,
          total_cost: 0,
          total_price: 0,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Orçamento criado! Adicione produtos para compor o custo técnico.");
      onOpenChange(false);
      resetForm();
      onSuccess(data.id);
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar orçamento");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Novo Orçamento Técnico
          </DialogTitle>
          <DialogDescription>
            Crie um orçamento baseado em insumos reais. O custo é calculado automaticamente 
            a partir das linhas técnicas de cada produto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Orçamento *</Label>
            <Input
              id="name"
              placeholder="Ex: Cozinha Planejada, Closet Master..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 bg-muted/30">
            <p className="text-sm text-muted-foreground">
              <strong>Próximos passos:</strong>
            </p>
            <ol className="text-sm text-muted-foreground mt-2 list-decimal list-inside space-y-1">
              <li>Adicione produtos (caixotes, portas, prateleiras...)</li>
              <li>Cada produto terá linhas técnicas com custo unitário</li>
              <li>O sistema soma tudo automaticamente</li>
              <li>Configure markup e desconto no final</li>
            </ol>
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
                "Criar e Continuar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
