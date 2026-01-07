import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertTriangle, Eye, Pencil, ShoppingCart, MoreHorizontal, Package } from "lucide-react";
import ProductDetailSheet from "./ProductDetailSheet";
import EditProductDialog from "./EditProductDialog";
import QuickMinStockDialog from "./QuickMinStockDialog";
import CreateMaterialRequestDialog from "./CreateMaterialRequestDialog";

interface ProductsTableProps {
  products: any[];
  isLoading: boolean;
  onSelect: (product: any) => void;
  onRefresh?: () => void;
}

export default function ProductsTable({ products, isLoading, onSelect, onRefresh }: ProductsTableProps) {
  const [viewProduct, setViewProduct] = useState<any>(null);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [minStockProduct, setMinStockProduct] = useState<any>(null);
  const [requestProduct, setRequestProduct] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Local</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead className="text-right">Custo</TableHead>
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
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
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
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Local</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const isLowStock = product.min_stock > 0 && product.current_stock <= product.min_stock;
              const isOutOfStock = product.current_stock <= 0;

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
                  <TableCell className="text-sm text-muted-foreground">
                    {product.location?.name || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(isLowStock || isOutOfStock) && (
                        <AlertTriangle className={`h-4 w-4 ${isOutOfStock ? "text-red-500" : "text-amber-500"}`} />
                      )}
                      <span className={isOutOfStock ? "text-red-500 font-medium" : isLowStock ? "text-amber-500" : ""}>
                        {product.current_stock} {product.unit}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(product.cost_price || 0)}
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
                        <DropdownMenuItem onClick={() => setViewProduct(product)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditProduct(product)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
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
