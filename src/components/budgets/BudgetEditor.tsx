import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { BudgetProductCard } from "./BudgetProductCard";
import { BudgetSummary } from "./BudgetSummary";
import { AddProductDialog } from "./AddProductDialog";

interface Budget {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  markup_percent: number | null;
  discount_percent: number | null;
  total_cost: number | null;
  total_price: number | null;
  status: string | null;
  created_at: string | null;
}

interface BudgetEditorProps {
  budget: Budget;
  onBack: () => void;
  onRefresh: () => void;
}

export function BudgetEditor({ budget, onBack, onRefresh }: BudgetEditorProps) {
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);
  const [markup, setMarkup] = useState(budget.markup_percent || 50);
  const [discount, setDiscount] = useState(budget.discount_percent || 0);
  const queryClient = useQueryClient();

  const { data: products = [], isLoading: productsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ['budget-products', budget.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_products')
        .select('*')
        .eq('budget_id', budget.id)
        .order('position', { ascending: true });

      if (error) throw error;
      return data;
    }
  });

  const updateBudgetMutation = useMutation({
    mutationFn: async (data: Partial<Budget>) => {
      const { error } = await supabase
        .from('project_budgets')
        .update(data)
        .eq('id', budget.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      setEditingSettings(false);
      toast.success("Configurações salvas!");
      onRefresh();
    },
    onError: () => {
      toast.error("Erro ao salvar configurações");
    }
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: async () => {
      // Delete all product lines first
      for (const product of products) {
        await supabase
          .from('budget_product_lines')
          .delete()
          .eq('product_id', product.id);
      }

      // Delete all products
      await supabase
        .from('budget_products')
        .delete()
        .eq('budget_id', budget.id);

      // Delete the budget
      const { error } = await supabase
        .from('project_budgets')
        .delete()
        .eq('id', budget.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      toast.success("Orçamento excluído");
      onBack();
    },
    onError: () => {
      toast.error("Erro ao excluir orçamento");
    }
  });

  const handleSaveSettings = () => {
    updateBudgetMutation.mutate({
      markup_percent: markup,
      discount_percent: discount
    });
  };

  const totalCost = products.reduce((sum, p) => sum + (p.total_cost || 0), 0);
  const markupPercent = budget.markup_percent || 50;
  const discountPercent = budget.discount_percent || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <div>
            <h3 className="font-semibold text-lg">{budget.name}</h3>
            {budget.description && (
              <p className="text-sm text-muted-foreground">{budget.description}</p>
            )}
          </div>
          <Badge variant="outline">
            {budget.status === 'aprovado' ? 'Aprovado' : 
             budget.status === 'recusado' ? 'Recusado' : 'Rascunho'}
          </Badge>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setEditingSettings(!editingSettings)}
          >
            <Settings className="h-4 w-4 mr-1" />
            Configurações
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm('Tem certeza que deseja excluir este orçamento?')) {
                deleteBudgetMutation.mutate();
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {editingSettings && (
        <Card className="p-4">
          <h4 className="font-medium mb-4">Configurações do Orçamento</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Markup (%)</Label>
              <Input
                type="number"
                min={0}
                max={200}
                value={markup}
                onChange={(e) => setMarkup(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Margem de lucro sobre o custo
              </p>
            </div>
            <div className="space-y-2">
              <Label>Desconto (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Desconto aplicado no preço final
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setEditingSettings(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSettings} disabled={updateBudgetMutation.isPending}>
              {updateBudgetMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Salvar
            </Button>
          </div>
        </Card>
      )}

      <Separator />

      {/* Products Section */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Produtos ({products.length})</h4>
        <Button size="sm" onClick={() => setAddProductOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar Produto
        </Button>
      </div>

      {productsLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : products.length > 0 ? (
        <div className="space-y-3">
          {products.map(product => (
            <BudgetProductCard
              key={product.id}
              product={product}
              markupPercent={markupPercent}
              onRefresh={() => {
                refetchProducts();
                onRefresh();
              }}
            />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            Nenhum produto adicionado. Adicione produtos para compor o orçamento.
          </p>
          <Button onClick={() => setAddProductOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Produto
          </Button>
        </Card>
      )}

      {/* Summary */}
      {products.length > 0 && (
        <BudgetSummary
          totalCost={totalCost}
          markupPercent={markupPercent}
          discountPercent={discountPercent}
        />
      )}

      {/* Dialogs */}
      <AddProductDialog
        budgetId={budget.id}
        open={addProductOpen}
        onOpenChange={setAddProductOpen}
        onSuccess={() => {
          refetchProducts();
          onRefresh();
        }}
      />
    </div>
  );
}
