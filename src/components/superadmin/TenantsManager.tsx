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
import { Plus, Building2, Users, Edit, Loader2, Mail, Lock, User, Trash2, Phone, Globe, Palette, Upload } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface TenantForm {
  name: string;
  slug: string;
  plan_id: string;
  max_users: number;
  active: boolean;
  admin_email: string;
  admin_name: string;
  admin_password: string;
  // Company settings fields
  trade_name: string;
  cnpj: string;
  razao_social: string;
  inscricao_estadual: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  primary_color: string;
  accent_color: string;
  logo_url: string;
}

const defaultForm: TenantForm = {
  name: '', slug: '', plan_id: '', max_users: 5, active: true,
  admin_email: '', admin_name: '', admin_password: '',
  trade_name: '', cnpj: '', razao_social: '', inscricao_estadual: '',
  phone: '', email: '', address: '', website: '',
  primary_color: '#D41E1E', accent_color: '#E85D3A', logo_url: '',
};

export function TenantsManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [deletingTenant, setDeletingTenant] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [form, setForm] = useState<TenantForm>({ ...defaultForm });
  const [loadingSettings, setLoadingSettings] = useState(false);

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

  const { data: tenantMemberships } = useQuery({
    queryKey: ['tenant-memberships-admin'],
    queryFn: async () => {
      // Cross-tenant: owner can read all user_tenants rows.
      const { data: uts, error } = await supabase
        .from('user_tenants')
        .select('tenant_id, user_id, role');
      if (error) throw error;
      const rows = uts ?? [];
      const userIds = Array.from(new Set(rows.map(r => r.user_id)));
      let profilesById: Record<string, { full_name: string | null; email: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        (profs ?? []).forEach((p: any) => {
          profilesById[p.id] = { full_name: p.full_name, email: p.email };
        });
      }
      return rows.map(r => ({
        tenant_id: r.tenant_id,
        user_id: r.user_id,
        role: r.role,
        profile: profilesById[r.user_id] ?? null,
      }));
    },
  });

  const userCounts: Record<string, number> = {};
  tenantMemberships?.forEach(m => {
    if (m.tenant_id) {
      userCounts[m.tenant_id] = (userCounts[m.tenant_id] || 0) + 1;
    }
  });

  const getAdminForTenant = (tenantId: string) => {
    const adminRoles = ['owner', 'admin'];
    const found = tenantMemberships?.find(
      m => m.tenant_id === tenantId && adminRoles.includes((m.role || '').toLowerCase())
    );
    if (!found) return null;
    return {
      full_name: found.profile?.full_name ?? null,
      email: found.profile?.email ?? null,
      role: found.role,
    };
  };

  const saveMutation = useMutation({
    mutationFn: async (data: TenantForm) => {
      if (editingTenant) {
        const { error } = await supabase
          .from('tenants')
          .update({ name: data.name, slug: data.slug, plan_id: data.plan_id || null, max_users: data.max_users, active: data.active })
          .eq('id', editingTenant.id);
        if (error) throw error;

        // Upsert company_settings
        const settingsPayload = {
          company_name: data.name,
          trade_name: data.trade_name || data.name,
          cnpj: data.cnpj,
          razao_social: data.razao_social,
          inscricao_estadual: data.inscricao_estadual,
          phone: data.phone,
          email: data.email,
          address: data.address,
          website: data.website,
          primary_color: data.primary_color,
          accent_color: data.accent_color,
          logo_url: data.logo_url || null,
        };

        const { data: existing } = await supabase
          .from('company_settings')
          .select('id')
          .eq('tenant_id', editingTenant.id)
          .maybeSingle();

        if (existing) {
          await supabase.from('company_settings').update(settingsPayload).eq('id', existing.id);
        } else {
          await supabase.from('company_settings').insert({ ...settingsPayload, tenant_id: editingTenant.id });
        }

        // Update admin name if changed
        if (data.admin_name) {
          await supabase
            .from('profiles')
            .update({ full_name: data.admin_name })
            .eq('tenant_id', editingTenant.id)
            .eq('role', 'admin');
        }
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
      queryClient.invalidateQueries({ queryKey: ['tenant-profiles-admin'] });
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

      const { error: auditError } = await supabase.from('deleted_records').insert({
        original_table: 'tenants',
        original_id: tenant.id,
        record_type: 'empresa',
        record_identifier: tenant.name,
        original_data: tenant,
        deletion_reason: reason,
      });
      if (auditError) console.error('Audit error:', auditError);

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
    setForm({ ...defaultForm });
    setEditingTenant(null);
    setDialogOpen(false);
  };

  const openEdit = async (tenant: any) => {
    setEditingTenant(tenant);
    setLoadingSettings(true);
    setDialogOpen(true);

    // Load company_settings and admin profile for this tenant
    const [settingsRes, adminRes] = await Promise.all([
      supabase.from('company_settings').select('*').eq('tenant_id', tenant.id).maybeSingle(),
      supabase.from('profiles').select('full_name, email').eq('tenant_id', tenant.id).eq('role', 'admin').maybeSingle(),
    ]);
    const settings = settingsRes.data;
    const admin = adminRes.data;

    setForm({
      name: tenant.name,
      slug: tenant.slug,
      plan_id: tenant.plan_id || '',
      max_users: tenant.max_users,
      active: tenant.active,
      admin_email: admin?.email || '',
      admin_name: admin?.full_name || '',
      admin_password: '',
      trade_name: settings?.trade_name || '',
      cnpj: settings?.cnpj || '',
      razao_social: settings?.razao_social || '',
      inscricao_estadual: settings?.inscricao_estadual || '',
      phone: settings?.phone || '',
      email: settings?.email || '',
      address: settings?.address || '',
      website: settings?.website || '',
      primary_color: settings?.primary_color || '#D41E1E',
      accent_color: settings?.accent_color || '#E85D3A',
      logo_url: settings?.logo_url || '',
    });
    setLoadingSettings(false);
  };

  const handlePlanChange = (planId: string) => {
    const plan = plans?.find(p => p.id === planId);
    setForm(prev => ({ ...prev, plan_id: planId, max_users: plan?.max_users || prev.max_users }));
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingTenant) return;

    try {
      const ext = file.name.split('.').pop();
      const path = `${editingTenant.id}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('company-assets').getPublicUrl(path);
      setForm(prev => ({ ...prev, logo_url: urlData.publicUrl }));
      toast.success('Logo enviado');
    } catch (err: any) {
      toast.error('Erro ao enviar logo: ' + err.message);
    }
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
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{editingTenant ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
              <DialogDescription>
                {editingTenant
                  ? 'Atualize todos os dados cadastrais da empresa.'
                  : 'Preencha os dados da empresa e do usuário administrador.'}
              </DialogDescription>
            </DialogHeader>

            {loadingSettings ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <ScrollArea className="max-h-[65vh] pr-4">
                <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-5">
                  {/* Dados da Empresa */}
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
                        <Label>Nome Fantasia</Label>
                        <Input value={form.trade_name} onChange={e => setForm(prev => ({ ...prev, trade_name: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Slug (URL) *</Label>
                        <Input value={form.slug} onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))} required />
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <Switch checked={form.active} onCheckedChange={v => setForm(prev => ({ ...prev, active: v }))} />
                        <Label>Empresa Ativa</Label>
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
                  </div>

                  {/* Dados Fiscais */}
                  {editingTenant && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                          <Building2 className="h-4 w-4" /> Dados Fiscais
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>CNPJ</Label>
                            <Input value={form.cnpj} onChange={e => setForm(prev => ({ ...prev, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
                          </div>
                          <div className="space-y-2">
                            <Label>Razão Social</Label>
                            <Input value={form.razao_social} onChange={e => setForm(prev => ({ ...prev, razao_social: e.target.value }))} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Inscrição Estadual</Label>
                          <Input value={form.inscricao_estadual} onChange={e => setForm(prev => ({ ...prev, inscricao_estadual: e.target.value }))} />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Logo */}
                  {editingTenant && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                          <Upload className="h-4 w-4" /> Logo da Empresa
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30">
                            {form.logo_url ? (
                              <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
                            ) : (
                              <Upload className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <Input type="file" accept="image/*" onChange={handleUploadLogo} className="w-64" />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Contato */}
                  {editingTenant && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                          <Phone className="h-4 w-4" /> Contato
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Telefone</Label>
                            <Input value={form.phone} onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <Input value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} type="email" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Endereço</Label>
                            <Input value={form.address} onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Website</Label>
                            <Input value={form.website} onChange={e => setForm(prev => ({ ...prev, website: e.target.value }))} placeholder="https://" />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Cores */}
                  {editingTenant && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                          <Palette className="h-4 w-4" /> Cores do Tema
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Cor Primária</Label>
                            <div className="flex items-center gap-2">
                              <input type="color" value={form.primary_color} onChange={e => setForm(prev => ({ ...prev, primary_color: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border-0" />
                              <Input value={form.primary_color} onChange={e => setForm(prev => ({ ...prev, primary_color: e.target.value }))} className="flex-1" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Cor de Destaque</Label>
                            <div className="flex items-center gap-2">
                              <input type="color" value={form.accent_color} onChange={e => setForm(prev => ({ ...prev, accent_color: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border-0" />
                              <Input value={form.accent_color} onChange={e => setForm(prev => ({ ...prev, accent_color: e.target.value }))} className="flex-1" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Admin section */}
                  <Separator />
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" /> Usuário Administrador {isCreating && '(obrigatório)'}
                    </p>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email do Admin {isCreating && '*'}</Label>
                        <Input
                          type="email"
                          value={form.admin_email}
                          onChange={e => setForm(prev => ({ ...prev, admin_email: e.target.value }))}
                          placeholder="admin@empresa.com.br"
                          required={isCreating}
                          disabled={!!editingTenant}
                          className={editingTenant ? 'bg-muted' : ''}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nome do Admin</Label>
                          <Input
                            value={form.admin_name}
                            onChange={e => setForm(prev => ({ ...prev, admin_name: e.target.value }))}
                            placeholder="Nome completo"
                          />
                        </div>
                        {isCreating && (
                          <div className="space-y-2">
                            <Label className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Senha *</Label>
                            <Input type="password" value={form.admin_password} onChange={e => setForm(prev => ({ ...prev, admin_password: e.target.value }))} placeholder="Mínimo 6 caracteres" minLength={6} required />
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isCreating
                        ? 'O administrador receberá acesso total ao sistema da empresa e poderá gerenciar outros usuários.'
                        : 'O email do admin não pode ser alterado. Para alterar o nome, edite e salve.'}
                    </p>
                  </div>

                  <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                    {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingTenant ? 'Atualizar Empresa' : 'Criar Empresa + Admin'}
                  </Button>
                </form>
              </ScrollArea>
            )}
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
                <TableHead>Admin</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Usuários</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : tenants?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma empresa cadastrada</TableCell></TableRow>
              ) : tenants?.map(tenant => {
                const admin = getAdminForTenant(tenant.id);
                return (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {tenant.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                  <TableCell>
                    {admin ? (
                      <div className="text-sm">
                        <div className="font-medium flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {admin.email}
                        </div>
                        {admin.full_name && <div className="text-muted-foreground text-xs">{admin.full_name}</div>}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem admin</span>
                    )}
                  </TableCell>
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
                );
              })}
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
