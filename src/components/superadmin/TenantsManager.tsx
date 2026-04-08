import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Building2, Users, Edit, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TenantForm {
  name: string;
  slug: string;
  plan_id: string;
  max_users: number;
  active: boolean;
  admin_email?: string;
  admin_name?: string;
  admin_password?: string;
}

export function TenantsManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [form, setForm] = useState<TenantForm>({
    name: '', slug: '', plan_id: '', max_users: 5, active: true,
    admin_email: '', admin_name: '', admin_password: '',
  });

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*, tenant_plans(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: plans } = useQuery({
    queryKey: ['tenant-plans'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tenant_plans').select('*').eq('active', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: userCounts } = useQuery({
    queryKey: ['tenant-user-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('tenant_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach(p => {
        if (p.tenant_id) {
          counts[p.tenant_id] = (counts[p.tenant_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: TenantForm) => {
      if (editingTenant) {
        const { error } = await supabase
          .from('tenants')
          .update({ name: data.name, slug: data.slug, plan_id: data.plan_id || null, max_users: data.max_users, active: data.active })
          .eq('id', editingTenant.id);
        if (error) throw error;
      } else {
        // Criar tenant
        const { data: newTenant, error } = await supabase
          .from('tenants')
          .insert({ name: data.name, slug: data.slug, plan_id: data.plan_id || null, max_users: data.max_users, active: data.active })
          .select()
          .single();
        if (error) throw error;

        // Se admin_email preenchido, criar company_settings para o tenant
        if (newTenant) {
          await supabase.from('company_settings').insert({
            company_name: data.name,
            trade_name: data.name,
            tenant_id: newTenant.id,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-stats'] });
      toast.success(editingTenant ? 'Empresa atualizada!' : 'Empresa criada!');
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao salvar empresa');
    },
  });

  const resetForm = () => {
    setForm({ name: '', slug: '', plan_id: '', max_users: 5, active: true, admin_email: '', admin_name: '', admin_password: '' });
    setEditingTenant(null);
    setDialogOpen(false);
  };

  const openEdit = (tenant: any) => {
    setEditingTenant(tenant);
    setForm({
      name: tenant.name,
      slug: tenant.slug,
      plan_id: tenant.plan_id || '',
      max_users: tenant.max_users,
      active: tenant.active,
    });
    setDialogOpen(true);
  };

  const handlePlanChange = (planId: string) => {
    const plan = plans?.find(p => p.id === planId);
    setForm(prev => ({
      ...prev,
      plan_id: planId,
      max_users: plan?.max_users || prev.max_users,
    }));
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Empresas Cadastradas</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTenant ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Empresa</Label>
                  <Input value={form.name} onChange={e => {
                    const name = e.target.value;
                    setForm(prev => ({ ...prev, name, slug: editingTenant ? prev.slug : generateSlug(name) }));
                  }} required />
                </div>
                <div className="space-y-2">
                  <Label>Slug (URL)</Label>
                  <Input value={form.slug} onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plano</Label>
                  <Select value={form.plan_id} onValueChange={handlePlanChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {plans?.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.max_users} users)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Limite de Usuários</Label>
                  <Input type="number" value={form.max_users} onChange={e => setForm(prev => ({ ...prev, max_users: parseInt(e.target.value) || 5 }))} min={1} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={v => setForm(prev => ({ ...prev, active: v }))} />
                <Label>Empresa Ativa</Label>
              </div>

              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTenant ? 'Atualizar' : 'Criar Empresa'}
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
                <TableHead>Empresa</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Usuários</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : tenants?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma empresa cadastrada</TableCell></TableRow>
              ) : tenants?.map(tenant => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {tenant.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{(tenant as any).tenant_plans?.name || '—'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{userCounts?.[tenant.id] || 0} / {tenant.max_users}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={tenant.active ? 'default' : 'secondary'}>
                      {tenant.active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(tenant)}>
                      <Edit className="h-4 w-4" />
                    </Button>
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
