import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Order {
  id: string;
  order_number: number;
  status: string;
  valor_total: number;
  data_emissao: string;
  data_entrega_prevista: string | null;
  client: { id: string; name: string; cpf_cnpj: string | null; phone: string | null } | null;
  vendedor: { id: string; full_name: string } | null;
  architect: { id: string; name: string } | null;
  deal: { id: string; title: string } | null;
}

interface OrdersTableProps {
  orders: Order[];
  isLoading: boolean;
  onSelectOrder: (id: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  aguardando_aprovacao: { label: 'Aguardando', variant: 'outline' },
  aprovado: { label: 'Aprovado', variant: 'default' },
  em_producao: { label: 'Em Produção', variant: 'default' },
  faturado: { label: 'Faturado', variant: 'default' },
  entregue: { label: 'Entregue', variant: 'default' },
  cancelado: { label: 'Cancelado', variant: 'destructive' },
};

export function OrdersTable({ orders, isLoading, onSelectOrder }: OrdersTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Nenhum pedido encontrado
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Nº</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Entrega</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const statusConfig = STATUS_CONFIG[order.status] || { label: order.status, variant: 'secondary' as const };
              
              return (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSelectOrder(order.id)}
                >
                  <TableCell className="font-mono font-medium">
                    #{order.order_number}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.client?.name || 'Sem cliente'}</p>
                      {order.client?.cpf_cnpj && (
                        <p className="text-xs text-muted-foreground">{order.client.cpf_cnpj}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{order.vendedor?.full_name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(order.valor_total)}
                  </TableCell>
                  <TableCell>
                    {format(new Date(order.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    {order.data_entrega_prevista
                      ? format(new Date(order.data_entrega_prevista), 'dd/MM/yyyy', { locale: ptBR })
                      : '-'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
