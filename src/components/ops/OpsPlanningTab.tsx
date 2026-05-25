import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useOpsOrders } from "@/hooks/useOpsData";
import { AlertTriangle, Clock, CheckCircle } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  aguardando: "Aguardando",
  em_producao: "Em Produção",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  entregue: "Entregue",
  cancelado: "Cancelado",
};
const PRIORITY_LABEL: Record<string, string> = { low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente" };
const FINISHED = ["concluido", "entregue", "cancelado"];
const IN_PROGRESS = ["em_producao", "em_andamento"];

export function OpsPlanningTab() {
  const { data: orders = [] } = useOpsOrders();

  const pending = orders.filter((o: any) => o.status === "aguardando");
  const inProgress = orders.filter((o: any) => IN_PROGRESS.includes(o.status));
  const today = new Date().toISOString().split("T")[0];
  const delayed = orders.filter((o: any) => o.planned_end_date && o.planned_end_date.slice(0, 10) < today && !FINISHED.includes(o.status));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">Aguardando</p><p className="text-2xl font-bold">{pending.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-primary" />
            <div><p className="text-xs text-muted-foreground">Em Produção</p><p className="text-2xl font-bold">{inProgress.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div><p className="text-xs text-muted-foreground">Atrasadas</p><p className="text-2xl font-bold">{delayed.length}</p></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Fila de Produção (por prioridade)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Previsão</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders
                .filter((o: any) => !FINISHED.includes(o.status))
                .sort((a: any, b: any) => {
                  const prio = { urgent: 0, high: 1, normal: 2, low: 3 };
                  return (prio[a.priority as keyof typeof prio] ?? 2) - (prio[b.priority as keyof typeof prio] ?? 2);
                })
                .map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                    <TableCell className="font-medium">{o.title}</TableCell>
                    <TableCell><Badge variant="outline">{o.production_types?.name || "—"}</Badge></TableCell>
                    <TableCell><Badge variant={o.priority === "urgent" || o.priority === "high" ? "destructive" : "secondary"}>{PRIORITY_LABEL[o.priority] || o.priority}</Badge></TableCell>
                    <TableCell className="text-sm">{o.planned_start_date ? new Date(o.planned_start_date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                    <TableCell className="text-sm">{o.planned_end_date ? new Date(o.planned_end_date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                    <TableCell><Badge variant={IN_PROGRESS.includes(o.status) ? "default" : "secondary"}>{STATUS_LABEL[o.status] || o.status}</Badge></TableCell>
                  </TableRow>
                ))}
              {orders.filter((o: any) => !FINISHED.includes(o.status)).length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhuma ordem na fila</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
