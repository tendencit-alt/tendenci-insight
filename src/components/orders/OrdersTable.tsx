import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePermissions } from '@/hooks/usePermissions';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateOnly } from '@/utils/timezone';
import { Search, ChevronLeft, ChevronRight, AlertTriangle, Eye, Pencil, Trash2, PackageSearch } from 'lucide-react';

interface Order {
  id: string;
  order_number: number;
  status: string;
  valor_total: number;
  data_emissao: string;
  data_entrega_prevista: string | null;
  client: { id: string; name: string; cpf_cnpj: string | null; phone: string | null } | null;
  vendedor: { id: string; full_name: string } | null;
  
  deal: { id: string; title: string } | null;
}

interface OrdersTableProps {
  orders: Order[];
  isLoading: boolean;
  onSelectOrder: (id: string) => void;
  onEditOrder?: (id: string) => void;
  onDeleteOrder?: (id: string, orderNumber: number) => void;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  onBulkEdit?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  rascunho: { label: 'Rascunho', className: 'border-border bg-muted text-muted-foreground' },
  em_negociacao: { label: 'Negociação', className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400' },
  aprovado: { label: 'Aprovado', className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400' },
  liberado_producao: { label: 'Lib. Produção', className: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-400' },
  em_producao: { label: 'Produção', className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400' },
  producao_concluida: { label: 'Prod. Concluída', className: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-400' },
  liberado_faturamento: { label: 'Lib. Faturamento', className: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-400' },
  faturado: { label: 'Faturado', className: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-400' },
  entregue: { label: 'Entregue', className: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-400' },
  encerrado: { label: 'Encerrado', className: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400' },
  cancelado: { label: 'Cancelado', className: 'border-destructive/20 bg-destructive/10 text-destructive' },
};

const ITEMS_PER_PAGE = 20;

export function OrdersTable({ orders, isLoading, onSelectOrder, onEditOrder, onDeleteOrder, selectedIds = [], onSelectedIdsChange, onBulkEdit }: OrdersTableProps) {
  const { isMaster } = usePermissions();
  const isStatusEditable = (status: string) => ['rascunho', 'em_negociacao'].includes(status);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const toggleSelect = (id: string) => {
    if (!onSelectedIdsChange) return;
    onSelectedIdsChange(
      selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]
    );
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const filteredOrders = orders.filter((order) => {
    const search = searchTerm.toLowerCase();
    return (
      order.order_number.toString().includes(search) ||
      order.client?.name?.toLowerCase().includes(search) ||
      order.client?.cpf_cnpj?.includes(search) ||
      order.vendedor?.full_name?.toLowerCase().includes(search) ||
      
      order.deal?.title?.toLowerCase().includes(search)
    );
  });

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const pageIds = paginatedOrders.map(o => o.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
  const somePageSelected = pageIds.some(id => selectedIds.includes(id)) && !allPageSelected;

  const toggleSelectAll = () => {
    if (!onSelectedIdsChange) return;
    if (allPageSelected) {
      onSelectedIdsChange(selectedIds.filter(id => !pageIds.includes(id)));
    } else {
      onSelectedIdsChange([...new Set([...selectedIds, ...pageIds])]);
    }
  };

  const getDeadlineStatus = (deadline: string | null, status: string, orderId: string) => {
    if (status === 'entregue' || status === 'cancelado') return null;
    
    // We try to use the same logic as the production timeline/Gantt
    // but in a simplified version for the table cell.
    // The user wants to "espelhar" (mirror) the cronograma communication.
    
    if (!deadline) return null;
    const deadlineDate = parseDateOnly(deadline);
    if (!deadlineDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dn = new Date(deadlineDate);
    dn.setHours(0, 0, 0, 0);
    const days = differenceInDays(dn, today);

    if (days < 0) return { label: `${Math.abs(days)}d`, className: 'bg-destructive text-white border-transparent', isLate: true };
    if (days === 0) return { label: 'Hoje', className: 'bg-blue-600 text-white border-transparent', isLate: false };
    if (days <= 2) return { label: `${days}d`, className: 'bg-amber-500 text-white border-transparent', isLate: false };
    
    return { label: `${days}d`, className: 'bg-blue-600 text-white border-transparent', isLate: false };
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card">
        <div className="p-4 space-y-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium text-primary">
            {selectedIds.length} pedido{selectedIds.length !== 1 ? 's' : ''} selecionado{selectedIds.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1.5">
            <Button variant="default" size="sm" className="h-7 text-xs" onClick={() => onBulkEdit?.()}>
              <Pencil className="h-3 w-3 mr-1" />
              Editar em massa
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => onSelectedIdsChange?.([])}>
              Limpar seleção
            </Button>
          </div>
        </div>
      )}
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      {/* Search bar */}
      <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar pedido, cliente, vendedor..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="h-9 border-0 bg-muted/50 pl-9 text-sm focus-visible:ring-1"
          />
        </div>
        <span className="hidden text-xs text-muted-foreground sm:block">
          {filteredOrders.length} resultado{filteredOrders.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16">
          <PackageSearch className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">
            {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum pedido cadastrado'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead className="w-[70px] text-xs font-semibold text-muted-foreground">Nº</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Cliente</TableHead>
                  <TableHead className="hidden text-xs font-semibold text-muted-foreground xl:table-cell">Vendedor</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground">Valor</TableHead>
                  <TableHead className="hidden text-xs font-semibold text-muted-foreground lg:table-cell">Emissão</TableHead>
                  <TableHead className="hidden text-xs font-semibold text-muted-foreground md:table-cell">Entrega</TableHead>
                  <TableHead className="hidden text-xs font-semibold text-muted-foreground lg:table-cell">Centro Custo</TableHead>
                  <TableHead className="w-[90px] text-center text-xs font-semibold text-muted-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((order) => {
                  const sc = STATUS_CONFIG[order.status] || { label: order.status, className: 'border-border bg-muted text-muted-foreground' };
                  const dl = getDeadlineStatus(order.data_entrega_prevista, order.status, order.id);
                  const canEdit = isMaster || isStatusEditable(order.status);

                  return (
                    <TableRow
                      key={order.id}
                      className={`cursor-pointer border-border/40 transition-colors hover:bg-muted/30 ${selectedIds.includes(order.id) ? 'bg-primary/5' : ''}`}
                      onClick={() => onSelectOrder(order.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(order.id)}
                          onCheckedChange={() => toggleSelect(order.id)}
                          aria-label={`Selecionar pedido #${order.order_number}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm font-semibold text-foreground">
                        #{order.order_number}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                          {order.client?.name || 'Sem cliente'}
                        </p>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                        {order.vendedor?.full_name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[11px] font-medium ${sc.className}`}>
                          {sc.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-foreground whitespace-nowrap">
                        {formatCurrency(order.valor_total)}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                        {format(new Date(order.data_emissao), 'dd/MM/yy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {order.data_entrega_prevista ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-muted-foreground">
                              {format(parseDateOnly(order.data_entrega_prevista)!, 'dd/MM/yy', { locale: ptBR })}
                            </span>
                            {dl && (
                              <Badge variant="outline" className={`px-1.5 py-0.5 text-[10px] font-black uppercase tracking-tight shadow-sm ${dl.className}`}>
                                {dl.label}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground lg:table-cell truncate max-w-[150px]">
                        {(order as any).centro_custo || [...new Set(((order as any).order_items || []).map((i: any) => i.centro_custo).filter(Boolean))].join(', ') || '-'}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-0.5">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => onSelectOrder(order.id)}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" disabled={!canEdit} onClick={() => canEdit && onEditOrder?.(order.id)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{canEdit ? 'Editar' : 'Não editável neste status'}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {isMaster && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => onDeleteOrder?.(order.id, order.order_number)}>
                                    <Trash2 className="h-3.5 w-3.5" />
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
            <div className="flex items-center justify-between border-t border-border/50 px-4 py-2.5">
              <p className="text-xs text-muted-foreground">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} de {filteredOrders.length}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground px-2">{currentPage}/{totalPages}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
    </div>
  );
}
