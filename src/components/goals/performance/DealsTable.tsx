import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Deal {
  id: string;
  title: string;
  cliente: string;
  value: number;
  data_fechamento: string;
  origem: string;
  tipo_produto: string;
  categoria: string;
  centro_custo: string;
  possui_arquiteto: string;
  nome_arquiteto: string;
  observacoes: string;
}

interface DealsTableProps {
  deals: Deal[];
}

export function DealsTable({ deals }: DealsTableProps) {
  const exportToCSV = () => {
    const headers = [
      "Cliente",
      "Título",
      "Valor",
      "Data Fechamento",
      "Origem",
      "Tipo Produto",
      "Categoria",
      "Centro de Custo",
      "Possui Parceiro Profissional",
      "Nome Parceiro Profissional",
      "Observações"
    ];

    const rows = deals.map(deal => [
      deal.cliente,
      deal.title,
      deal.value,
      format(new Date(deal.data_fechamento), "dd/MM/yyyy", { locale: ptBR }),
      deal.origem,
      deal.tipo_produto || "-",
      deal.categoria || "-",
      deal.centro_custo || "-",
      deal.possui_arquiteto,
      deal.nome_arquiteto,
      deal.observacoes || "-"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `negocios-ganhos-${format(new Date(), "dd-MM-yyyy")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Negócios Ganhos ({deals.length})</CardTitle>
        <Button onClick={exportToCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Tipo Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Centro Custo</TableHead>
                <TableHead>Parceiro Profissional</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    Nenhum negócio ganho neste período
                  </TableCell>
                </TableRow>
              ) : (
                deals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell className="font-medium">{deal.cliente}</TableCell>
                    <TableCell>{deal.title}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {formatCurrency(deal.value)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(deal.data_fechamento), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{deal.origem}</Badge>
                    </TableCell>
                    <TableCell>{deal.tipo_produto || "-"}</TableCell>
                    <TableCell>{deal.categoria || "-"}</TableCell>
                    <TableCell>{deal.centro_custo || "-"}</TableCell>
                    <TableCell>
                      {deal.possui_arquiteto === "Sim" ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant="secondary">Sim</Badge>
                          <span className="text-xs text-muted-foreground">{deal.nome_arquiteto}</span>
                        </div>
                      ) : (
                        <Badge variant="outline">Não</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {deal.observacoes || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
