import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Plus, Trash2, Copy, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { BudgetProductLineEditor } from "./BudgetProductLineEditor";
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
      // First delete all lines
      await supabase
        .from('budget_product_lines')
        .delete()
        .eq('product_id', product.id);

      // Then delete the product
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
      // Create new product
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

      // Get lines from original product
      const { data: originalLines } = await supabase
        .from('budget_product_lines')
        .select('*')
        .eq('product_id', product.id);

      // Copy lines to new product
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

  const totalCost = product.total_cost || 0;
  const totalPrice = totalCost * (1 + markupPercent / 100);

  return (
    <>
      <Card className="overflow-hidden">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="p-4 flex items-center gap-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="flex gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1"
                    placeholder="Nome do produto"
                  />
                  <Input
                    value={editAmbiente}
                    onChange={(e) => setEditAmbiente(e.target.value)}
                    className="w-32"
                    placeholder="Ambiente"
                  />
                  <Button size="sm" onClick={handleSaveEdit}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{product.name}</h4>
                    {product.ambiente && (
                      <Badge variant="outline" className="text-xs">
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

            <div className="text-right">
              <p className="text-xs text-muted-foreground">Custo</p>
              <p className="font-medium">R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="text-right">
              <p className="text-xs text-muted-foreground">Preço</p>
              <p className="font-semibold text-primary">R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => duplicateProductMutation.mutate()}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-destructive hover:text-destructive"
                onClick={() => deleteProductMutation.mutate()}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <CollapsibleContent>
            <div className="border-t px-4 py-3 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Linhas de Custo ({lines.length})
                </span>
                <Button size="sm" variant="outline" onClick={() => setAddLineOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Linha
                </Button>
              </div>

              {linesLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
              ) : lines.length > 0 ? (
                <div className="space-y-1">
                  {lines.map(line => (
                    <BudgetProductLineEditor
                      key={line.id}
                      line={line}
                      onUpdate={(lineId, data) => updateLineMutation.mutate({ lineId, data })}
                      onDelete={(lineId) => deleteLineMutation.mutate(lineId)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma linha de custo. Clique em "Adicionar Linha" para começar.
                </p>
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
