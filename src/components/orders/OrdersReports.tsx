import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, TrendingDown, TrendingUp, Minus } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as ReTooltip, CartesianGrid,
} from "recharts";
import { subDays, startOfDay, endOfDay, startOfMonth, format, differenceInDays, eachDayOfInterval, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Period = "today" | "last_7_days" | "thisMonth" | "last_30_days" | "last_90_days";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "last_7_days", label: "Últimos 7 dias" },
  { value: "thisMonth", label: "Este mês" },
  { value: "last_30_days", label: "Últimos 30 dias" },
  { value: "last_90_days", label: "Últimos 90 dias" },
];

function getRange(period: Period): { from: Date; to: Date } {
  const now = new Date();
  switch (period) {
    case "today": return { from: startOfDay(now), to: endOfDay(now) };
    case "last_7_days": return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "thisMonth": return { from: startOfMonth(now), to: endOfDay(now) };
    case "last_30_days": return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case "last_90_days": return { from: startOfDay(subDays(now, 89)), to: endOfDay(now) };
  }
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v || 0);

function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => {
    const s = String(c ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

interface ReportBlockProps {
  title: string;
  subtitle?: string;
  onExport?: () => void;
  children: React.ReactNode;
  className?: string;
}

function ReportBlock({ title, subtitle, onExport, children, className }: ReportBlockProps) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {onExport && (
          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={onExport}>
            <Download className="h-3 w-3" /> CSV
          </Button>
        )}
      </div>
      {children}
    </Card>
  );
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span className="text-[11px] text-muted-foreground">—</span>;
  if (previous === 0) return <span className="text-[11px] text-emerald-600 inline-flex items-center gap-0.5"><TrendingUp className="h-3 w-3" /> novo</span>;
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.round(delta);
  if (rounded === 0) return <span className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5"><Minus className="h-3 w-3" /> 0%</span>;
  const positive = rounded > 0;
  return (
    <span className={cn(
      "text-[11px] inline-flex items-center gap-0.5",
      positive ? "text-emerald-600" : "text-rose-600"
    )}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : ""}{rounded}%
    </span>
  );
}

interface OrderRow {
  id: string; order_number: number; status: string; valor_total: number;
  data_emissao: string; data_aprovacao: string | null;
  vendedor_id: string | null; client_id: string | null;
  vendedor?: { full_name: string | null } | null;
  client?: { name: string | null } | null;
  order_items?: { centro_custo: string | null; valor_total: number | null }[];
}

