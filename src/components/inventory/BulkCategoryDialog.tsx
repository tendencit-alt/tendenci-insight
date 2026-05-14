import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/auditLog";

interface BulkCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productIds: string[];
  onSuccess: () => void;
}

export default function BulkCategoryDialog({
  open,
  onOpenChange,
  productIds,
  onSuccess,
}: BulkCategoryDialogProps) {
  const [categoryId, setCategoryId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) setCategoryId("");
  }, [open]);

  const { data: categories = [] } = useQuery({
    queryKey: ["product-categories-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("id, name")
        .eq("active", true)
        .order("position");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const handleApply = async () => {
    if (!categoryId || productIds.length === 0) return;
    setLoading(true);
    try {
      // capture old values for audit
      const { data: previous } = await supabase
        .from("products")
        .select("id, category_id, category:product_categories(name)")
        .in("id", productIds);

      const { error } = await supabase
        .from("products")
        .update({ category_id: categoryId })
        .in("id", productIds);
      if (error) throw error;
      const cat = categories.find((c) => c.id === categoryId);

      // audit each product
      await Promise.all(
        (previous ?? []).map((p: any) =>
          logAudit({
            table_name: "products",
            record_id: p.id,
            event_type: "bulk_update",
            event_source: "ui:bulk_category_dialog",
            field_name: "category_id",
            old_value: p.category_id,
            new_value: categoryId,
            metadata: {
              from_category_name: p.category?.name ?? null,
              to_category_name: cat?.name ?? null,
              batch_size: productIds.length,
            },
          })
        )
      );

      toast.success(
        `${productIds.length} produto(s) movido(s) para "${cat?.name ?? "categoria"}"`
      );
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao atualizar categorias", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar categoria em lote</DialogTitle>
          <DialogDescription>
            Atribuir nova categoria a {productIds.length} produto(s) selecionado(s).
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Label>Nova categoria</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={!categoryId || loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
