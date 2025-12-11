import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";

interface ProductsTableProps {
  products: any[];
  isLoading: boolean;
  onSelect: (product: any) => void;
}

export default function ProductsTable({ products, isLoading, onSelect }: ProductsTableProps) {
  if (isLoading) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Local</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead>Status</TableHead>
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
        Nenhum produto encontrado
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Local</TableHead>
            <TableHead className="text-right">Estoque</TableHead>
            <TableHead className="text-right">Custo</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const isLowStock = product.min_stock > 0 && product.current_stock <= product.min_stock;
            const isOutOfStock = product.current_stock <= 0;

            return (
              <TableRow 
                key={product.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSelect(product)}
              >
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
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
