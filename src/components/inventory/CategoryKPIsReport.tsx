import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, DollarSign, TrendingDown, AlertOctagon, BarChart3 } from "lucide-react";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const formatNumber = (v: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(v || 0);

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

interface CategoryRow {
  id: string;
  name: string;
  color: string | null;
  productCount: number;
  totalStock: number;
  stockValue: number;
  soldQty: number;
  soldValue: number;
  lostQty: number;
  lostValue: number;
}

export default function CategoryKPIsReport() {
  const [startDate, setStartDate] = useState(daysAgoISO(30));
  const [endDate, setEndDate] = useState(todayISO());

  // Categories
  const { data: categories = [], isLoading: loadingCats } = useQuery({
    queryKey: ["category-kpi-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("id, name, color, active")
        .order("position");
      if (error) throw error;
      return data as { id: string; name: string; color: string | null; active: boolean }[];
    },
  });

  // Products with category + stock + cost
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["category-kpi-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, category_id, current_stock, cost_price")
        .order("name");
      if (error) throw error;
      return data as {
        id: string;
        category_id: string | null;
        current_stock: number | null;
        cost_price: number | null;
      }[];
    },
  });

  // Movements in period
  const { data: movements = [], isLoading: loadingMov } = useQuery({
    queryKey: ["category-kpi-movements", startDate, endDate],
    queryFn: async () => {
      const startTs = new Date(startDate + "T00:00:00").toISOString();
      const endTs = new Date(endDate + "T23:59:59").toISOString();
      const { data, error } = await supabase
        .from("stock_movements")
        .select("product_id, movement_type, quantity, unit_cost, created_at")
        .gte("created_at", startTs)
        .lte("created_at", endTs);
      if (error) throw error;
      return data as {
        product_id: string;
        movement_type: string;
        quantity: number | null;
        unit_cost: number | null;
      }[];
    },
  });

  const isLoading = loadingCats || loadingProducts || loadingMov;

  const rows: CategoryRow[] = useMemo(() => {
    if (!categories.length) return [];

    const productById = new Map(products.map((p) => [p.id, p]));
    const map = new Map<string, CategoryRow>();
    categories.forEach((c) =>
      map.set(c.id, {
        id: c.id,
        name: c.name,
        color: c.color,
        productCount: 0,
        totalStock: 0,
        stockValue: 0,
        soldQty: 0,
        soldValue: 0,
        lostQty: 0,
        lostValue: 0,
      })
    );

    // Stock totals
    products.forEach((p) => {
      if (!p.category_id) return;
      const row = map.get(p.category_id);
      if (!row) return;
      row.productCount += 1;
      row.totalStock += Number(p.current_stock || 0);
      row.stockValue += Number(p.current_stock || 0) * Number(p.cost_price || 0);
    });

    // Movement totals
    movements.forEach((m) => {
      const product = productById.get(m.product_id);
      if (!product || !product.category_id) return;
      const row = map.get(product.category_id);
      if (!row) return;
      const qty = Math.abs(Number(m.quantity || 0));
      const unitCost = Number(m.unit_cost || product.cost_price || 0);
      const value = qty * unitCost;
      if (m.movement_type === "saida") {
        row.soldQty += qty;
        row.soldValue += value;
      } else if (m.movement_type === "ajuste_negativo") {
        row.lostQty += qty;
        row.lostValue += value;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.stockValue - a.stockValue);
  }, [categories, products, movements]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        productCount: acc.productCount + r.productCount,
        totalStock: acc.totalStock + r.totalStock,
        stockValue: acc.stockValue + r.stockValue,
        soldQty: acc.soldQty + r.soldQty,
        soldValue: acc.soldValue + r.soldValue,
        lostQty: acc.lostQty + r.lostQty,
        lostValue: acc.lostValue + r.lostValue,
      }),
      {
        productCount: 0,
        totalStock: 0,
        stockValue: 0,
        soldQty: 0,
        soldValue: 0,
        lostQty: 0,
        lostValue: 0,
      }
    );
  }, [rows]);

  const setQuickRange = (days: number) => {
    setStartDate(daysAgoISO(days));
    setEndDate(todayISO());
  };

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Período de análise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setQuickRange(7)}>
                7 dias
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickRange(30)}>
                30 dias
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickRange(90)}>
                90 dias
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aggregate KPIs */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Package className="h-4 w-4" />}
          label="Estoque atual (unid.)"
          value={formatNumber(totals.totalStock)}
          hint={`${totals.productCount} produtos`}
          loading={isLoading}
        />
        <KpiCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Valor em estoque"
          value={formatCurrency(totals.stockValue)}
          loading={isLoading}
        />
        <KpiCard
          icon={<TrendingDown className="h-4 w-4 text-blue-500" />}
          label="Saídas no período"
          value={formatCurrency(totals.soldValue)}
          hint={`${formatNumber(totals.soldQty)} unid.`}
          loading={isLoading}
        />
        <KpiCard
          icon={<AlertOctagon className="h-4 w-4 text-destructive" />}
          label="Perdas no período"
          value={formatCurrency(totals.lostValue)}
          hint={`${formatNumber(totals.lostQty)} unid.`}
          loading={isLoading}
        />
      </div>

      {/* Per-category breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">KPIs por categoria</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Produtos</TableHead>
                  <TableHead className="text-right">Estoque (unid.)</TableHead>
                  <TableHead className="text-right">Valor em estoque</TableHead>
                  <TableHead className="text-right">Saídas (unid.)</TableHead>
                  <TableHead className="text-right">Saídas (R$)</TableHead>
                  <TableHead className="text-right">Perdas (unid.)</TableHead>
                  <TableHead className="text-right">Perdas (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(8)].map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Nenhuma categoria cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Badge variant="outline" className={r.color || undefined}>
                            {r.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{r.productCount}</TableCell>
                        <TableCell className="text-right">
                          {formatNumber(r.totalStock)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(r.stockValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(r.soldQty)}
                        </TableCell>
                        <TableCell className="text-right text-blue-600">
                          {formatCurrency(r.soldValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(r.lostQty)}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          {formatCurrency(r.lostValue)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold bg-muted/30">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{totals.productCount}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(totals.totalStock)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(totals.stockValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(totals.soldQty)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(totals.soldValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(totals.lostQty)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(totals.lostValue)}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {icon}
          <span>{label}</span>
        </div>
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <div className="text-2xl font-semibold">{value}</div>
        )}
        {hint && !loading && (
          <p className="text-xs text-muted-foreground mt-1">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
}
