import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, ShoppingCart, Clock, CheckCircle, XCircle, Package } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  pendente: { label: "Pendente", variant: "secondary", icon: Clock },
  aprovada: { label: "Aprovada", variant: "default", icon: CheckCircle },
  recusada: { label: "Recusada", variant: "destructive", icon: XCircle },
  convertida_em_pedido: { label: "Convertida", variant: "outline", icon: ShoppingCart }
};

export default function MaterialRequestsTable() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ["material-requests", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("material_requests")
        .select(`
          *,
          product:products(id, name, code, unit, current_stock),
          requester:profiles!material_requests_requested_by_fkey(full_name),
          approver:profiles!material_requests_approved_by_fkey(full_name)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const handleApprove = async (requestId: string) => {
    const { error } = await supabase
      .from("material_requests")
      .update({
        status: "aprovada",
        approved_by: user?.id,
        approved_at: new Date().toISOString()
      })
      .eq("id", requestId);

    if (error) {
      toast.error("Erro ao aprovar requisição");
    } else {
      toast.success("Requisição aprovada!");
      refetch();
    }
  };

  const handleReject = async (requestId: string) => {
    const { error } = await supabase
      .from("material_requests")
      .update({
        status: "recusada",
        approved_by: user?.id,
        approved_at: new Date().toISOString()
      })
      .eq("id", requestId);

    if (error) {
      toast.error("Erro ao recusar requisição");
    } else {
      toast.success("Requisição recusada");
      refetch();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="aprovada">Aprovada</SelectItem>
            <SelectItem value="recusada">Recusada</SelectItem>
            <SelectItem value="convertida_em_pedido">Convertida</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {requests?.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma requisição encontrada</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests?.map((request: any) => {
                const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pendente;
                const StatusIcon = statusConfig.icon;

                return (
                  <TableRow key={request.id}>
                    <TableCell className="font-mono text-sm">
                      #{request.request_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.product?.name || "-"}</p>
                        <p className="text-xs text-muted-foreground">{request.product?.code}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {request.quantity} {request.product?.unit}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="truncate" title={request.reason}>{request.reason}</p>
                    </TableCell>
                    <TableCell>{request.requester?.full_name || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(request.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig.variant} className="gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {request.status === "pendente" && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleApprove(request.id)}
                            title="Aprovar"
                            aria-label="Aprovar requisição"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleReject(request.id)}
                            title="Recusar"
                            aria-label="Recusar requisição"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {request.status === "aprovada" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const { data, error } = await supabase.rpc(
                              "convert_material_request_to_po" as any,
                              { _request_id: request.id }
                            );
                            if (error) {
                              toast.error(error.message || "Erro ao converter em pedido");
                            } else {
                              toast.success(`Pedido de compra criado (rascunho)`);
                              refetch();
                            }
                          }}
                        >
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Converter em Pedido
                        </Button>
                      )}
                    </TableCell>

                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
