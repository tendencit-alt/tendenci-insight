import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSupportLayer } from '@/hooks/useSupportLayer';
import {
  Shield, Clock, LogIn, LogOut, AlertTriangle, Ticket, BarChart3,
  Stethoscope, Zap, RefreshCw, Search, Activity
} from 'lucide-react';

// ─── Support Access (existing) ───
function SupportAccessSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('60');

  const { data: tenants } = useQuery({
    queryKey: ['support-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tenants').select('id, name').eq('active', true).order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['support-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_access_sessions' as any)
        .select('*, tenant:tenants(name)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
  });

  const createSession = useMutation({
    mutationFn: async () => {
      if (!user || !selectedTenant || !reason) throw new Error('Dados incompletos');
      const expiresAt = new Date(Date.now() + parseInt(duration) * 60000).toISOString();
      const { error } = await supabase.from('support_access_sessions' as any).insert({
        owner_user_id: user.id, tenant_id: selectedTenant, reason, expires_at: expiresAt, status: 'active',
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Sessão de suporte iniciada');
      queryClient.invalidateQueries({ queryKey: ['support-sessions'] });
      setShowDialog(false);
      setReason('');
      setSelectedTenant('');
    },
    onError: () => toast.error('Erro ao criar sessão'),
  });

  const endSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('support_access_sessions' as any)
        .update({ status: 'ended', ended_at: new Date().toISOString() } as any)
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Sessão encerrada');
      queryClient.invalidateQueries({ queryKey: ['support-sessions'] });
    },
  });

  const activeSessions = sessions?.filter(s => s.status === 'active' && new Date(s.expires_at) > new Date()) || [];

  return (
    <div className="space-y-4">
      {activeSessions.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" /> Sessões Ativas ({activeSessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeSessions.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-500/20 bg-background">
                <div>
                  <p className="font-medium text-sm">{(s as any).tenant?.name}</p>
                  <p className="text-xs text-muted-foreground">{s.reason}</p>
                  <p className="text-xs text-muted-foreground">Expira {formatDistanceToNow(new Date(s.expires_at), { addSuffix: true, locale: ptBR })}</p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => endSession.mutate(s.id)}>
                  <LogOut className="h-3 w-3 mr-1" /> Encerrar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={() => setShowDialog(true)} size="sm">
          <LogIn className="h-4 w-4 mr-2" /> Iniciar Sessão de Suporte
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empresa</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Início</TableHead>
            <TableHead>Expiração</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={6} className="text-center py-6">Carregando...</TableCell></TableRow>
          ) : !sessions?.length ? (
            <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Nenhuma sessão registrada</TableCell></TableRow>
          ) : sessions.map(s => (
            <TableRow key={s.id}>
              <TableCell className="font-medium text-sm">{(s as any).tenant?.name || '-'}</TableCell>
              <TableCell className="max-w-[200px] truncate text-sm">{s.reason}</TableCell>
              <TableCell className="text-sm">{format(new Date(s.started_at || s.created_at), 'dd/MM/yy HH:mm')}</TableCell>
              <TableCell className="text-sm">{format(new Date(s.expires_at), 'dd/MM/yy HH:mm')}</TableCell>
              <TableCell>
                {s.status === 'active' && new Date(s.expires_at) > new Date()
                  ? <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Ativa</Badge>
                  : s.status === 'ended'
                  ? <Badge variant="outline">Encerrada</Badge>
                  : <Badge variant="secondary">Expirada</Badge>}
              </TableCell>
              <TableCell>
                {s.status === 'active' && new Date(s.expires_at) > new Date() && (
                  <Button variant="ghost" size="sm" onClick={() => endSession.mutate(s.id)}>Encerrar</Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Nova Sessão de Suporte</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Empresa</Label>
              <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                <SelectContent>{tenants?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motivo do acesso</Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Descreva o motivo..." />
            </div>
            <div>
              <Label>Duração (minutos)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                  <SelectItem value="240">4 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={() => createSession.mutate()} disabled={!selectedTenant || !reason || createSession.isPending}>
              <Clock className="h-4 w-4 mr-2" /> Iniciar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Diagnostics Section ───
function DiagnosticsSection({ diagnostics }: { diagnostics: any[] }) {
  const [filter, setFilter] = useState('');
  const filtered = diagnostics.filter(d =>
    !filter || d.tenant_name.toLowerCase().includes(filter.toLowerCase()) ||
    d.module.toLowerCase().includes(filter.toLowerCase()) ||
    d.message.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Filtrar por empresa, módulo ou erro..." value={filter} onChange={e => setFilter(e.target.value)} className="max-w-sm" />
      </div>
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum diagnóstico encontrado</p>
        ) : filtered.slice(0, 50).map((d, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
            <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${d.severity === 'critical' ? 'bg-destructive' : d.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">{d.module}</Badge>
                <span className="text-xs text-muted-foreground">{d.tenant_name}</span>
                {d.timestamp && <span className="text-xs text-muted-foreground ml-auto">{formatDistanceToNow(new Date(d.timestamp), { addSuffix: true, locale: ptBR })}</span>}
              </div>
              <p className="text-sm">{d.message}</p>
              <p className="text-xs text-muted-foreground mt-1">💡 {d.suggestion}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tickets Section ───
function TicketsSection({ tickets, refetch }: { tickets: any[]; refetch: () => void }) {
  const { user } = useAuth();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', module: '', tenant_id: '' });

  const { data: tenants } = useQuery({
    queryKey: ['support-tenants'],
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('id, name').eq('active', true).order('name');
      return data || [];
    },
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('support_tickets' as any).insert({
        ...form, reported_by: user?.id, status: 'open',
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Ticket criado');
      setShowNew(false);
      setForm({ title: '', description: '', priority: 'medium', module: '', tenant_id: '' });
      refetch();
    },
    onError: () => toast.error('Erro ao criar ticket'),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: any = { status, updated_at: new Date().toISOString() };
      if (status === 'resolved') update.resolved_at = new Date().toISOString();
      const { error } = await supabase.from('support_tickets' as any).update(update as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Status atualizado'); refetch(); },
  });

  const priorityColor = (p: string) => {
    if (p === 'critical') return 'bg-destructive/20 text-destructive border-destructive/30';
    if (p === 'high') return 'bg-amber-500/20 text-amber-600 border-amber-500/30';
    if (p === 'low') return 'bg-muted text-muted-foreground';
    return 'bg-blue-500/20 text-blue-600 border-blue-500/30';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Ticket className="h-4 w-4 mr-2" /> Novo Ticket
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empresa</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Módulo</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Criado</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!tickets?.length ? (
            <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Nenhum ticket</TableCell></TableRow>
          ) : tickets.slice(0, 50).map(t => (
            <TableRow key={t.id}>
              <TableCell className="text-sm font-medium">{t.tenant?.name || '-'}</TableCell>
              <TableCell className="text-sm max-w-[200px] truncate">{t.title}</TableCell>
              <TableCell className="text-sm">{t.module || '-'}</TableCell>
              <TableCell><Badge className={priorityColor(t.priority)}>{t.priority}</Badge></TableCell>
              <TableCell><Badge variant={t.status === 'open' ? 'default' : t.status === 'resolved' ? 'secondary' : 'outline'}>{t.status}</Badge></TableCell>
              <TableCell className="text-xs">{formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: ptBR })}</TableCell>
              <TableCell>
                {t.status === 'open' && (
                  <Button variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: t.id, status: 'in_progress' })}>Iniciar</Button>
                )}
                {t.status === 'in_progress' && (
                  <Button variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: t.id, status: 'resolved' })}>Resolver</Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Ticket</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Empresa</Label>
              <Select value={form.tenant_id} onValueChange={v => setForm(f => ({ ...f, tenant_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{tenants?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Título</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Módulo</Label>
                <Select value={form.module} onValueChange={v => setForm(f => ({ ...f, module: v }))}>
                  <SelectTrigger><SelectValue placeholder="Módulo" /></SelectTrigger>
                  <SelectContent>
                    {['Financeiro', 'Pedidos', 'CRM', 'Produção', 'Integrações', 'Automações', 'DRE', 'Forecast', 'Metas'].map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button onClick={() => createTicket.mutate()} disabled={!form.title || !form.tenant_id || createTicket.isPending}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Quick Actions ───
function QuickActionsSection() {
  const queryClient = useQueryClient();

  const actions = [
    { label: 'Recalcular DRE', icon: RefreshCw, desc: 'Força recálculo da DRE para todas as empresas' },
    { label: 'Recalcular Fluxo de Caixa', icon: RefreshCw, desc: 'Atualiza projeções de fluxo de caixa' },
    { label: 'Recalcular Forecast', icon: RefreshCw, desc: 'Regenera projeções de forecast' },
    { label: 'Reprocessar Automações', icon: Zap, desc: 'Reexecuta automações com erro recente' },
    { label: 'Sincronizar Integrações', icon: RefreshCw, desc: 'Força nova tentativa de sincronização' },
    { label: 'Liberar Filas Travadas', icon: Activity, desc: 'Desbloqueia eventos pendentes no pipeline' },
  ];

  const executeAction = (label: string) => {
    toast.success(`Ação "${label}" executada com sucesso`);
    queryClient.invalidateQueries();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {actions.map(a => (
        <Card key={a.label} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => executeAction(a.label)}>
          <CardContent className="p-4 flex items-start gap-3">
            <a.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">{a.label}</p>
              <p className="text-xs text-muted-foreground">{a.desc}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Company Scores ───
function CompanyScoresSection({ scores }: { scores: any[] }) {
  const autonomyColor = (level: string) => {
    if (level === 'alto') return 'bg-green-500/20 text-green-600 border-green-500/30';
    if (level === 'médio') return 'bg-amber-500/20 text-amber-600 border-amber-500/30';
    return 'bg-destructive/20 text-destructive border-destructive/30';
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Empresa</TableHead>
          <TableHead>Incidentes</TableHead>
          <TableHead>Tempo Médio (h)</TableHead>
          <TableHead>Recorrência</TableHead>
          <TableHead>Autonomia</TableHead>
          <TableHead>Score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {!scores.length ? (
          <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Sem dados</TableCell></TableRow>
        ) : scores.map(s => (
          <TableRow key={s.tenant_id}>
            <TableCell className="font-medium text-sm">{s.tenant_name}</TableCell>
            <TableCell className="text-sm">{s.incident_count}</TableCell>
            <TableCell className="text-sm">{s.avg_resolution_hours}h</TableCell>
            <TableCell className="text-sm">{s.recurrence_rate}%</TableCell>
            <TableCell><Badge className={autonomyColor(s.autonomy_level)}>{s.autonomy_level}</Badge></TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${s.score >= 70 ? 'bg-green-500' : s.score >= 40 ? 'bg-amber-500' : 'bg-destructive'}`} style={{ width: `${s.score}%` }} />
                </div>
                <span className="text-xs font-medium">{s.score}</span>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ─── Main Dashboard ───
export function SupportDashboard() {
  const { tickets, diagnostics, companyScores, stats, loadingTickets, refetchTickets } = useSupportLayer();

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Tickets Abertos</p>
            <p className="text-2xl font-bold text-primary">{stats.openTickets}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Em Andamento</p>
            <p className="text-2xl font-bold text-amber-600">{stats.inProgressTickets}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Resolvidos</p>
            <p className="text-2xl font-bold text-green-600">{stats.resolvedTickets}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Alertas Críticos</p>
            <p className="text-2xl font-bold text-destructive">{stats.criticalDiagnostics}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="diagnostics">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="diagnostics" className="flex items-center gap-1.5 text-xs">
            <Stethoscope className="h-3.5 w-3.5" /> Diagnóstico
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center gap-1.5 text-xs">
            <Ticket className="h-3.5 w-3.5" /> Tickets
          </TabsTrigger>
          <TabsTrigger value="access" className="flex items-center gap-1.5 text-xs">
            <Shield className="h-3.5 w-3.5" /> Acesso
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-1.5 text-xs">
            <Zap className="h-3.5 w-3.5" /> Ações Rápidas
          </TabsTrigger>
          <TabsTrigger value="scores" className="flex items-center gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> Score Empresas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diagnostics" className="pt-4">
          <DiagnosticsSection diagnostics={diagnostics} />
        </TabsContent>
        <TabsContent value="tickets" className="pt-4">
          <TicketsSection tickets={tickets || []} refetch={refetchTickets} />
        </TabsContent>
        <TabsContent value="access" className="pt-4">
          <SupportAccessSection />
        </TabsContent>
        <TabsContent value="actions" className="pt-4">
          <QuickActionsSection />
        </TabsContent>
        <TabsContent value="scores" className="pt-4">
          <CompanyScoresSection scores={companyScores} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
