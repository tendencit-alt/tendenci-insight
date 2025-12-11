import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Package, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import EditProductDialog from "./EditProductDialog";
import ProductMovements from "./ProductMovements";
import ProductSuppliers from "./ProductSuppliers";

interface ProductDetailSheetProps {
  product: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export default function ProductDetailSheet({ product, open, onOpenChange, onUpdate }: ProductDetailSheetProps) {
  const [editOpen, setEditOpen] = useState(false);

  if (!product) return null;

  const isLowStock = product.min_stock > 0 && product.current_stock <= product.min_stock;
  const isOutOfStock = product.current_stock <= 0;

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
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
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
                          .format(product.current_stock * (product.cost_price || 0))}
                      </p>
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

            <Tabs defaultValue="movements">
              <TabsList className="w-full">
                <TabsTrigger value="movements" className="flex-1">Movimentações</TabsTrigger>
                <TabsTrigger value="suppliers" className="flex-1">Fornecedores</TabsTrigger>
              </TabsList>

              <TabsContent value="movements">
                <ProductMovements productId={product.id} />
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
