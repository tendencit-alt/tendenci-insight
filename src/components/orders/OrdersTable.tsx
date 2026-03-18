import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePermissions } from '@/hooks/usePermissions';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateOnly } from '@/utils/timezone';
import { Search, ChevronLeft, ChevronRight, AlertTriangle, ExternalLink, Eye, Pencil, Trash2, PackageSearch } from 'lucide-react';

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
  onEditOrder?: (id: string) => void;
  onDeleteOrder?: (id: string, orderNumber: number) => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }
> = {
  rascunho: { label: 'Rascunho', variant: 'outline', className: 'border-border bg-muted text-muted-foreground' },
  ativo: { label: 'Ativo', variant: 'outline', className: 'border-primary/20 bg-primary/10 text-primary' },
  aguardando_aprovacao: { label: 'Aguardando', variant: 'outline', className: 'border-border bg-accent text-accent-foreground' },
  aprovado: { label: 'Aprovado', variant: 'outline', className: 'border-border bg-secondary text-secondary-foreground' },
  em_producao: { label: 'Em Produção', variant: 'outline', className: 'border-primary/10 bg-primary/5 text-foreground' },
  faturado: { label: 'Faturado', variant: 'outline', className: 'border-border bg-secondary/80 text-secondary-foreground' },
  entregue: { label: 'Entregue', variant: 'outline', className: 'border-border bg-accent/80 text-accent-foreground' },
  cancelado: { label: 'Cancelado', variant: 'outline', className: 'border-destructive/20 bg-destructive/10 text-destructive' },
};

const ITEMS_PER_PAGE = 20;

export function OrdersTable({ orders, isLoading, onSelectOrder, onEditOrder, onDeleteOrder }: OrdersTableProps) {
  const { isMaster } = usePermissions();
  const isEditable = (status: string) => ['rascunho', 'ativo', 'aguardando_aprovacao'].includes(status);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const filteredOrders = orders.filter((order) => {
    const search = searchTerm.toLowerCase();
    return (
      order.order_number.toString().includes(search) ||
      order.client?.name?.toLowerCase().includes(search) ||
      order.client?.cpf_cnpj?.includes(search) ||
      order.vendedor?.full_name?.toLowerCase().includes(search) ||
      order.architect?.name?.toLowerCase().includes(search) ||
      order.deal?.title?.toLowerCase().includes(search)
    );
  });

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getDeadlineStatus = (deadline: string | null, status: string) => {
    if (!deadline || status === 'entregue' || status === 'cancelado') return null;

    const deadlineDate = parseDateOnly(deadline);
    if (!deadlineDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadlineDateNormalized = new Date(deadlineDate);
    deadlineDateNormalized.setHours(0, 0, 0, 0);

    const daysRemaining = differenceInDays(deadlineDateNormalized, today);

    if (daysRemaining < 0) {
      const daysLate = Math.abs(daysRemaining);
      return {
        label: `${daysLate}d atrasado`,
        className: 'border-destructive/20 bg-destructive/10 text-destructive',
        isLate: true,
      };
    }
    if (daysRemaining === 0) {
      return {
        label: 'Hoje',
        className: 'border-border bg-accent text-accent-foreground',
        isLate: false,
      };
    }
    if (daysRemaining <= 30) {
      return {
        label: `${daysRemaining}d`,
        className: 'border-border bg-secondary text-secondary-foreground',
        isLate: false,
      };
    }
    return {
      label: `${daysRemaining}d`,
      className: 'border-border bg-muted text-muted-foreground',
      isLate: false,
    };
  };

  if (isLoading) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardContent className="p-5">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardContent className="p-0">
        <div className="border-b border-border/70 bg-card/60 p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Resultados</p>
              <p className="text-sm text-muted-foreground">
                {filteredOrders.length} pedido{filteredOrders.length === 1 ? '' : 's'} encontrado{filteredOrders.length === 1 ? '' : 's'} no período atual.
              </p>
            </div>
            <div className="relative w-full lg:max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, cliente, vendedor, arquiteto ou negócio..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-11 border-border/70 bg-background pl-10 text-foreground"
              />
            </div>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <PackageSearch className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">
                {searchTerm ? 'Nenhum pedido encontrado para essa busca' : 'Nenhum pedido encontrado'}
              </p>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'Tente buscar por cliente, vendedor, arquiteto ou número.' : 'Assim que houver pedidos cadastrados, eles aparecerão aqui.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/70 bg-muted/25 hover:bg-muted/25">
                    <TableHead className="w-[80px] text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Nº</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Cliente</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Arquiteto</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Negócio</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Vendedor</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Status</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Valor</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Emissão</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Entrega</TableHead>
                    <TableHead className="w-[110px] text-center text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map((order) => {
                    const statusConfig = STATUS_CONFIG[order.status] || {
                      label: order.status,
                      variant: 'outline' as const,
                      className: 'border-border bg-muted text-muted-foreground',
                    };
                    const deadlineStatus = getDeadlineStatus(order.data_entrega_prevista, order.status);
                    const canEdit = isEditable(order.status);

                    return (
                      <TableRow key={order.id} className="border-border/60 transition-colors hover:bg-muted/20">
                        <TableCell className="font-mono text-base font-semibold text-foreground">#{order.order_number}</TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium text-foreground">{order.client?.name || 'Sem cliente'}</p>
                            {order.client?.cpf_cnpj && (
                              <p className="font-mono text-xs text-muted-foreground">{order.client.cpf_cnpj}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {order.architect ? (
                            <span className="text-sm text-foreground">{order.architect.name}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {order.deal ? (
                            <div className="flex items-center gap-1.5 text-foreground">
                              <span className="max-w-[140px] truncate text-sm">{order.deal.title}</span>
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">{order.vendedor?.full_name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={statusConfig.variant} className={statusConfig.className}>
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          {formatCurrency(order.valor_total)}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {format(new Date(order.data_emissao), 'dd/MM/yy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {order.data_entrega_prevista ? (
                              <>
                                <span className="text-sm text-foreground">
                                  {format(parseDateOnly(order.data_entrega_prevista)!, 'dd/MM/yy', { locale: ptBR })}
                                </span>
                                {deadlineStatus && (
                                  <Badge variant="outline" className={`px-1.5 text-xs ${deadlineStatus.className}`}>
                                    {deadlineStatus.isLate && <AlertTriangle className="mr-1 h-3 w-3" />}
                                    {deadlineStatus.label}
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                    onClick={() => onSelectOrder(order.id)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Visualizar</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                    disabled={!canEdit}
                                    onClick={() => canEdit && onEditOrder?.(order.id)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {canEdit ? 'Editar' : 'Apenas rascunhos, ativos e aguardando aprovação podem ser editados'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {isMaster && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => onDeleteOrder?.(order.id, order.order_number)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Excluir</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col gap-3 border-t border-border/70 bg-muted/10 p-4 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} de {filteredOrders.length}
                </p>
                <div className="flex items-center gap-2 self-end md:self-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
