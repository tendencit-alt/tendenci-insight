import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useStockReservations } from "@/hooks/useInventoryData";
import { DollarSign, RotateCcw, Package, AlertTriangle, Clock, TrendingDown } from "lucide-react";

export default function InvAnalyticsTab() {
  const { data: products = [] } = useQuery({
    queryKey: ["products-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, code, unit, current_stock, min_stock, max_stock, average_cost, cost_price, lead_time_days, reserved_stock, item_type")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["stock-movements-analytics"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("stock_movements")
        .select("product_id, movement_type, quantity, unit_cost")
        .gte("created_at", thirtyDaysAgo);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reservations = [] } = useStockReservations({ status: "reservado" });

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const stats = useMemo(() => {
    const totalValue = products.reduce((s: number, p: any) => s + ((p.current_stock || 0) * (p.average_cost || p.cost_price || 0)), 0);
    const totalReserved = reservations.reduce((s: number, r: any) => s + (r.quantity || 0), 0);
    const belowMin = products.filter((p: any) => p.min_stock && (p.current_stock || 0) < p.min_stock);
    const zeroStock = products.filter((p: any) => (p.current_stock || 0) <= 0);

    // Giro estoque (saídas 30 dias / estoque médio)
    const outputMovements = movements.filter((m: any) => m.movement_type === "saida");
    const totalOutputQty = outputMovements.reduce((s: number, m: any) => s + (m.quantity || 0), 0);
    const totalStock = products.reduce((s: number, p: any) => s + (p.current_stock || 0), 0);
    const turnover = totalStock > 0 ? (totalOutputQty / totalStock) : 0;

    // Estoque parado (sem movimentação nos últimos 30 dias)
    const movedProductIds = new Set(movements.map((m: any) => m.product_id));
    const stagnant = products.filter((p: any) => (p.current_stock || 0) > 0 && !movedProductIds.has(p.id));

    const avgLeadTime = products.filter((p: any) => p.lead_time_days > 0).length > 0
      ? products.filter((p: any) => p.lead_time_days > 0).reduce((s: number, p: any) => s + p.lead_time_days, 0) / products.filter((p: any) => p.lead_time_days > 0).length
      : 0;

    return { totalValue, totalReserved, belowMin, zeroStock, turnover, stagnant, avgLeadTime, totalStock };
  }, [products, movements, reservations]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><DollarSign className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Valor Total</p><p className="text-lg font-bold font-mono">{fmt(stats.totalValue)}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><RotateCcw className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Giro Estoque (30d)</p><p className="text-lg font-bold">{stats.turnover.toFixed(2)}x</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Package className="h-7 w-7 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Reservado</p><p className="text-lg font-bold">{stats.totalReserved} un</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><AlertTriangle className="h-7 w-7 text-destructive" /><div><p className="text-xs text-muted-foreground">Abaixo Mínimo</p><p className="text-lg font-bold">{stats.belowMin.length}</p></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><TrendingDown className="h-7 w-7 text-destructive" /><div><p className="text-xs text-muted-foreground">Ruptura (Zerado)</p><p className="text-lg font-bold">{stats.zeroStock.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Package className="h-7 w-7 text-amber-500" /><div><p className="text-xs text-muted-foreground">Estoque Parado</p><p className="text-lg font-bold">{stats.stagnant.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Clock className="h-7 w-7 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Lead Time Médio</p><p className="text-lg font-bold">{stats.avgLeadTime.toFixed(0)} dias</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Package className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Total Itens Ativos</p><p className="text-lg font-bold">{products.length}</p></div></CardContent></Card>
      </div>

      {stats.belowMin.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg text-destructive">Itens Abaixo do Estoque Mínimo</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Item</TableHead><TableHead className="text-right">Atual</TableHead><TableHead className="text-right">Mínimo</TableHead><TableHead className="text-right">Déficit</TableHead></TableRow></TableHeader>
              <TableBody>
                {stats.belowMin.slice(0, 15).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.code}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right font-mono">{p.current_stock} {p.unit}</TableCell>
                    <TableCell className="text-right font-mono">{p.min_stock}</TableCell>
                    <TableCell className="text-right"><Badge variant="destructive">{(p.min_stock - (p.current_stock || 0)).toFixed(0)}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {stats.stagnant.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Estoque Parado (sem movimentação 30 dias)</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Item</TableHead><TableHead className="text-right">Estoque</TableHead><TableHead className="text-right">Valor Parado</TableHead></TableRow></TableHeader>
              <TableBody>
                {stats.stagnant.slice(0, 15).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.code}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right font-mono">{p.current_stock} {p.unit}</TableCell>
                    <TableCell className="text-right font-mono">{fmt((p.current_stock || 0) * (p.average_cost || p.cost_price || 0))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
