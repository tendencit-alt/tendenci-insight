import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Plus, Trash2, Copy, Edit2, Check, X, Package } from "lucide-react";
import { toast } from "sonner";
import { BudgetProductLineEditor, BudgetProductLinesTableHeader } from "./BudgetProductLineEditor";
import { AddProductLineDialog } from "./AddProductLineDialog";

interface BudgetProduct {
  id: string;
  budget_id: string;
  name: string;
  description: string | null;
  ambiente: string | null;
  quantity: number | null;
  unit_cost: number | null;
  unit_price: number | null;
  total_cost: number | null;
  total_price: number | null;
  position: number | null;
}

interface BudgetProductCardProps {
  product: BudgetProduct;
  markupPercent: number;
  onRefresh: () => void;
}

export function BudgetProductCard({ product, markupPercent, onRefresh }: BudgetProductCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(product.name);
  const [editAmbiente, setEditAmbiente] = useState(product.ambiente || "");
  const [addLineOpen, setAddLineOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch global costs for the line editor
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

  const { data: lines = [], isLoading: linesLoading } = useQuery({
    queryKey: ['budget-product-lines', product.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_product_lines')
        .select('*')
        .eq('product_id', product.id)
        .order('position', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: isOpen
  });

  const updateProductMutation = useMutation({
    mutationFn: async (data: Partial<BudgetProduct>) => {
      const { error } = await supabase
        .from('budget_products')
        .update(data)
        .eq('id', product.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-products'] });
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      setIsEditing(false);
      onRefresh();
    },
    onError: () => {
      toast.error("Erro ao atualizar produto");
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: async () => {
      await supabase
        .from('budget_product_lines')
        .delete()
        .eq('product_id', product.id);

      const { error } = await supabase
        .from('budget_products')
        .delete()
        .eq('id', product.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-products'] });
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      toast.success("Produto removido");
      onRefresh();
    },
    onError: () => {
      toast.error("Erro ao remover produto");
    }
  });

  const duplicateProductMutation = useMutation({
    mutationFn: async () => {
      const { data: newProduct, error: productError } = await supabase
        .from('budget_products')
        .insert({
          budget_id: product.budget_id,
          name: `${product.name} (cópia)`,
          description: product.description,
          ambiente: product.ambiente,
          quantity: product.quantity,
          unit_cost: product.unit_cost,
          unit_price: product.unit_price,
          total_cost: product.total_cost,
          total_price: product.total_price
        })
        .select()
        .single();

      if (productError) throw productError;

      const { data: originalLines } = await supabase
        .from('budget_product_lines')
        .select('*')
        .eq('product_id', product.id);

      if (originalLines && originalLines.length > 0) {
        const newLines = originalLines.map(line => ({
          product_id: newProduct.id,
          line_name: line.line_name,
          line_type: line.line_type,
          quantity: line.quantity,
          unit: line.unit,
          unit_cost: line.unit_cost,
          subtotal: line.subtotal,
          cost_ref_id: line.cost_ref_id,
          cost_ref_code: line.cost_ref_code,
          position: line.position
        }));

        await supabase
          .from('budget_product_lines')
          .insert(newLines);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-products'] });
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      toast.success("Produto duplicado");
      onRefresh();
    },
    onError: () => {
      toast.error("Erro ao duplicar produto");
    }
  });

  const updateLineMutation = useMutation({
    mutationFn: async ({ lineId, data }: { lineId: string; data: any }) => {
      const { error } = await supabase
        .from('budget_product_lines')
        .update(data)
        .eq('id', lineId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-product-lines', product.id] });
      queryClient.invalidateQueries({ queryKey: ['budget-products'] });
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
    }
  });

  const deleteLineMutation = useMutation({
    mutationFn: async (lineId: string) => {
      const { error } = await supabase
        .from('budget_product_lines')
        .delete()
        .eq('id', lineId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-product-lines', product.id] });
      queryClient.invalidateQueries({ queryKey: ['budget-products'] });
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      toast.success("Linha removida");
    }
  });

  const handleSaveEdit = () => {
    updateProductMutation.mutate({ name: editName, ambiente: editAmbiente || null });
  };

  const handleCancelEdit = () => {
    setEditName(product.name);
    setEditAmbiente(product.ambiente || "");
    setIsEditing(false);
  };

  // Calculate totals from lines
  const linesTotal = lines.reduce((sum, line) => sum + (line.quantity * line.unit_cost), 0);
  const totalCost = isOpen && lines.length > 0 ? linesTotal : (product.total_cost || 0);
  const totalPrice = totalCost * (1 + markupPercent / 100);

  return (
    <>
      <Card className="overflow-hidden border-l-4 border-l-primary/30 hover:border-l-primary/60 transition-colors">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          {/* Product Header */}
          <div className="p-4 flex items-center gap-4 bg-gradient-to-r from-background to-muted/20">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>

            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="flex gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 h-8"
                    placeholder="Nome do produto"
                  />
                  <Input
                    value={editAmbiente}
                    onChange={(e) => setEditAmbiente(e.target.value)}
                    className="w-32 h-8"
                    placeholder="Ambiente"
                  />
                  <Button size="sm" className="h-8" onClick={handleSaveEdit}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={handleCancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-base">{product.name}</h4>
                    {product.ambiente && (
                      <Badge variant="secondary" className="text-xs">
                        {product.ambiente}
                      </Badge>
                    )}
                  </div>
                  {product.description && (
                    <p className="text-sm text-muted-foreground truncate">{product.description}</p>
                  )}
                </div>
              )}
            </div>

            {/* Summary values */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Custo</p>
                <p className="font-semibold tabular-nums">
                  R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Preço (+{markupPercent}%)
                </p>
                <p className="font-bold text-lg text-primary tabular-nums">
                  R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => duplicateProductMutation.mutate()}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => deleteProductMutation.mutate()}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Lines Table */}
          <CollapsibleContent>
            <div className="border-t">
              {/* Lines header */}
              <div className="px-4 py-2 flex items-center justify-between bg-muted/30 border-b">
                <span className="text-sm font-medium">
                  Linhas de Custo ({lines.length})
                </span>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddLineOpen(true)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar Linha
                </Button>
              </div>

              {/* Lines table */}
              {linesLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  Carregando linhas...
                </div>
              ) : lines.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <BudgetProductLinesTableHeader />
                    <tbody>
                      {lines.map(line => (
                        <BudgetProductLineEditor
                          key={line.id}
                          line={line}
                          globalCosts={globalCosts}
                          onUpdate={(lineId, data) => updateLineMutation.mutate({ lineId, data })}
                          onDelete={(lineId) => deleteLineMutation.mutate(lineId)}
                        />
                      ))}
                    </tbody>
                    <tfoot className="bg-primary/5 border-t-2 border-primary/20">
                      <tr>
                        <td colSpan={5} className="py-3 px-3 text-right font-semibold text-sm">
                          TOTAL DO PRODUTO:
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="font-bold text-lg text-primary">
                            R$ {linesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">Nenhuma linha de custo.</p>
                  <p className="text-xs">Clique em "Adicionar Linha" para começar a compor o custo deste produto.</p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <AddProductLineDialog
        productId={product.id}
        open={addLineOpen}
        onOpenChange={setAddLineOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['budget-product-lines', product.id] });
          queryClient.invalidateQueries({ queryKey: ['budget-products'] });
          queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
        }}
      />
    </>
  );
}
