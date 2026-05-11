import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Users, DollarSign, Briefcase } from "lucide-react";

interface ArchitectsAnalysisProps {
  arquitetosVendas: Array<{
    arquiteto: string;
    arquiteto_id: string;
    quantidade: number;
    total_vendido: number;
  }>;
  arquitetosResumo: {
    total_arquitetos: number;
    total_vendido_arquitetos: number;
    projetos_efetivados: number;
  };
}

export function ArchitectsAnalysis({ arquitetosVendas, arquitetosResumo }: ArchitectsAnalysisProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Profissionais Parceiros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{arquitetosResumo.total_arquitetos}</div>
            <p className="text-xs text-muted-foreground">Profissionais Parceiros diferentes que geraram vendas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(arquitetosResumo.total_vendido_arquitetos)}
            </div>
            <p className="text-xs text-muted-foreground">Somando todos os profissionais parceiros</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos Efetivados</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{arquitetosResumo.projetos_efetivados}</div>
            <p className="text-xs text-muted-foreground">Criados a partir dos negócios</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profissionais Parceiros Envolvidos nas Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profissional Parceiro</TableHead>
                  <TableHead className="text-right">Quantidade de Vendas</TableHead>
                  <TableHead className="text-right">Total Vendido</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arquitetosVendas?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhuma venda com profissional parceiro neste período
                    </TableCell>
                  </TableRow>
                ) : (
                  arquitetosVendas?.map((arq, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{arq.arquiteto}</TableCell>
                      <TableCell className="text-right">{arq.quantidade}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(arq.total_vendido)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(arq.total_vendido / arq.quantidade)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
