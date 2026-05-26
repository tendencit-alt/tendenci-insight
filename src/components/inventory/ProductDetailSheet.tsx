import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Package, AlertTriangle, TrendingUp, DollarSign, BarChart3, Trash2, Loader2, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCan } from "@/hooks/useCan";
import EditProductDialog from "./EditProductDialog";
import ProductMovements from "./ProductMovements";
import ProductSuppliers from "./ProductSuppliers";
import ProductPriceChart from "./ProductPriceChart";
import ProductFichaTecnica from "./ProductFichaTecnica";
import { ProductGallery } from "@/components/catalogo/ProductGallery";

// ID da categoria "Produto"
const CATEGORIA_PRODUTO_ID = "2ca37a60-74b7-446c-9a67-fa5ff7f67731";

// Helper para parsear vídeos de JSON
const parseVideos = (data: unknown): string[] => {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.filter((v: any) => v && typeof v === "object" && v.url).map((v: any) => v.url);
  }
  return [];
};

interface ProductDetailSheetProps {
  product: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  defaultTab?: string;
}

export default function ProductDetailSheet({ product, open, onOpenChange, onUpdate, defaultTab = "movements" }: ProductDetailSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canDelete = useCan("estoque", "delete");
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id)
        .select("id");

      if (error) throw error;

      if (!data || data.length === 0) {
        // Nenhuma linha excluída: provavelmente bloqueado por RLS. Faz fallback para desativar.
        const { error: updErr } = await supabase
          .from("products")
          .update({ active: false })
          .eq("id", product.id);
        if (updErr) throw updErr;
        toast({
          title: "Produto desativado",
          description: "Não foi possível excluir definitivamente (sem permissão ou existem vínculos). O produto foi desativado.",
        });
      } else {
        toast({ title: "Produto excluído com sucesso!" });
      }

      queryClient.invalidateQueries({ queryKey: ["products"] });
      onOpenChange(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir produto",
        description: error.message?.includes("violates foreign key")
          ? "Este produto possui movimentações ou está vinculado a outros registros. Considere desativá-lo."
          : error.message,
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };
  if (!product) return null;

  const isLowStock = product.min_stock > 0 && product.current_stock <= product.min_stock;
  const isOutOfStock = product.current_stock <= 0;
  const isProdutoCategory = product.category_id === CATEGORIA_PRODUTO_ID;
  
  // Combinar imagens e vídeos para galeria
  const allImages = [product.image_url, ...(Array.isArray(product.galeria) ? product.galeria : [])].filter(Boolean) as string[];
  const allVideos = parseVideos(product.videos);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="flex flex-row items-start justify-between">
            <div>
              <SheetTitle className="text-xl">{product.name}</SheetTitle>
              <p className="text-sm text-muted-foreground font-mono">{product.code || "Sem código"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={product.active ? "default" : "secondary"}>
                {product.active ? "Ativo" : "Inativo"}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
              {canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Produto</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir "{product.name}"? Esta ação não pode ser desfeita.
                        Se o produto possui movimentações, considere desativá-lo ao invés de excluir.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                        {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Galeria de Mídia - apenas para categoria Produto */}
            {isProdutoCategory && (allImages.length > 0 || allVideos.length > 0) && (
              <ProductGallery 
                images={allImages}
                videos={allVideos}
                productName={product.name}
              />
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isOutOfStock ? "bg-red-100 text-red-600" : isLowStock ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"}`}>
                      {isOutOfStock || isLowStock ? <AlertTriangle className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Estoque Atual</p>
                      <p className="text-xl font-bold">{product.current_stock} {product.unit}</p>
                      {product.reserved_stock > 0 && (
                        <p className="text-xs text-muted-foreground">({product.reserved_stock} reservado)</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Valor em Estoque</p>
                      <p className="text-xl font-bold">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
                          .format(product.current_stock * (product.average_cost || product.cost_price || 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Custo Médio</p>
                      <p className="text-xl font-bold">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
                          .format(product.average_cost || product.cost_price || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ponto Reposição</p>
                      <p className="text-xl font-bold">{product.reorder_point || product.min_stock || 0} {product.unit}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {product.description && <p>{product.description}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Categoria:</span>
                    <span className="ml-2">{product.category?.name || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Local:</span>
                    <span className="ml-2">{product.location?.name || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Est. Mínimo:</span>
                    <span className="ml-2">{product.min_stock} {product.unit}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Est. Máximo:</span>
                    <span className="ml-2">{product.max_stock ? `${product.max_stock} ${product.unit}` : "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Preço Custo:</span>
                    <span className="ml-2">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(product.cost_price || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Preço Venda:</span>
                    <span className="ml-2">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(product.sale_price || 0)}
                    </span>
                  </div>
                  {product.ncm && (
                    <div>
                      <span className="text-muted-foreground">NCM:</span>
                      <span className="ml-2 font-mono">{product.ncm}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue={defaultTab} key={defaultTab}>
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="movements">Movimentações</TabsTrigger>
                <TabsTrigger value="ficha-tecnica" className="flex items-center gap-1">
                  <FileSpreadsheet className="h-3 w-3" />
                  Ficha Técnica
                </TabsTrigger>
                <TabsTrigger value="prices">Histórico Preços</TabsTrigger>
                <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
              </TabsList>

              <TabsContent value="movements">
                <ProductMovements productId={product.id} />
              </TabsContent>

              <TabsContent value="ficha-tecnica">
                <ProductFichaTecnica productId={product.id} productName={product.name} />
              </TabsContent>

              <TabsContent value="prices">
                <ProductPriceChart productId={product.id} />
              </TabsContent>

              <TabsContent value="suppliers">
                <ProductSuppliers productId={product.id} />
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      <EditProductDialog
        product={product}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => {
          onUpdate();
          setEditOpen(false);
        }}
      />
    </>
  );
}
