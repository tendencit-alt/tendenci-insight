import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Package } from "lucide-react";

export default function InvCostsTab() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products-costs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, code, unit, current_stock, average_cost, last_cost, cost_price, item_type")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const totalValue = products.reduce((s: number, p: any) => s + ((p.current_stock || 0) * (p.average_cost || p.cost_price || 0)), 0);
  const avgCost = products.length > 0 ? products.reduce((s: number, p: any) => s + (p.average_cost || p.cost_price || 0), 0) / products.length : 0;
  const itemsWithStock = products.filter((p: any) => (p.current_stock || 0) > 0).length;

  const ITEM_TYPES: Record<string, string> = {
    materia_prima: "Matéria Prima",
    semiacabado: "Semiacabado",
    produto_acabado: "Produto Acabado",
    consumo_interno: "Consumo Interno",
    terceiros: "Terceiros",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><DollarSign className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Valor Total Estoque</p><p className="text-lg font-bold font-mono">{fmt(totalValue)}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><TrendingUp className="h-7 w-7 text-primary" /><div><p className="text-xs text-muted-foreground">Custo Médio Geral</p><p className="text-lg font-bold font-mono">{fmt(avgCost)}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Package className="h-7 w-7 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Itens com Saldo</p><p className="text-lg font-bold">{itemsWithStock}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Custos por Item</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="text-right">Custo Médio</TableHead>
                    <TableHead className="text-right">Último Custo</TableHead>
                    <TableHead className="text-right">Valor Estoque</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Sem itens</TableCell></TableRow>}
                  {products
                    .sort((a: any, b: any) => ((b.current_stock || 0) * (b.average_cost || 0)) - ((a.current_stock || 0) * (a.average_cost || 0)))
                    .slice(0, 50)
                    .map((p: any) => {
                      const stockValue = (p.current_stock || 0) * (p.average_cost || p.cost_price || 0);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-xs">{p.code}</TableCell>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell><Badge variant="outline">{ITEM_TYPES[p.item_type] || p.item_type || "—"}</Badge></TableCell>
                          <TableCell className="text-right font-mono text-sm">{p.current_stock || 0} {p.unit}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{fmt(p.average_cost || p.cost_price)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{fmt(p.last_cost)}</TableCell>
                          <TableCell className="text-right font-mono text-sm font-bold">{fmt(stockValue)}</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
