import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUp, ArrowDown, RefreshCw } from "lucide-react";

interface StockMovementsTableProps {
  movements: any[];
  isLoading: boolean;
}

const movementTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
  entrada: { label: "Entrada", icon: ArrowUp, color: "text-green-500" },
  saida: { label: "Saída", icon: ArrowDown, color: "text-red-500" },
  ajuste_positivo: { label: "Ajuste (+)", icon: ArrowUp, color: "text-blue-500" },
  ajuste_negativo: { label: "Ajuste (-)", icon: ArrowDown, color: "text-orange-500" },
  producao_consumo: { label: "Consumo Prod.", icon: ArrowDown, color: "text-purple-500" },
  producao_saida: { label: "Saída Prod.", icon: ArrowUp, color: "text-emerald-500" },
  transferencia: { label: "Transferência", icon: RefreshCw, color: "text-gray-500" }
};

export default function StockMovementsTable({ movements, isLoading }: StockMovementsTableProps) {
  if (isLoading) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
              <TableHead className="text-right">Anterior</TableHead>
              <TableHead className="text-right">Novo</TableHead>
              <TableHead>Usuário</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        Nenhuma movimentação encontrada
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
            <TableHead className="text-right">Anterior</TableHead>
            <TableHead className="text-right">Novo</TableHead>
            <TableHead>Usuário</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((mov) => {
            const config = movementTypeConfig[mov.movement_type] || { 
              label: mov.movement_type, 
              icon: RefreshCw, 
              color: "text-gray-500" 
            };
            const Icon = config.icon;

            return (
              <TableRow key={mov.id}>
                <TableCell className="text-sm">
                  {format(new Date(mov.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <div className={`flex items-center gap-1 ${config.color}`}>
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{mov.product?.name}</p>
                    <p className="text-xs text-muted-foreground">{mov.product?.code}</p>
                  </div>
                </TableCell>
                <TableCell className={`text-right font-medium ${config.color}`}>
                  {mov.movement_type.includes("saida") || mov.movement_type.includes("consumo") || mov.movement_type.includes("negativo") 
                    ? `-${mov.quantity}` 
                    : `+${mov.quantity}`}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {mov.previous_stock}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {mov.new_stock}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {mov.created_by_profile?.full_name || "-"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
