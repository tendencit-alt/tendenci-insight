import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ConversionByOriginProps {
  conversaoPorOrigem: Array<{
    origem: string;
    leads_recebidos: number;
    leads_trabalhados: number;
    leads_ganhos: number;
    taxa_conversao: number;
    ticket_medio: number;
  }>;
}

export function ConversionByOrigin({ conversaoPorOrigem }: ConversionByOriginProps) {
  const getConversaoColor = (taxaConversao: number) => {
    if (taxaConversao >= 50) return "text-green-600 bg-green-50 border-green-200";
    if (taxaConversao >= 30) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversão por Origem de Lead</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Leads Recebidos</TableHead>
                <TableHead className="text-right">Trabalhados</TableHead>
                <TableHead className="text-right">Ganhos</TableHead>
                <TableHead className="text-right">Conversão</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversaoPorOrigem?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum dado de conversão disponível
                  </TableCell>
                </TableRow>
              ) : (
                conversaoPorOrigem?.map((origem, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{origem.origem}</TableCell>
                    <TableCell className="text-right">{origem.leads_recebidos}</TableCell>
                    <TableCell className="text-right">{origem.leads_trabalhados}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {origem.leads_ganhos}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className={getConversaoColor(origem.taxa_conversao || 0)}>
                        {(origem.taxa_conversao || 0).toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(origem.ticket_medio || 0)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold mb-2">Como interpretar:</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• <strong>Leads Recebidos:</strong> Total de leads gerados pela origem no período da meta</li>
            <li>• <strong>Trabalhados:</strong> Leads que foram efetivamente trabalhados (aberto, ganho ou perdido)</li>
            <li>• <strong>Ganhos:</strong> Leads que se converteram em vendas</li>
            <li>• <strong>Conversão:</strong> Percentual de ganhos sobre trabalhados (quanto maior, melhor)</li>
            <li>• <strong>Ticket Médio:</strong> Valor médio dos negócios ganhos dessa origem</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
