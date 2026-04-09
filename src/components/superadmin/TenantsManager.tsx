import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Building2, Users, Edit, Loader2, Mail, Lock, User, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TenantForm {
  name: string;
  slug: string;
  plan_id: string;
  max_users: number;
  active: boolean;
  admin_email: string;
  admin_name: string;
  admin_password: string;
}

export function TenantsManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [deletingTenant, setDeletingTenant] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState('');
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

        // Update company_settings name too
        await supabase
          .from('company_settings')
          .update({ company_name: data.name, trade_name: data.name })
          .eq('tenant_id', editingTenant.id);
      } else {
        if (!data.admin_email || !data.admin_password) {
          throw new Error('Email e senha do administrador são obrigatórios');
        }
        if (data.admin_password.length < 6) {
          throw new Error('Senha deve ter no mínimo 6 caracteres');
        }

        const { data: result, error } = await supabase.functions.invoke('create-tenant-with-admin', {
          body: {
            name: data.name, slug: data.slug, plan_id: data.plan_id || null,
            max_users: data.max_users, active: data.active,
            admin_email: data.admin_email, admin_name: data.admin_name, admin_password: data.admin_password,
          },
        });

        if (error) throw error;
        if (result?.error) throw new Error(result.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-user-counts'] });
      toast.success(editingTenant ? 'Empresa atualizada!' : 'Empresa e administrador criados com sucesso!');
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao salvar empresa');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ tenant, reason }: { tenant: any; reason: string }) => {
      if (!reason.trim()) throw new Error('Motivo da exclusão é obrigatório');

      // Record deletion in deleted_records for audit
      const { error: auditError } = await supabase.from('deleted_records').insert({
        original_table: 'tenants',
        original_id: tenant.id,
        record_type: 'empresa',
        record_identifier: tenant.name,
        original_data: tenant,
        deletion_reason: reason,
      });
      if (auditError) console.error('Audit error:', auditError);

      // Deactivate instead of hard delete to preserve data integrity
      const { error } = await supabase
        .from('tenants')
        .update({ active: false })
        .eq('id', tenant.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-stats'] });
      toast.success('Empresa desativada com sucesso');
      setDeletingTenant(null);
      setDeleteReason('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao excluir empresa');
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
      name: tenant.name, slug: tenant.slug, plan_id: tenant.plan_id || '',
      max_users: tenant.max_users, active: tenant.active,
      admin_email: '', admin_name: '', admin_password: '',
    });
    setDialogOpen(true);
  };

  const handlePlanChange = (planId: string) => {
    const plan = plans?.find(p => p.id === planId);
    setForm(prev => ({ ...prev, plan_id: planId, max_users: plan?.max_users || prev.max_users }));
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const isCreating = !editingTenant;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Empresas Cadastradas</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Empresa</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTenant ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
              <DialogDescription>
                {editingTenant
                  ? 'Atualize os dados da empresa.'
                  : 'Preencha os dados da empresa e do usuário administrador.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Dados da Empresa
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome da Empresa *</Label>
                    <Input value={form.name} onChange={e => {
                      const name = e.target.value;
                      setForm(prev => ({ ...prev, name, slug: editingTenant ? prev.slug : generateSlug(name) }));
                    }} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug (URL) *</Label>
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
              </div>

              {isCreating && (
                <div className="space-y-3 border-t pt-4">
                  <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" /> Usuário Administrador (obrigatório)
                  </p>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email do Admin *</Label>
                      <Input type="email" value={form.admin_email} onChange={e => setForm(prev => ({ ...prev, admin_email: e.target.value }))} placeholder="admin@empresa.com.br" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nome do Admin</Label>
                        <Input value={form.admin_name} onChange={e => setForm(prev => ({ ...prev, admin_name: e.target.value }))} placeholder="Nome completo" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Senha *</Label>
                        <Input type="password" value={form.admin_password} onChange={e => setForm(prev => ({ ...prev, admin_password: e.target.value }))} placeholder="Mínimo 6 caracteres" minLength={6} required />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O administrador receberá acesso total ao sistema da empresa e poderá gerenciar outros usuários.
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTenant ? 'Atualizar Empresa' : 'Criar Empresa + Admin'}
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
                <TableHead className="w-[100px]">Ações</TableHead>
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
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(tenant)} title="Editar">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingTenant(tenant)} title="Excluir" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deletingTenant} onOpenChange={(open) => { if (!open) { setDeletingTenant(null); setDeleteReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar empresa "{deletingTenant?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              A empresa será desativada e seus usuários perderão acesso ao sistema. Esta ação será registrada no log de auditoria. Informe o motivo:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={deleteReason}
            onChange={e => setDeleteReason(e.target.value)}
            placeholder="Motivo da exclusão (obrigatório)"
            className="min-h-[80px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTenant && deleteMutation.mutate({ tenant: deletingTenant, reason: deleteReason })}
              disabled={!deleteReason.trim() || deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Desativar Empresa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
