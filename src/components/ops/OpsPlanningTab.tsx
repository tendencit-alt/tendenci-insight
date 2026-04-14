import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useOpsOrders } from "@/hooks/useOpsData";
import { AlertTriangle, Clock, CheckCircle } from "lucide-react";

const STATUS_LABEL: Record<string, string> = { pending: "Pendente", in_progress: "Em Execução", completed: "Concluída", cancelled: "Cancelada", delayed: "Atrasada" };
const PRIORITY_LABEL: Record<string, string> = { low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente" };

export function OpsPlanningTab() {
  const { data: orders = [] } = useOpsOrders();

  const pending = orders.filter((o: any) => o.status === "pending");
  const inProgress = orders.filter((o: any) => o.status === "in_progress");
  const today = new Date().toISOString().split("T")[0];
  const delayed = orders.filter((o: any) => o.expected_end_date && o.expected_end_date < today && !["completed", "cancelled"].includes(o.status));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">Pendentes</p><p className="text-2xl font-bold">{pending.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-primary" />
            <div><p className="text-xs text-muted-foreground">Em Execução</p><p className="text-2xl font-bold">{inProgress.length}</p></div>
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
                .filter((o: any) => !["completed", "cancelled"].includes(o.status))
                .sort((a: any, b: any) => {
                  const prio = { urgent: 0, high: 1, normal: 2, low: 3 };
                  return (prio[a.priority as keyof typeof prio] ?? 2) - (prio[b.priority as keyof typeof prio] ?? 2);
                })
                .map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                    <TableCell className="font-medium">{o.title}</TableCell>
                    <TableCell><Badge variant="outline">{o.order_type}</Badge></TableCell>
                    <TableCell><Badge variant={o.priority === "urgent" || o.priority === "high" ? "destructive" : "secondary"}>{PRIORITY_LABEL[o.priority] || o.priority}</Badge></TableCell>
                    <TableCell className="text-sm">{o.start_date ? new Date(o.start_date + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                    <TableCell className="text-sm">{o.expected_end_date ? new Date(o.expected_end_date + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                    <TableCell><Badge variant={o.status === "in_progress" ? "default" : "secondary"}>{STATUS_LABEL[o.status] || o.status}</Badge></TableCell>
                  </TableRow>
                ))}
              {orders.filter((o: any) => !["completed", "cancelled"].includes(o.status)).length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhuma ordem na fila</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
