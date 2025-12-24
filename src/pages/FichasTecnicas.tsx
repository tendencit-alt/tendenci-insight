import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileSpreadsheet, 
  Search, 
  Package, 
  Calculator,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ProductionOrderDetailSheet } from '@/components/production/ProductionOrderDetailSheet';

export default function FichasTecnicas() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Buscar todas as fichas técnicas com dados relacionados
  const { data: fichas = [], isLoading } = useQuery({
    queryKey: ['fichas-tecnicas', searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('production_products')
        .select(`
          *,
          production_order:production_orders(
            id,
            order_number,
            title,
            status,
            client:clients(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filtrar por termo de busca
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return data.filter(f => 
          f.name?.toLowerCase().includes(term) ||
          f.production_order?.title?.toLowerCase().includes(term) ||
          f.production_order?.client?.name?.toLowerCase().includes(term) ||
          String(f.production_order?.order_number).includes(term)
        );
      }

      return data;
    }
  });

  // Buscar contagens de insumos para cada ficha
  const { data: bomCounts = {} } = useQuery({
    queryKey: ['bom-counts', fichas.map(f => f.id)],
    queryFn: async () => {
      if (fichas.length === 0) return {};

      const { data, error } = await supabase
        .from('production_product_bom')
        .select('production_product_id')
        .in('production_product_id', fichas.map(f => f.id));

      if (error) throw error;

      // Contar insumos por ficha
      const counts: Record<string, number> = {};
      data.forEach(item => {
        counts[item.production_product_id] = (counts[item.production_product_id] || 0) + 1;
      });
      return counts;
    },
    enabled: fichas.length > 0
  });

  // KPIs
  const totalFichas = fichas.length;
  const fichasAprovadas = fichas.filter(f => f.status === 'aprovado').length;
  const fichasRascunho = fichas.filter(f => f.status === 'rascunho').length;
  const cmvTotal = fichas.reduce((acc, f) => acc + (f.cmv_total || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case 'finalizado':
        return <Badge className="bg-blue-100 text-blue-800">Finalizado</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Rascunho</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fichas Técnicas</h1>
          <p className="text-muted-foreground">Gerencie as fichas técnicas das ordens de produção</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{totalFichas}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aprovadas</p>
                  <p className="text-2xl font-bold">{fichasAprovadas}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Clock className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rascunho</p>
                  <p className="text-2xl font-bold">{fichasRascunho}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Calculator className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CMV Total</p>
                  <p className="text-xl font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cmvTotal)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por OP, produto, cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : fichas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mb-4 opacity-40" />
                <p className="font-medium">Nenhuma ficha técnica encontrada</p>
                <p className="text-sm">Fichas são criadas automaticamente quando uma OP é criada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OP</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-center">Insumos</TableHead>
                      <TableHead className="text-right">CMV</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fichas.map((ficha) => (
                      <TableRow key={ficha.id}>
                        <TableCell>
                          <span className="font-mono text-sm">
                            OP-{String(ficha.production_order?.order_number || 0).padStart(4, '0')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{ficha.name}</p>
                            <p className="text-xs text-muted-foreground">{ficha.production_order?.title}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {ficha.production_order?.client?.name || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="gap-1">
                            <Package className="h-3 w-3" />
                            {bomCounts[ficha.id] || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ficha.cmv_total || 0)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(ficha.status)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(ficha.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedOrderId(ficha.production_order?.id || null)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sheet de Detalhes da OP */}
      <ProductionOrderDetailSheet
        orderId={selectedOrderId}
        open={!!selectedOrderId}
        onOpenChange={(open) => !open && setSelectedOrderId(null)}
      />
    </DashboardLayout>
  );
}
