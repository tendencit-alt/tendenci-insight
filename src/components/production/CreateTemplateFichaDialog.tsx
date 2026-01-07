import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, FileText, Loader2 } from "lucide-react";

interface CreateTemplateFichaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTemplateFichaDialog({
  open,
  onOpenChange,
}: CreateTemplateFichaDialogProps) {
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  // Buscar produtos da categoria "Produto" que ainda não têm ficha técnica padrão
  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["products-without-template"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, 
          code, 
          name, 
          category:product_categories(name)
        `)
        .eq("active", true)
        .order("name");

      if (error) throw error;

      // Buscar produtos que já têm template
      const { data: existingTemplates } = await supabase
        .from("production_products")
        .select("product_id")
        .eq("is_template", true)
        .not("product_id", "is", null);

      const templateProductIds = new Set(
        existingTemplates?.map((t) => t.product_id) || []
      );

      // Filtrar produtos que ainda não têm template
      return (data || []).filter((p) => !templateProductIds.has(p.id));
    },
    enabled: open,
  });

  const filteredProducts = products?.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      const product = products?.find((p) => p.id === selectedProductId);
      if (!product) throw new Error("Produto não encontrado");

      const { data, error } = await supabase
        .from("production_products")
        .insert({
          product_id: selectedProductId,
          name: product.name,
          is_template: true,
          status: "rascunho",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Ficha técnica padrão criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["template-fichas"] });
      queryClient.invalidateQueries({ queryKey: ["products-without-template"] });
      setSelectedProductId("");
      setSearchTerm("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar ficha técnica: " + error.message);
    },
  });

  const selectedProduct = products?.find((p) => p.id === selectedProductId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Nova Ficha Técnica Padrão
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Buscar Produto</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Digite para buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Selecione o Produto</Label>
            {loadingProducts ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando produtos...
              </div>
            ) : (
              <Select
                value={selectedProductId}
                onValueChange={setSelectedProductId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {filteredProducts?.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      {searchTerm
                        ? "Nenhum produto encontrado"
                        : "Todos os produtos já possuem ficha técnica padrão"}
                    </div>
                  ) : (
                    filteredProducts?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        <div className="flex flex-col">
                          <span>
                            {product.code} - {product.name}
                          </span>
                          {product.category && (
                            <span className="text-xs text-muted-foreground">
                              {product.category.name}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedProduct && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="text-sm font-medium">Produto Selecionado:</p>
              <p className="text-sm">
                <span className="text-muted-foreground">Código:</span>{" "}
                {selectedProduct.code}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Nome:</span>{" "}
                {selectedProduct.name}
              </p>
              {selectedProduct.category && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Categoria:</span>{" "}
                  {selectedProduct.category.name}
                </p>
              )}
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            A ficha técnica padrão serve como modelo para criar fichas em novas
            ordens de produção. Após criar, você poderá adicionar insumos e mão
            de obra.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!selectedProductId || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              "Criar Ficha Padrão"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
