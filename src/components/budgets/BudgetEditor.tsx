import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, Trash2, Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { BudgetProductCard } from "./BudgetProductCard";
import { BudgetSummary } from "./BudgetSummary";
import { BudgetTechnicalSummary } from "./BudgetTechnicalSummary";
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

  // Fetch global costs
  const { data: globalCosts = [] } = useQuery({
    queryKey: ['budget-global-costs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_global_costs')
        .select('*')
        .eq('active', true)
        .order('category')
        .order('name');

      if (error) throw error;
      return data;
    }
  });

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

  // Fetch all lines for all products to show technical summary
  const { data: allLines = [] } = useQuery({
    queryKey: ['budget-all-lines', budget.id],
    queryFn: async () => {
      if (products.length === 0) return [];
      
      const productIds = products.map(p => p.id);
      const { data, error } = await supabase
        .from('budget_product_lines')
        .select('*')
        .in('product_id', productIds);

      if (error) throw error;
      return data;
    },
    enabled: products.length > 0
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

  // Recalculate all lines that reference global costs
  const recalculateMutation = useMutation({
    mutationFn: async () => {
      // Get all lines that have cost references
      const linesWithRefs = allLines.filter(line => line.cost_ref_id);
      
      for (const line of linesWithRefs) {
        const globalCost = globalCosts.find(g => g.id === line.cost_ref_id);
        if (globalCost && globalCost.value !== line.unit_cost) {
          await supabase
            .from('budget_product_lines')
            .update({ 
              unit_cost: globalCost.value,
              subtotal: line.quantity * globalCost.value
            })
            .eq('id', line.id);
        }
      }

      // Update product totals
      for (const product of products) {
        const productLines = allLines.filter(l => l.product_id === product.id);
        const totalCost = productLines.reduce((sum, l) => {
          const globalCost = globalCosts.find(g => g.id === l.cost_ref_id);
          const unitCost = globalCost ? globalCost.value : l.unit_cost;
          return sum + (l.quantity * unitCost);
        }, 0);

        await supabase
          .from('budget_products')
          .update({ 
            total_cost: totalCost,
            unit_cost: totalCost 
          })
          .eq('id', product.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-products', budget.id] });
      queryClient.invalidateQueries({ queryKey: ['budget-all-lines', budget.id] });
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      toast.success("Orçamento recalculado com custos atualizados!");
      onRefresh();
    },
    onError: () => {
      toast.error("Erro ao recalcular orçamento");
    }
  });

  const handleSaveSettings = () => {
    updateBudgetMutation.mutate({
      markup_percent: markup,
      discount_percent: discount
    });
  };

  // Calculate total from lines
  const totalCost = allLines.reduce((sum, line) => {
    const globalCost = globalCosts.find(g => g.id === line.cost_ref_id);
    const unitCost = globalCost ? globalCost.value : line.unit_cost;
    return sum + (line.quantity * unitCost);
  }, 0);
  
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
            onClick={() => recalculateMutation.mutate()}
            disabled={recalculateMutation.isPending}
          >
            {recalculateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Recalcular
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setEditingSettings(!editingSettings)}
          >
            <Settings className="h-4 w-4 mr-1" />
            Markup/Desconto
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
        <Card className="p-4 border-primary/30 bg-primary/5">
          <h4 className="font-medium mb-2">Configurações Comerciais</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Aplique markup e desconto sobre o custo técnico total
          </p>
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

      {/* Technical Summary - HIGHLIGHTED */}
      {allLines.length > 0 && (
        <BudgetTechnicalSummary 
          products={products}
          allLines={allLines}
          globalCosts={globalCosts}
        />
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
              globalCosts={globalCosts}
              onRefresh={() => {
                refetchProducts();
                queryClient.invalidateQueries({ queryKey: ['budget-all-lines', budget.id] });
                onRefresh();
              }}
            />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            Nenhum produto adicionado. Adicione produtos para compor o custo técnico.
          </p>
          <Button onClick={() => setAddProductOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Produto
          </Button>
        </Card>
      )}

      {/* Commercial Summary */}
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
          queryClient.invalidateQueries({ queryKey: ['budget-all-lines', budget.id] });
          onRefresh();
        }}
      />
    </div>
  );
}
