import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, CheckCircle, AlertTriangle } from "lucide-react";

export function SupReceivingTab() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["purchase-orders-receiving"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*, suppliers(name), purchase_order_items(*, products(name, code, unit))")
        .in("status", ["aprovado", "confirmado", "recebido_parcial", "recebido_total", "parcial", "recebido"])
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const totalReceived = orders.filter((o: any) => o.status === "recebido_total" || o.status === "recebido").length;
  const totalPartial = orders.filter((o: any) => o.status === "recebido_parcial" || o.status === "parcial").length;
  const totalPending = orders.filter((o: any) => o.status === "aprovado" || o.status === "confirmado").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><CheckCircle className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Recebidos</p><p className="text-xl font-bold">{totalReceived}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Package className="h-7 w-7 text-amber-500" /><div><p className="text-xs text-muted-foreground">Parcial</p><p className="text-xl font-bold">{totalPartial}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><AlertTriangle className="h-7 w-7 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Aguardando</p><p className="text-xl font-bold">{totalPending}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Recebimentos</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Recebido em</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum recebimento</TableCell></TableRow>}
                  {orders.map((o: any) => {
                    const items = o.purchase_order_items || [];
                    const totalQty = items.reduce((s: number, i: any) => s + (i.quantity || 0), 0);
                    const receivedQty = items.reduce((s: number, i: any) => s + (i.received_quantity || 0), 0);
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                        <TableCell className="font-medium">{o.suppliers?.name || "—"}</TableCell>
                        <TableCell className="text-sm">{receivedQty}/{totalQty} unidades</TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmt(o.total)}</TableCell>
                        <TableCell className="text-sm">{o.received_date ? new Date(o.received_date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                        <TableCell>
                          {(() => {
                            const isFull = o.status === "recebido_total" || o.status === "recebido";
                            const isPartial = o.status === "recebido_parcial" || o.status === "parcial";
                            return (
                              <Badge variant={isFull ? "default" : isPartial ? "secondary" : "outline"}>
                                {isFull ? "Completo" : isPartial ? "Parcial" : "Aguardando"}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
