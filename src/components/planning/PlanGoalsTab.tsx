import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateBrInput } from "@/components/ui/date-br-input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus, Target } from "lucide-react";
import { usePlanGoals, useCreateGoal, useUpdateGoal } from "@/hooks/usePlanningData";
import { useAuth } from "@/contexts/AuthContext";

const GOAL_TYPES: Record<string, string> = {
  faturamento: "Faturamento",
  margem_contribuicao: "Margem Contribuição",
  lucro_liquido: "Lucro Líquido",
  ticket_medio: "Ticket Médio",
  produtividade: "Produtividade Equipe",
};

const SCOPES: Record<string, string> = {
  empresa: "Empresa",
  area: "Área",
  centro_custo: "Centro de Custo",
  projeto: "Projeto",
  vendedor: "Vendedor",
};

export default function PlanGoalsTab() {
  const { user } = useAuth();
  const { data: goals = [], isLoading } = usePlanGoals();
  const createMut = useCreateGoal();
  const updateMut = useUpdateGoal();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ title: "", goal_type: "faturamento", scope: "empresa", period_start: "", period_end: "", target_value: 0 });
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const handleCreate = () => {
    createMut.mutate({ ...form, target_value: Number(form.target_value), created_by: user?.id }, {
      onSuccess: () => { setOpen(false); setForm({ title: "", goal_type: "faturamento", scope: "empresa", period_start: "", period_end: "", target_value: 0 }); },
    });
  };

  const avgAchievement = goals.length > 0 ? goals.reduce((s: number, g: any) => s + (g.achievement_pct || 0), 0) / goals.length : 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Metas Corporativas</h3>
          <Badge variant="outline">{goals.length} metas</Badge>
          <Badge variant={avgAchievement >= 80 ? "default" : "secondary"}>{avgAchievement.toFixed(0)}% média</Badge>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Meta</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Meta</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Título *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tipo</Label>
                  <Select value={form.goal_type} onValueChange={v => setForm({ ...form, goal_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(GOAL_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Escopo</Label>
                  <Select value={form.scope} onValueChange={v => setForm({ ...form, scope: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(SCOPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Início</Label><DateBrInput value={form.period_start} onChange={(iso) => setForm({ ...form, period_start: iso })} /></div>
                <div><Label>Fim</Label><DateBrInput value={form.period_end} onChange={(iso) => setForm({ ...form, period_end: iso })} /></div>
              </div>
              <div><Label>Valor Meta</Label><Input type="number" value={form.target_value} onChange={e => setForm({ ...form, target_value: e.target.value })} /></div>
              <Button onClick={handleCreate} disabled={!form.title || !form.period_start || createMut.isPending}>Criar Meta</Button>
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
                  <TableHead>Meta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Escopo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Meta</TableHead>
                  <TableHead className="text-right">Realizado</TableHead>
                  <TableHead>Atingimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goals.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhuma meta</TableCell></TableRow>}
                {goals.map((g: any) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.title}</TableCell>
                    <TableCell><Badge variant="outline">{GOAL_TYPES[g.goal_type] || g.goal_type}</Badge></TableCell>
                    <TableCell className="text-sm">{SCOPES[g.scope] || g.scope}</TableCell>
                    <TableCell className="text-xs">{new Date(g.period_start + "T12:00:00").toLocaleDateString("pt-BR")} — {new Date(g.period_end + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(g.target_value)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(g.current_value)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={Math.min(g.achievement_pct || 0, 100)} className="h-2 flex-1" />
                        <span className="text-xs font-mono font-bold">{(g.achievement_pct || 0).toFixed(0)}%</span>
                      </div>
                    </TableCell>
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
