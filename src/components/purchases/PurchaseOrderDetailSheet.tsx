import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Edit, CheckCircle, XCircle, Package, Trash2, Copy, Printer, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import ReceivePurchaseDialog from "./ReceivePurchaseDialog";
import EditPurchaseOrderDialog from "./EditPurchaseOrderDialog";

interface PurchaseOrderDetailSheetProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  rascunho: { label: "Rascunho", variant: "secondary" },
  enviado: { label: "Enviado", variant: "outline" },
  confirmado: { label: "Confirmado", variant: "default" },
  aprovado: { label: "Aprovado", variant: "default" },
  recebido_parcial: { label: "Recebido Parcial", variant: "outline" },
  recebido_total: { label: "Recebido", variant: "default" },
  // legados (manter exibição correta caso existam registros antigos)
  parcial: { label: "Recebido Parcial", variant: "outline" },
  recebido: { label: "Recebido", variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" }
};

export default function PurchaseOrderDetailSheet({ order, open, onOpenChange, onUpdate }: PurchaseOrderDetailSheetProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isMaster } = usePermissions();
  const queryClient = useQueryClient();
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: items = [], refetch: refetchItems } = useQuery({
    queryKey: ["purchase-order-items", order?.id],
    queryFn: async () => {
      if (!order?.id) return [];
      const { data, error } = await supabase
        .from("purchase_order_items")
        .select(`
          *,
          product:products(id, name, code, unit)
        `)
        .eq("purchase_order_id", order.id)
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!order?.id
  });

  const updateStatus = async (newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "recebido_total" || newStatus === "recebido") {
        updates.received_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from("purchase_orders")
        .update(updates)
        .eq("id", order.id);

      if (error) throw error;
      toast({ title: `Status atualizado para ${statusConfig[newStatus]?.label}` });
      onUpdate();
    } catch (error: any) {
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await supabase.from("purchase_order_items").delete().eq("purchase_order_id", order.id);
      const { error } = await supabase.from("purchase_orders").delete().eq("id", order.id);
      if (error) throw error;
      toast({ title: "Pedido excluído!" });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["fin-payables"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      onOpenChange(false);
      onUpdate();
    } catch (error: any) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const { data: newOrder, error: orderError } = await supabase
        .from("purchase_orders")
        .insert({ supplier_id: order.supplier_id, status: "rascunho", notes: order.notes, payment_terms: order.payment_terms })
        .select()
        .single();
      if (orderError) throw orderError;

      const newItems = items.map((item: any, idx: number) => ({
        purchase_order_id: newOrder.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        position: idx
      }));
      await supabase.from("purchase_order_items").insert(newItems);
      await supabase.from("purchase_orders").update({ total: order.total }).eq("id", newOrder.id);

      toast({ title: "Pedido duplicado!" });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["fin-payables"] });
      onUpdate();
    } catch (error: any) {
      toast({ title: "Erro ao duplicar", description: error.message, variant: "destructive" });
    } finally {
      setDuplicating(false);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Pedido #${order.order_number}</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}.total{font-weight:bold;font-size:18px}</style></head><body>${printContent.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  if (!order) return null;

  const status = statusConfig[order.status] || { label: order.status, variant: "secondary" as const };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="flex flex-row items-start justify-between">
            <div>
              <SheetTitle className="text-xl">Pedido #{order.order_number}</SheetTitle>
              <p className="text-sm text-muted-foreground">
                {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
            </div>
            <Badge variant={status.variant}>{status.label}</Badge>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Fornecedor</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{order.supplier?.name}</p>
                {order.supplier?.cpf_cnpj && (
                  <p className="text-sm text-muted-foreground font-mono">{order.supplier.cpf_cnpj}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  {order.expected_date && (
                    <div>
                      <span className="text-muted-foreground">Previsão:</span>
                      <span className="ml-2">{format(new Date(order.expected_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                  )}
                  {order.received_date && (
                    <div>
                      <span className="text-muted-foreground">Recebido:</span>
                      <span className="ml-2">{format(new Date(order.received_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                  )}
                  {order.payment_terms && (
                    <div>
                      <span className="text-muted-foreground">Pagamento:</span>
                      <span className="ml-2">{order.payment_terms}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Itens ({items.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Recebido</TableHead>
                      <TableHead className="text-right">Valor Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className="font-medium">{item.product?.name}</p>
                          <p className="text-xs text-muted-foreground">{item.product?.code}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity} {item.product?.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={item.received_quantity >= item.quantity ? "text-green-600" : "text-amber-600"}>
                            {item.received_quantity || 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
              <span className="font-medium">Total do Pedido</span>
              <span className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(order.total || 0)}
              </span>
            </div>

            {order.notes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-wrap gap-2">
              {order.status === "rascunho" && (
                <>
                  <Button onClick={() => setEditOpen(true)} variant="outline">
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button onClick={() => updateStatus("enviado")}>
                    Enviar Pedido
                  </Button>
                </>
              )}
              {order.status === "enviado" && (
                <Button onClick={() => updateStatus("confirmado")}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Confirmar
                </Button>
              )}
              {["confirmado", "aprovado", "enviado", "recebido_parcial", "parcial"].includes(order.status) && (
                <Button onClick={() => setReceiveOpen(true)}>
                  <Package className="h-4 w-4 mr-1" />
                  Registrar Recebimento
                </Button>
              )}
              
              <Button variant="outline" onClick={handleDuplicate} disabled={duplicating}>
                {duplicating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Copy className="h-4 w-4 mr-1" />}
                Duplicar
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" />
                Imprimir
              </Button>

              {["rascunho", "enviado"].includes(order.status) && (
                <Button variant="destructive" onClick={() => updateStatus("cancelado")}>
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
              )}
              
              {isMaster && order.status === "rascunho" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Pedido</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir o Pedido #{order.order_number}?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                        {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {/* Print content (hidden) */}
            <div ref={printRef} className="hidden">
              <h1>Pedido de Compra #{order.order_number}</h1>
              <p>Fornecedor: {order.supplier?.name}</p>
              <p>Data: {format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
              <table><thead><tr><th>Produto</th><th>Qtd</th><th>Preço</th><th>Total</th></tr></thead>
              <tbody>{items.map((item: any) => (
                <tr key={item.id}><td>{item.product?.name}</td><td>{item.quantity}</td>
                <td>R$ {item.unit_price?.toFixed(2)}</td><td>R$ {item.total?.toFixed(2)}</td></tr>
              ))}</tbody></table>
              <p className="total">Total: R$ {order.total?.toFixed(2)}</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ReceivePurchaseDialog
        order={order}
        items={items}
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        onSuccess={() => {
          refetchItems();
          onUpdate();
          setReceiveOpen(false);
        }}
      />

      <EditPurchaseOrderDialog
        order={order}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => {
          refetchItems();
          onUpdate();
          setEditOpen(false);
        }}
      />
    </>
  );
}
