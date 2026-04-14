import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FlaskConical, TrendingUp } from "lucide-react";
import { usePlanScenarios, useCreateScenario } from "@/hooks/usePlanningData";
import { useAuth } from "@/contexts/AuthContext";

export default function PlanScenariosTab() {
  const { user } = useAuth();
  const { data: scenarios = [], isLoading } = usePlanScenarios();
  const createMut = useCreateScenario();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: "", description: "", projected_revenue: 0, projected_cost: 0, cash_need: 0, runway_months: 0 });
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const handleCreate = () => {
    createMut.mutate({
      name: form.name,
      description: form.description,
      projected_revenue: Number(form.projected_revenue),
      projected_cost: Number(form.projected_cost),
      cash_need: Number(form.cash_need),
      runway_months: Number(form.runway_months),
      created_by: user?.id,
    }, { onSuccess: () => { setOpen(false); setForm({ name: "", description: "", projected_revenue: 0, projected_cost: 0, cash_need: 0, runway_months: 0 }); } });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <FlaskConical className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Simulações Financeiras</h3>
          <Badge variant="outline">{scenarios.length} cenários</Badge>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo Cenário</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Cenário</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Receita Projetada</Label><Input type="number" value={form.projected_revenue} onChange={e => setForm({ ...form, projected_revenue: e.target.value })} /></div>
                <div><Label>Custo Projetado</Label><Input type="number" value={form.projected_cost} onChange={e => setForm({ ...form, projected_cost: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Necessidade Caixa</Label><Input type="number" value={form.cash_need} onChange={e => setForm({ ...form, cash_need: e.target.value })} /></div>
                <div><Label>Runway (meses)</Label><Input type="number" value={form.runway_months} onChange={e => setForm({ ...form, runway_months: e.target.value })} /></div>
              </div>
              <Button onClick={handleCreate} disabled={!form.name || createMut.isPending}>Criar Cenário</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenarios.length === 0 && <p className="text-muted-foreground col-span-2 text-center py-8">Nenhum cenário criado</p>}
          {scenarios.map((s: any) => (
            <Card key={s.id} className="border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex justify-between items-center">
                  {s.name}
                  {s.is_active && <Badge>Ativo</Badge>}
                </CardTitle>
                {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Receita:</span> <span className="font-mono">{fmt(s.projected_revenue)}</span></div>
                <div><span className="text-muted-foreground">Custo:</span> <span className="font-mono">{fmt(s.projected_cost)}</span></div>
                <div><span className="text-muted-foreground">Lucro:</span> <span className="font-mono font-bold">{fmt(s.projected_profit)}</span></div>
                <div><span className="text-muted-foreground">Margem:</span> <span className="font-mono">{(s.projected_margin_pct || 0).toFixed(1)}%</span></div>
                <div><span className="text-muted-foreground">Nec. Caixa:</span> <span className="font-mono">{fmt(s.cash_need)}</span></div>
                <div><span className="text-muted-foreground">Runway:</span> <span className="font-mono">{s.runway_months || 0} meses</span></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
