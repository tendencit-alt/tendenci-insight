import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Edit, Loader2, CreditCard } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PlanForm {
  name: string;
  max_users: number;
  price: number;
  extra_user_price: number;
  active: boolean;
}

export function PlansManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [form, setForm] = useState<PlanForm>({ name: '', max_users: 5, price: 0, active: true });

  const { data: plans, isLoading } = useQuery({
    queryKey: ['tenant-plans-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tenant_plans').select('*').order('price');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: PlanForm) => {
      if (editingPlan) {
        const { error } = await supabase.from('tenant_plans').update(data).eq('id', editingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tenant_plans').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-plans-all'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-plans'] });
      toast.success(editingPlan ? 'Plano atualizado!' : 'Plano criado!');
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao salvar plano'),
  });

  const resetForm = () => {
    setForm({ name: '', max_users: 5, price: 0, active: true });
    setEditingPlan(null);
    setDialogOpen(false);
  };

  const openEdit = (plan: any) => {
    setEditingPlan(plan);
    setForm({ name: plan.name, max_users: plan.max_users, price: plan.price, active: plan.active });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Planos do Sistema</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Novo Plano</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPlan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Plano</Label>
                <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Limite de Usuários</Label>
                  <Input type="number" value={form.max_users} onChange={e => setForm(prev => ({ ...prev, max_users: parseInt(e.target.value) || 5 }))} min={1} />
                </div>
                <div className="space-y-2">
                  <Label>Preço Mensal (R$)</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={e => setForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))} min={0} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={v => setForm(prev => ({ ...prev, active: v }))} />
                <Label>Plano Ativo</Label>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingPlan ? 'Atualizar' : 'Criar Plano'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plano</TableHead>
                <TableHead>Limite de Usuários</TableHead>
                <TableHead>Preço Mensal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : plans?.map(plan => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      {plan.name}
                    </div>
                  </TableCell>
                  <TableCell>{plan.max_users}</TableCell>
                  <TableCell>R$ {Number(plan.price).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={plan.active ? 'default' : 'secondary'}>{plan.active ? 'Ativo' : 'Inativo'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(plan)}><Edit className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
