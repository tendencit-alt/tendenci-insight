import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BOMItem {
  id: string;
  product_id: string;
  component_id: string;
  quantity: number;
  unit: string;
  notes: string | null;
  component?: {
    id: string;
    name: string;
    code: string;
    current_stock: number;
    unit: string;
  };
}

interface ProductBOMManagerProps {
  productId: string;
  productName: string;
}

export default function ProductBOMManager({ productId, productName }: ProductBOMManagerProps) {
  const [newComponent, setNewComponent] = useState({ component_id: "", quantity: 1, unit: "UN" });
  const queryClient = useQueryClient();

  const { data: bomItems = [], isLoading } = useQuery({
    queryKey: ["product-bom", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_bom")
        .select(`
          *,
          component:products!product_bom_component_id_fkey(id, name, code, current_stock, unit)
        `)
        .eq("product_id", productId)
        .order("created_at");

      if (error) throw error;
      return data as BOMItem[];
    },
  });

  const { data: availableProducts = [] } = useQuery({
    queryKey: ["products-for-bom", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, code, unit")
        .eq("active", true)
        .neq("id", productId)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const addBOMItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("product_bom").insert({
        product_id: productId,
        component_id: newComponent.component_id,
        quantity: newComponent.quantity,
        unit: newComponent.unit,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Componente adicionado à composição");
      queryClient.invalidateQueries({ queryKey: ["product-bom", productId] });
      setNewComponent({ component_id: "", quantity: 1, unit: "UN" });
    },
    onError: (error: any) => {
      if (error.message.includes("unique_bom_component")) {
        toast.error("Este componente já está na composição");
      } else {
        toast.error("Erro ao adicionar componente");
      }
    },
  });

  const removeBOMItem = useMutation({
    mutationFn: async (bomId: string) => {
      const { error } = await supabase.from("product_bom").delete().eq("id", bomId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Componente removido");
      queryClient.invalidateQueries({ queryKey: ["product-bom", productId] });
    },
    onError: () => {
      toast.error("Erro ao remover componente");
    },
  });

  const updateBOMItem = useMutation({
    mutationFn: async ({ bomId, quantity }: { bomId: string; quantity: number }) => {
      const { error } = await supabase.from("product_bom").update({ quantity }).eq("id", bomId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-bom", productId] });
    },
  });

  // Filter out products already in BOM
  const existingComponentIds = bomItems.map((item) => item.component_id);
  const selectableProducts = availableProducts.filter((p) => !existingComponentIds.includes(p.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-4 w-4" />
          Composição (BOM) - {productName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new component */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Componente</label>
            <Select
              value={newComponent.component_id}
              onValueChange={(value) => setNewComponent({ ...newComponent, component_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar componente" />
              </SelectTrigger>
              <SelectContent>
                {selectableProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} {product.code && `(${product.code})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-24">
            <label className="text-sm font-medium mb-1 block">Qtd.</label>
            <Input
              type="number"
              min={0.001}
              step={0.001}
              value={newComponent.quantity}
              onChange={(e) => setNewComponent({ ...newComponent, quantity: parseFloat(e.target.value) || 1 })}
            />
          </div>
          <div className="w-20">
            <label className="text-sm font-medium mb-1 block">Un.</label>
            <Input
              value={newComponent.unit}
              onChange={(e) => setNewComponent({ ...newComponent, unit: e.target.value })}
            />
          </div>
          <Button
            onClick={() => addBOMItem.mutate()}
            disabled={!newComponent.component_id || addBOMItem.isPending}
          >
            {addBOMItem.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        {/* BOM Table */}
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : bomItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum componente na composição. Adicione componentes acima.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Componente</TableHead>
                <TableHead>Código</TableHead>
                <TableHead className="text-center">Quantidade</TableHead>
                <TableHead className="text-center">Estoque Atual</TableHead>
                <TableHead className="text-center">Disponível p/ Produção</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bomItems.map((item) => {
                const availableForProduction = item.component
                  ? Math.floor(item.component.current_stock / item.quantity)
                  : 0;

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.component?.name || "N/A"}</TableCell>
                    <TableCell className="text-muted-foreground">{item.component?.code || "-"}</TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min={0.001}
                        step={0.001}
                        value={item.quantity}
                        onChange={(e) =>
                          updateBOMItem.mutate({ bomId: item.id, quantity: parseFloat(e.target.value) || 1 })
                        }
                        className="w-20 mx-auto text-center"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {item.component?.current_stock || 0} {item.component?.unit || item.unit}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={availableForProduction <= 0 ? "text-destructive font-medium" : ""}>
                        {availableForProduction} unidades
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBOMItem.mutate(item.id)}
                        disabled={removeBOMItem.isPending}
                        aria-label="Remover item da BOM"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {bomItems.length > 0 && (
          <div className="text-sm text-muted-foreground">
            <strong>Nota:</strong> Ao iniciar uma ordem de produção, estes componentes serão automaticamente consumidos do estoque.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