export function OrdersReports() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("thisMonth");
  const { from, to } = getRange(period);
  const days = Math.max(1, differenceInDays(to, from) + 1);
  const prevFrom = subDays(from, days);
  const prevTo = subDays(to, days);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["orders-reports", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, order_number, status, valor_total, data_emissao, data_aprovacao,
          vendedor_id, client_id,
          vendedor:profiles!orders_vendedor_id_fkey(full_name),
          client:clients(name),
          order_items(centro_custo, valor_total)
        `)
        .gte("data_emissao", prevFrom.toISOString())
        .lte("data_emissao", to.toISOString())
        .order("data_emissao", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as OrderRow[];
    },
  });

  const current = useMemo(() => rows.filter(r => {
    const d = new Date(r.data_emissao);
    return d >= from && d <= to;
  }), [rows, from, to]);
  const previous = useMemo(() => rows.filter(r => {
    const d = new Date(r.data_emissao);
    return d >= prevFrom && d <= prevTo;
  }), [rows, prevFrom, prevTo]);

  // 1. KPIs
  const kpis = useMemo(() => {
    const calc = (list: OrderRow[]) => {
      const count = list.length;
      const total = list.reduce((s, o) => s + Number(o.valor_total || 0), 0);
      const aprovados = list.filter(o => o.data_aprovacao || o.status === "aprovado" || o.status === "ativo" || o.status === "em_producao" || o.status === "entregue");
      const ticket = count > 0 ? total / count : 0;
      const conv = count > 0 ? (aprovados.length / count) * 100 : 0;
      const tempos = list
        .filter(o => o.data_aprovacao)
        .map(o => differenceInDays(new Date(o.data_aprovacao!), new Date(o.data_emissao)));
      const tempoMedio = tempos.length ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0;
      return { count, total, ticket, conv, tempoMedio };
    };
    return { cur: calc(current), prev: calc(previous) };
  }, [current, previous]);

  // 2. Sales evolution
  const salesChart = useMemo(() => {
    const useMonths = days > 45;
    const buckets = useMonths
      ? eachMonthOfInterval({ start: from, end: to })
      : eachDayOfInterval({ start: from, end: to });
    const fmtKey = (d: Date) => useMonths ? format(d, "yyyy-MM") : format(d, "yyyy-MM-dd");
    const fmtLabel = (d: Date) => useMonths ? format(d, "MMM/yy", { locale: ptBR }) : format(d, "dd/MM");
    const map = new Map<string, { count: number; total: number }>();
    buckets.forEach(d => map.set(fmtKey(d), { count: 0, total: 0 }));
    current.forEach(o => {
      const k = fmtKey(new Date(o.data_emissao));
      const b = map.get(k);
      if (b) { b.count++; b.total += Number(o.valor_total || 0); }
    });
    return buckets.map(d => ({
      label: fmtLabel(d),
      pedidos: map.get(fmtKey(d))!.count,
      valor: map.get(fmtKey(d))!.total,
    }));
  }, [current, from, to, days]);

  // 3. Seller ranking
  const sellers = useMemo(() => {
    const map = new Map<string, { name: string; count: number; total: number }>();
    current.forEach(o => {
      const key = o.vendedor_id || "_sem";
      const name = o.vendedor?.full_name || "Sem vendedor";
      const cur = map.get(key) || { name, count: 0, total: 0 };
      cur.count++; cur.total += Number(o.valor_total || 0);
      map.set(key, cur);
    });
    const arr = Array.from(map.values()).sort((a, b) => b.total - a.total);
    const totalGeral = arr.reduce((s, x) => s + x.total, 0) || 1;
    return arr.map(s => ({ ...s, pct: (s.total / totalGeral) * 100, ticket: s.count ? s.total / s.count : 0 }));
  }, [current]);

  // 4. Cost centers
  const costCenters = useMemo(() => {
    const map = new Map<string, number>();
    current.forEach(o => {
      (o.order_items || []).forEach(it => {
        const cc = (it.centro_custo || "Sem centro").trim() || "Sem centro";
        map.set(cc, (map.get(cc) || 0) + Number(it.valor_total || 0));
      });
    });
    const arr = Array.from(map.entries()).map(([cc, total]) => ({ cc, total }));
    arr.sort((a, b) => b.total - a.total);
    const max = arr[0]?.total || 1;
    return arr.map(x => ({ ...x, pct: (x.total / max) * 100 }));
  }, [current]);

  // 5. Top clients
  const clients = useMemo(() => {
    const map = new Map<string, { name: string; count: number; total: number; last: Date }>();
    current.forEach(o => {
      const key = o.client_id || "_sem";
      const name = o.client?.name || "Sem cliente";
      const d = new Date(o.data_emissao);
      const cur = map.get(key) || { name, count: 0, total: 0, last: d };
      cur.count++; cur.total += Number(o.valor_total || 0);
      if (d > cur.last) cur.last = d;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 20);
  }, [current]);

  // 6. Status funnel
  const statusFunnel = useMemo(() => {
    const labels: Record<string, string> = {
      rascunho: "Rascunho", ativo: "Ativo", aprovado: "Aprovado",
      em_producao: "Em produção", entregue: "Entregue", cancelado: "Cancelado",
    };
    const order = ["rascunho", "ativo", "aprovado", "em_producao", "entregue", "cancelado"];
    const counts = new Map<string, number>();
    current.forEach(o => counts.set(o.status, (counts.get(o.status) || 0) + 1));
    const present = order.filter(s => counts.has(s));
    const max = Math.max(1, ...Array.from(counts.values()));
    return present.map(s => ({
      status: s, label: labels[s] || s, count: counts.get(s) || 0, pct: ((counts.get(s) || 0) / max) * 100,
    }));
  }, [current]);

  const drillStatus = (status: string) => {
    navigate(`/pedidos?section=records&status=${encodeURIComponent(status)}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtro global */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Período</span>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-[11px] text-muted-foreground">
            {format(from, "dd/MM/yyyy")} – {format(to, "dd/MM/yyyy")}
          </span>
        </div>
      </div>

      {/* 1. KPIs */}
      <Card className="p-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Pedidos emitidos", cur: kpis.cur.count, prev: kpis.prev.count, fmt: fmtNum },
            { label: "Faturamento bruto", cur: kpis.cur.total, prev: kpis.prev.total, fmt: fmtBRL },
            { label: "Ticket médio", cur: kpis.cur.ticket, prev: kpis.prev.ticket, fmt: fmtBRL },
            { label: "Conversão (aprovados)", cur: kpis.cur.conv, prev: kpis.prev.conv, fmt: (v: number) => `${v.toFixed(0)}%` },
            { label: "Tempo até aprovação", cur: kpis.cur.tempoMedio, prev: kpis.prev.tempoMedio, fmt: (v: number) => `${v.toFixed(1)} d` },
          ].map((k) => (
            <div key={k.label} className="px-3 py-2 rounded-md hover:bg-muted/40 transition-colors">
              <div className="text-[11px] text-muted-foreground truncate">{k.label}</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-lg font-semibold">{k.fmt(k.cur)}</span>
                <DeltaBadge current={k.cur} previous={k.prev} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 2. Evolução */}
        <ReportBlock
          title="Evolução de vendas"
          subtitle={days > 45 ? "Agrupado por mês" : "Agrupado por dia"}
          onExport={() => downloadCSV(
            `evolucao-vendas-${period}.csv`,
            [["Período", "Pedidos", "Faturamento"], ...salesChart.map(x => [x.label, x.pedidos, x.valor])]
          )}
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesChart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                <ReTooltip
                  contentStyle={{ fontSize: 12, borderRadius: 6 }}
                  formatter={(v: number, name) => name === "valor" ? fmtBRL(v) : v}
                  labelStyle={{ fontSize: 11 }}
                />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportBlock>

        {/* 6. Status funnel */}
        <ReportBlock
          title="Pedidos por status"
          subtitle="Clique para abrir a lista filtrada"
          onExport={() => downloadCSV(
            `status-${period}.csv`,
            [["Status", "Pedidos"], ...statusFunnel.map(x => [x.label, x.count])]
          )}
        >
          {statusFunnel.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Nenhum pedido no período.</p>
          ) : (
            <div className="space-y-2">
              {statusFunnel.map(s => (
                <button
                  key={s.status}
                  onClick={() => drillStatus(s.status)}
                  className="w-full text-left group"
                >
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-muted-foreground group-hover:text-foreground">{s.label}</span>
                    <span className="font-medium">{fmtNum(s.count)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary/70 group-hover:bg-primary transition-colors"
                      style={{ width: `${Math.max(4, s.pct)}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </ReportBlock>
      </div>

      {/* 3. Vendedores */}
      <ReportBlock
        title="Ranking de vendedores"
        subtitle="Ordenado por faturamento"
        onExport={() => downloadCSV(
          `vendedores-${period}.csv`,
          [["Vendedor", "Pedidos", "Faturamento", "Ticket médio", "% do total"],
           ...sellers.map(s => [s.name, s.count, s.total.toFixed(2), s.ticket.toFixed(2), s.pct.toFixed(1)])]
        )}
      >
        {sellers.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Nenhum vendedor no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="text-left font-medium py-1.5">Vendedor</th>
                  <th className="text-right font-medium">Pedidos</th>
                  <th className="text-right font-medium">Faturamento</th>
                  <th className="text-right font-medium">Ticket médio</th>
                  <th className="text-right font-medium">% total</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((s) => (
                  <tr key={s.name} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-1.5">{s.name}</td>
                    <td className="text-right">{fmtNum(s.count)}</td>
                    <td className="text-right font-medium">{fmtBRL(s.total)}</td>
                    <td className="text-right">{fmtBRL(s.ticket)}</td>
                    <td className="text-right">{s.pct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportBlock>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 4. Centro de custo */}
        <ReportBlock
          title="Vendas por centro de custo"
          subtitle="De onde vem a receita"
          onExport={() => downloadCSV(
            `centros-custo-${period}.csv`,
            [["Centro de custo", "Faturamento"], ...costCenters.map(c => [c.cc, c.total.toFixed(2)])]
          )}
        >
          {costCenters.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Sem itens classificados.</p>
          ) : (
            <div className="space-y-2">
              {costCenters.slice(0, 10).map(c => (
                <div key={c.cc}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="truncate text-muted-foreground">{c.cc}</span>
                    <span className="font-medium ml-2">{fmtBRL(c.total)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary/60" style={{ width: `${Math.max(2, c.pct)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ReportBlock>

        {/* 5. Top clients */}
        <ReportBlock
          title="Top 20 clientes"
          subtitle="Concentração de receita"
          onExport={() => downloadCSV(
            `top-clientes-${period}.csv`,
            [["Cliente", "Pedidos", "Faturamento", "Último pedido"],
             ...clients.map(c => [c.name, c.count, c.total.toFixed(2), format(c.last, "dd/MM/yyyy")])]
          )}
        >
          {clients.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Sem clientes no período.</p>
          ) : (
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="text-muted-foreground border-b">
                    <th className="text-left font-medium py-1.5">Cliente</th>
                    <th className="text-right font-medium">Ped.</th>
                    <th className="text-right font-medium">Faturamento</th>
                    <th className="text-right font-medium">Último</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.name} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-1.5 truncate max-w-[180px]" title={c.name}>{c.name}</td>
                      <td className="text-right">{fmtNum(c.count)}</td>
                      <td className="text-right font-medium">{fmtBRL(c.total)}</td>
                      <td className="text-right text-muted-foreground">{format(c.last, "dd/MM/yy")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ReportBlock>
      </div>
    </div>
  );
}
