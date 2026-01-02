import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart3, 
  Send, 
  XCircle, 
  MessageCircle, 
  TrendingUp, 
  Users, 
  CalendarDays,
  Megaphone,
  CheckCircle,
  User
} from "lucide-react";
import { format, startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface CampaignMetrics {
  total_campanhas: number;
  total_envios: number;
  total_respostas: number;
  total_convertidos: number;
  taxa_resposta: number;
  taxa_conversao: number;
}

interface EvolutionData {
  data: string;
  envios: number;
  respostas: number;
  convertidos: number;
}

interface Vendedor {
  id: string;
  full_name: string;
}

interface VendorComparison {
  vendedor_id: string;
  vendedor_nome: string;
  total_envios: number;
  total_respostas: number;
  total_convertidos: number;
  taxa_resposta: number;
  taxa_conversao: number;
}

type DatePreset = 'today' | 'yesterday' | 'last7days' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'custom';

export function CampanhasKPIDashboard() {
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [evolution, setEvolution] = useState<EvolutionData[]>([]);
  const [vendorComparison, setVendorComparison] = useState<VendorComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState<DatePreset>('lastMonth');
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [selectedVendedor, setSelectedVendedor] = useState<string>('all');

  const getDateRange = (): { from: Date; to: Date } => {
    const now = new Date();
    
    switch (datePreset) {
      case 'today':
        return { from: startOfDay(now), to: endOfDay(now) };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
      case 'last7days':
        return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) };
      case 'thisWeek':
        return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfDay(now) };
      case 'thisMonth':
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      case 'custom':
        if (customRange?.from && customRange?.to) {
          return { from: startOfDay(customRange.from), to: endOfDay(customRange.to) };
        }
        return { from: startOfMonth(now), to: endOfMonth(now) };
      default:
        return { from: startOfMonth(now), to: endOfMonth(now) };
    }
  };

  const fetchVendedores = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('role', ['vendedor', 'admin'])
      .order('full_name');
    
    if (data) setVendedores(data);
  };

  const fetchMetrics = async () => {
    setLoading(true);
    const { from, to } = getDateRange();
    const vendedorId = selectedVendedor === 'all' ? null : selectedVendedor;

    try {
      // Fetch metrics
      const { data: metricsData, error: metricsError } = await supabase
        .rpc('get_campaign_metrics', {
          p_start_date: from.toISOString(),
          p_end_date: to.toISOString(),
          p_vendedor_id: vendedorId
        });

      if (metricsError) throw metricsError;
      if (Array.isArray(metricsData) && metricsData.length > 0) {
        setMetrics(metricsData[0] as CampaignMetrics);
      }

      // Fetch evolution
      const { data: evolutionData, error: evolutionError } = await supabase
        .rpc('get_campaign_evolution', {
          p_start_date: from.toISOString(),
          p_end_date: to.toISOString(),
          p_vendedor_id: vendedorId
        });

      if (evolutionError) throw evolutionError;
      if (Array.isArray(evolutionData)) {
        setEvolution(evolutionData as unknown as EvolutionData[]);
      }

      // Fetch vendor comparison
      const { data: comparisonData, error: comparisonError } = await supabase
        .rpc('get_campaign_vendor_comparison', {
          p_start_date: from.toISOString(),
          p_end_date: to.toISOString()
        });

      if (comparisonError) throw comparisonError;
      if (Array.isArray(comparisonData)) {
        setVendorComparison(comparisonData as unknown as VendorComparison[]);
      }
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendedores();
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [datePreset, customRange, selectedVendedor]);

  const handlePresetChange = (value: string) => {
    if (value === 'custom') {
      setCalendarOpen(true);
    }
    setDatePreset(value as DatePreset);
  };

  const handleCustomRangeSelect = (range: DateRange | undefined) => {
    setCustomRange(range);
    if (range?.from && range?.to) {
      setCalendarOpen(false);
    }
  };

  const getPresetLabel = (): string => {
    switch (datePreset) {
      case 'today': return 'Hoje';
      case 'yesterday': return 'Ontem';
      case 'last7days': return 'Últimos 7 dias';
      case 'thisWeek': return 'Esta semana';
      case 'thisMonth': return 'Este mês';
      case 'lastMonth': return 'Mês passado';
      case 'custom': 
        if (customRange?.from && customRange?.to) {
          return `${format(customRange.from, 'dd/MM')} - ${format(customRange.to, 'dd/MM')}`;
        }
        return 'Personalizado';
      default: return 'Últimos 7 dias';
    }
  };

  const KPICard = ({ 
    title, 
    value, 
    icon: Icon, 
    suffix = '', 
    highlight = false 
  }: { 
    title: string; 
    value: number | string; 
    icon: any; 
    suffix?: string;
    highlight?: boolean;
  }) => (
    <Card className={highlight ? "border-primary bg-primary/5" : ""}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className={`text-2xl font-bold ${highlight ? 'text-primary' : ''}`}>
                {value}{suffix}
              </p>
            )}
          </div>
          <div className={`p-2 rounded-lg ${highlight ? 'bg-primary/10' : 'bg-muted'}`}>
            <Icon className={`h-5 w-5 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const formatEvolutionData = (data: EvolutionData[]) => {
    return data.map(item => ({
      ...item,
      data: format(new Date(item.data), 'dd/MM', { locale: ptBR })
    }));
  };

  return (
    <div className="space-y-4">
      {/* Header com filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Dashboard de Campanhas</h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
            <SelectTrigger className="w-[180px]">
              <User className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Vendedores</SelectItem>
              {vendedores.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={datePreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[180px]">
              <CalendarDays className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="yesterday">Ontem</SelectItem>
              <SelectItem value="last7days">Últimos 7 dias</SelectItem>
              <SelectItem value="thisWeek">Esta semana</SelectItem>
              <SelectItem value="thisMonth">Este mês</SelectItem>
              <SelectItem value="lastMonth">Mês passado</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {datePreset === 'custom' && (
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  {customRange?.from && customRange?.to
                    ? `${format(customRange.from, 'dd/MM')} - ${format(customRange.to, 'dd/MM')}`
                    : 'Selecionar datas'
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={customRange}
                  onSelect={handleCustomRangeSelect}
                  locale={ptBR}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KPICard 
          title="Campanhas" 
          value={metrics?.total_campanhas || 0} 
          icon={Megaphone}
        />
        <KPICard 
          title="Mensagens Enviadas" 
          value={metrics?.total_envios || 0} 
          icon={Send}
        />
        <KPICard 
          title="Respostas Recebidas" 
          value={metrics?.total_respostas || 0} 
          icon={MessageCircle}
        />
      </div>

      {/* KPI Principal destacado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-2 border-primary bg-gradient-to-br from-primary/10 to-primary/5 md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary mb-1">Contato Iniciado</p>
                <p className="text-xs text-muted-foreground mb-2">KPI Principal</p>
                {loading ? (
                  <Skeleton className="h-10 w-20" />
                ) : (
                  <p className="text-4xl font-bold text-primary">
                    {metrics?.taxa_resposta || 0}%
                  </p>
                )}
              </div>
              <div className="p-3 rounded-xl bg-primary/20">
                <MessageCircle className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-primary/20">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Respostas recebidas</span>
                <span className="font-semibold">{metrics?.total_respostas || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <KPICard 
          title="Parceiros Convertidos" 
          value={metrics?.total_convertidos || 0} 
          icon={Users}
          highlight
        />
        <KPICard 
          title="Taxa de Ativação" 
          value={metrics?.taxa_conversao || 0}
          suffix="%" 
          icon={TrendingUp}
          highlight
        />
      </div>

      {/* Gráfico de Evolução */}
      {evolution.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Evolução de Campanhas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formatEvolutionData(evolution)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="data" 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="envios" 
                    name="Enviados"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="respostas" 
                    name="Respostas"
                    stroke="hsl(142, 76%, 36%)" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(142, 76%, 36%)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="convertidos" 
                    name="Convertidos"
                    stroke="hsl(220, 90%, 56%)" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(220, 90%, 56%)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparativo de Vendedores */}
      {vendorComparison.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Comparativo de Vendedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Vendedor</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">Envios</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">Respostas</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">Convertidos</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">Taxa Resposta</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">Taxa Conversão</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorComparison.map((vendor, idx) => (
                    <tr key={vendor.vendedor_id} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                      <td className="py-2 px-3 font-medium">{vendor.vendedor_nome}</td>
                      <td className="text-center py-2 px-3">{vendor.total_envios}</td>
                      <td className="text-center py-2 px-3">{vendor.total_respostas}</td>
                      <td className="text-center py-2 px-3">{vendor.total_convertidos}</td>
                      <td className="text-center py-2 px-3">
                        <span className={`font-medium ${Number(vendor.taxa_resposta) >= 30 ? 'text-green-600' : Number(vendor.taxa_resposta) >= 15 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                          {vendor.taxa_resposta}%
                        </span>
                      </td>
                      <td className="text-center py-2 px-3">
                        <span className={`font-medium ${Number(vendor.taxa_conversao) >= 20 ? 'text-green-600' : Number(vendor.taxa_conversao) >= 10 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                          {vendor.taxa_conversao}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
