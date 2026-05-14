import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertTriangle, Eye, Pencil, ShoppingCart, MoreHorizontal, Package, FileSpreadsheet } from "lucide-react";
import ProductDetailSheet from "./ProductDetailSheet";
import EditProductDialog from "./EditProductDialog";
import QuickMinStockDialog from "./QuickMinStockDialog";
import CreateMaterialRequestDialog from "./CreateMaterialRequestDialog";
import { cn } from "@/lib/utils";

interface ProductsTableProps {
  products: any[];
  isLoading: boolean;
  onSelect: (product: any) => void;
  onRefresh?: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
};

export default function ProductsTable({ products, isLoading, onSelect, onRefresh }: ProductsTableProps) {
  const [viewProduct, setViewProduct] = useState<any>(null);
  const [viewProductTab, setViewProductTab] = useState<string>("movements");
  const [editProduct, setEditProduct] = useState<any>(null);
  const [minStockProduct, setMinStockProduct] = useState<any>(null);
  const [requestProduct, setRequestProduct] = useState<any>(null);

  const openProductWithTab = (product: any, tab: string) => {
    setViewProductTab(tab);
    setViewProduct(product);
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Centro de Custo</TableHead>
              <TableHead>Local</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead className="text-right">CMV (Ficha)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-10" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum item encontrado</p>
      </div>
    );
  }

  const handleRefresh = () => {
    if (onRefresh) onRefresh();
  };

  return (
    <>
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Centro de Custo</TableHead>
              <TableHead>Local</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead className="text-right">CMV (Ficha)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const isNegativeStock = product.current_stock < 0;
              const isLowStock = !isNegativeStock && product.min_stock > 0 && product.current_stock <= product.min_stock;
              const isOutOfStock = product.current_stock === 0;
              const costCenters = product.cost_centers || [];
              const fichaTecnica = product.ficha_tecnica?.[0];

              return (
                <TableRow key={product.id} className="group">
                  <TableCell className="font-mono text-sm">
                    {product.code || "-"}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{product.name}</p>
                  </TableCell>
                  <TableCell>
                    {product.category ? (
                      <Badge variant="outline" className={product.category.color}>
                        {product.category.name}
                      </Badge>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    {costCenters.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {costCenters.map((cc: any) => (
                          <Badge key={cc.cost_center?.id || cc.id} className={cn(cc.cost_center?.color || "bg-muted", "text-xs")}>
                            {cc.cost_center?.name || "-"}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {product.location?.name || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(isLowStock || isOutOfStock || isNegativeStock) && (
                        <AlertTriangle className={`h-4 w-4 ${isNegativeStock ? "text-destructive" : isOutOfStock ? "text-red-500" : "text-amber-500"}`} />
                      )}
                      {isNegativeStock ? (
                        <Badge variant="destructive">Negativo: {product.current_stock} {product.unit}</Badge>
                      ) : (
                        <span className={isOutOfStock ? "text-red-500 font-medium" : isLowStock ? "text-amber-500" : ""}>
                          {product.current_stock} {product.unit}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(product.cost_price || 0)}
                  </TableCell>
                  <TableCell className="text-right text-yellow-600">
                    {fichaTecnica?.cmv_total ? (
                      <div className="flex items-center justify-end gap-1">
                        <FileSpreadsheet className="h-3 w-3 text-green-600" />
                        <span className="text-green-600 font-medium">
                          {formatCurrency(fichaTecnica.cmv_total)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.active ? "default" : "secondary"}>
                      {product.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openProductWithTab(product, "movements")}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditProduct(product)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openProductWithTab(product, "ficha-tecnica")}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Ficha Técnica
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setMinStockProduct(product)}>
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Estoque Mínimo
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRequestProduct(product)}>
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Requisição de Compra
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ProductDetailSheet
        product={viewProduct}
        open={!!viewProduct}
        onOpenChange={(open) => !open && setViewProduct(null)}
        onUpdate={handleRefresh}
        defaultTab={viewProductTab}
      />

      <EditProductDialog
        product={editProduct}
        open={!!editProduct}
        onOpenChange={(open) => !open && setEditProduct(null)}
        onSuccess={handleRefresh}
      />

      <QuickMinStockDialog
        product={minStockProduct}
        open={!!minStockProduct}
        onOpenChange={(open) => !open && setMinStockProduct(null)}
        onSuccess={handleRefresh}
      />

      <CreateMaterialRequestDialog
        product={requestProduct}
        open={!!requestProduct}
        onOpenChange={(open) => !open && setRequestProduct(null)}
        onSuccess={handleRefresh}
      />
    </>
  );
}
