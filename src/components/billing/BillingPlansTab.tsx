import { useState } from 'react';
import { usePlansWithDetails } from '@/hooks/useBillingData';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Edit, Loader2, CreditCard, Check, X } from 'lucide-react';

const q = (t: string) => (supabase as any).from(t);

interface PlanForm {
  name: string;
  description: string;
  price: number;
  yearly_price: number;
  max_users: number;
  max_companies: number;
  max_projects: number;
  max_orders: number;
  max_storage_mb: number;
  active: boolean;
}

const defaultForm: PlanForm = {
  name: '', description: '', price: 0, yearly_price: 0, max_users: 5,
  max_companies: 1, max_projects: 0, max_orders: 0, max_storage_mb: 500, active: true,
};

export function BillingPlansTab() {
  const queryClient = useQueryClient();
  const { data: plans, isLoading } = usePlansWithDetails();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<PlanForm>(defaultForm);

  const saveMutation = useMutation({
    mutationFn: async (data: PlanForm) => {
      if (editing) {
        const { error } = await q('tenant_plans').update(data).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await q('tenant_plans').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-plans-details'] });
      toast.success(editing ? 'Plano atualizado!' : 'Plano criado!');
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => { setForm(defaultForm); setEditing(null); setDialogOpen(false); };

  const openEdit = (plan: any) => {
    setEditing(plan);
    setForm({
      name: plan.name, description: plan.description || '', price: plan.price,
      yearly_price: plan.yearly_price || 0, max_users: plan.max_users,
      max_companies: plan.max_companies || 1, max_projects: plan.max_projects || 0,
      max_orders: plan.max_orders || 0, max_storage_mb: plan.max_storage_mb || 500, active: plan.active,
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Planos do Sistema</h2>
        <Dialog open={dialogOpen} onOpenChange={o => { if (!o) resetForm(); setDialogOpen(o); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Novo Plano</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing ? 'Editar Plano' : 'Novo Plano'}</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Preço Mensal (R$)</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={e => setForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Preço Anual (R$)</Label><Input type="number" step="0.01" value={form.yearly_price} onChange={e => setForm(p => ({ ...p, yearly_price: parseFloat(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><Label>Máx Usuários</Label><Input type="number" value={form.max_users} onChange={e => setForm(p => ({ ...p, max_users: parseInt(e.target.value) || 1 }))} min={1} /></div>
                <div className="space-y-2"><Label>Máx Empresas</Label><Input type="number" value={form.max_companies} onChange={e => setForm(p => ({ ...p, max_companies: parseInt(e.target.value) || 1 }))} min={1} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Máx Projetos</Label><Input type="number" value={form.max_projects} onChange={e => setForm(p => ({ ...p, max_projects: parseInt(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><Label>Máx Ordens</Label><Input type="number" value={form.max_orders} onChange={e => setForm(p => ({ ...p, max_orders: parseInt(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><Label>Armazenamento (MB)</Label><Input type="number" value={form.max_storage_mb} onChange={e => setForm(p => ({ ...p, max_storage_mb: parseInt(e.target.value) || 500 }))} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={v => setForm(p => ({ ...p, active: v }))} />
                <Label>Plano Ativo</Label>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Atualizar' : 'Criar Plano'}
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
                <TableHead>Mensal</TableHead>
                <TableHead>Anual</TableHead>
                <TableHead>Usuários</TableHead>
                <TableHead>Projetos</TableHead>
                <TableHead>Storage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : plans?.map((plan: any) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div>{plan.name}</div>
                        {plan.description && <div className="text-xs text-muted-foreground">{plan.description}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>R$ {Number(plan.price).toFixed(2)}</TableCell>
                  <TableCell>R$ {Number(plan.yearly_price || 0).toFixed(2)}</TableCell>
                  <TableCell>{plan.max_users}</TableCell>
                  <TableCell>{plan.max_projects || '∞'}</TableCell>
                  <TableCell>{plan.max_storage_mb || 500} MB</TableCell>
                  <TableCell><Badge variant={plan.active ? 'default' : 'secondary'}>{plan.active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => openEdit(plan)}><Edit className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
