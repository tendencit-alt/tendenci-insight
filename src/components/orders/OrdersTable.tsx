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
import { Search, ChevronLeft, ChevronRight, AlertTriangle, ExternalLink, Eye, Pencil, Trash2 } from 'lucide-react';

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

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary', color: 'bg-gray-100 text-gray-700' },
  ativo: { label: 'Ativo', variant: 'default', color: 'bg-blue-100 text-blue-700' },
  aguardando_aprovacao: { label: 'Aguardando', variant: 'outline', color: 'bg-yellow-100 text-yellow-700' },
  aprovado: { label: 'Aprovado', variant: 'default', color: 'bg-green-100 text-green-700' },
  em_producao: { label: 'Em Produção', variant: 'default', color: 'bg-purple-100 text-purple-700' },
  faturado: { label: 'Faturado', variant: 'default', color: 'bg-blue-100 text-blue-700' },
  entregue: { label: 'Entregue', variant: 'default', color: 'bg-teal-100 text-teal-700' },
  cancelado: { label: 'Cancelado', variant: 'destructive', color: 'bg-red-100 text-red-700' },
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

  const filteredOrders = orders.filter(order => {
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
    
    // Zera as horas para comparar apenas datas
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDateNormalized = new Date(deadlineDate);
    deadlineDateNormalized.setHours(0, 0, 0, 0);
    
    const daysRemaining = differenceInDays(deadlineDateNormalized, today);
    
    if (daysRemaining < 0) {
      const daysLate = Math.abs(daysRemaining);
      return { label: `${daysLate}d atrasado`, color: 'bg-red-500 text-white', isLate: true };
    }
    if (daysRemaining === 0) {
      return { label: 'Hoje', color: 'bg-orange-500 text-white', isLate: false };
    }
    if (daysRemaining <= 30) {
      return { label: `${daysRemaining}d`, color: 'bg-yellow-500 text-white', isLate: false };
    }
    return { label: `${daysRemaining}d`, color: 'bg-green-500/80 text-white', isLate: false };
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

  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, cliente, vendedor, arquiteto ou negócio..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchTerm ? 'Nenhum pedido encontrado para a busca' : 'Nenhum pedido encontrado'}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Nº</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Arquiteto</TableHead>
                  <TableHead>Negócio</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Entrega</TableHead>
                  <TableHead className="w-[100px] text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((order) => {
                  const statusConfig = STATUS_CONFIG[order.status] || { label: order.status, variant: 'secondary' as const, color: 'bg-gray-100' };
                  const deadlineStatus = getDeadlineStatus(order.data_entrega_prevista, order.status);
                  const canEdit = isEditable(order.status);
                  
                  return (
                    <TableRow
                      key={order.id}
                      className="hover:bg-muted/50"
                    >
                      <TableCell className="font-mono font-medium">
                        #{order.order_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.client?.name || 'Sem cliente'}</p>
                          {order.client?.cpf_cnpj && (
                            <p className="text-xs text-muted-foreground font-mono">{order.client.cpf_cnpj}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.architect ? (
                          <span className="text-sm">{order.architect.name}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.deal ? (
                          <div className="flex items-center gap-1">
                            <span className="text-sm truncate max-w-[120px]">{order.deal.title}</span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{order.vendedor?.full_name || '-'}</TableCell>
                      <TableCell>
                        <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(order.valor_total)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(order.data_emissao), 'dd/MM/yy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {order.data_entrega_prevista ? (
                            <>
                              <span className="text-sm">
                                {format(parseDateOnly(order.data_entrega_prevista)!, 'dd/MM/yy', { locale: ptBR })}
                              </span>
                              {deadlineStatus && (
                                <Badge className={`${deadlineStatus.color} text-xs px-1.5`}>
                                  {deadlineStatus.isLate && <AlertTriangle className="h-3 w-3 mr-1" />}
                                  {deadlineStatus.label}
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
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
                                  className="h-8 w-8"
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
                                  className="h-8 w-8"
                                  disabled={!canEdit}
                                  onClick={() => canEdit && onEditOrder?.(order.id)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {canEdit ? 'Editar' : 'Apenas rascunhos podem ser editados'}
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
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
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

            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} de {filteredOrders.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
