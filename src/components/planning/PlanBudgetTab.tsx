import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, DollarSign } from "lucide-react";
import { usePlanBudgets, useCreateBudget } from "@/hooks/usePlanningData";
import { useAuth } from "@/contexts/AuthContext";

const CATEGORIES: Record<string, string> = {
  receita: "Receita Prevista",
  custo_variavel: "Custo Variável",
  custo_fixo: "Custo Fixo",
  investimento: "Investimento",
  contratacao: "Contratação",
};

export default function PlanBudgetTab() {
  const { user } = useAuth();
  const { data: budgets = [], isLoading } = usePlanBudgets();
  const createMut = useCreateBudget();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ category: "receita", subcategory: "", description: "", reference_month: "", planned_value: 0 });
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const handleCreate = () => {
    createMut.mutate({ ...form, planned_value: Number(form.planned_value), created_by: user?.id }, {
      onSuccess: () => { setOpen(false); setForm({ category: "receita", subcategory: "", description: "", reference_month: "", planned_value: 0 }); },
    });
  };

  const summary = useMemo(() => {
    const byCategory = new Map<string, { planned: number; actual: number }>();
    budgets.forEach((b: any) => {
      const cat = b.category;
      if (!byCategory.has(cat)) byCategory.set(cat, { planned: 0, actual: 0 });
      byCategory.get(cat)!.planned += b.planned_value || 0;
      byCategory.get(cat)!.actual += b.actual_value || 0;
    });
    return byCategory;
  }, [budgets]);

  const totalPlanned = budgets.reduce((s: number, b: any) => s + (b.category === "receita" ? (b.planned_value || 0) : -(b.planned_value || 0)), 0);
  const totalActual = budgets.reduce((s: number, b: any) => s + (b.category === "receita" ? (b.actual_value || 0) : -(b.actual_value || 0)), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Resultado Orçado</p><p className="text-lg font-bold font-mono">{fmt(totalPlanned)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Resultado Realizado</p><p className="text-lg font-bold font-mono">{fmt(totalActual)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Desvio</p><p className={`text-lg font-bold font-mono ${totalActual - totalPlanned >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(totalActual - totalPlanned)}</p></CardContent></Card>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <DollarSign className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Orçamento Empresarial</h3>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Linha</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Linha Orçamentária</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Descrição</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Mês Referência</Label><Input type="month" value={form.reference_month} onChange={e => setForm({ ...form, reference_month: e.target.value + "-01" })} /></div>
                <div><Label>Valor Planejado</Label><Input type="number" value={form.planned_value} onChange={e => setForm({ ...form, planned_value: e.target.value })} /></div>
              </div>
              <Button onClick={handleCreate} disabled={!form.reference_month || createMut.isPending}>Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Planejado</TableHead>
                  <TableHead className="text-right">Realizado</TableHead>
                  <TableHead className="text-right">Desvio</TableHead>
                  <TableHead className="text-right">Desvio %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgets.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhuma linha</TableCell></TableRow>}
                {budgets.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell><Badge variant="outline">{CATEGORIES[b.category] || b.category}</Badge></TableCell>
                    <TableCell className="text-sm">{b.description || "—"}</TableCell>
                    <TableCell className="text-sm">{b.reference_month ? new Date(b.reference_month + "T12:00:00").toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) : "—"}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(b.planned_value)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(b.actual_value)}</TableCell>
                    <TableCell className={`text-right font-mono ${(b.deviation || 0) >= 0 ? "" : "text-destructive"}`}>{fmt(b.deviation)}</TableCell>
                    <TableCell className={`text-right font-mono ${(b.deviation_pct || 0) >= 0 ? "" : "text-destructive"}`}>{(b.deviation_pct || 0).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
