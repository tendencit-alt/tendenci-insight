import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Package, DollarSign, TrendingUp } from "lucide-react";

interface ProductsAnalysisProps {
  produtosVendidos: Array<{
    categoria: string;
    quantidade: number;
    total_vendido: number;
    ticket_medio: number;
  }>;
}

export function ProductsAnalysis({ produtosVendidos }: ProductsAnalysisProps) {
  const totalQuantidade = produtosVendidos?.reduce((sum, p) => sum + p.quantidade, 0) || 0;
  const totalVendido = produtosVendidos?.reduce((sum, p) => sum + p.total_vendido, 0) || 0;
  const ticketMedioGeral = totalQuantidade > 0 ? totalVendido / totalQuantidade : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalQuantidade}</div>
            <p className="text-xs text-muted-foreground">Produtos vendidos na meta</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalVendido)}
            </div>
            <p className="text-xs text-muted-foreground">Valor total em produtos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio Geral</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(ticketMedioGeral)}
            </div>
            <p className="text-xs text-muted-foreground">Média por produto vendido</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produtos por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Total Vendido</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                  <TableHead className="text-right">% do Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtosVendidos?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum produto vendido neste período
                    </TableCell>
                  </TableRow>
                ) : (
                  produtosVendidos?.map((produto, index) => {
                    const percentual = totalVendido > 0 ? (produto.total_vendido / totalVendido) * 100 : 0;
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{produto.categoria}</TableCell>
                        <TableCell className="text-right">{produto.quantidade}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCurrency(produto.total_vendido)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(produto.ticket_medio)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium">{percentual.toFixed(1)}%</span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
