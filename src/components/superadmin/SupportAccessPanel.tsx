import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Shield, Clock, LogIn, LogOut, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SupportAccessPanel() {
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
      const durationMinutes = parseInt(duration);
      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
      
      const { error } = await supabase.from('support_access_sessions' as any).insert({
        owner_user_id: user.id,
        tenant_id: selectedTenant,
        reason,
        expires_at: expiresAt,
        status: 'active',
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

  const statusBadge = (status: string, expiresAt: string) => {
    const isExpired = status === 'active' && new Date(expiresAt) <= new Date();
    if (isExpired || status === 'expired') return <Badge variant="secondary">Expirada</Badge>;
    if (status === 'active') return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Ativa</Badge>;
    if (status === 'ended') return <Badge variant="outline">Encerrada</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {activeSessions.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Sessões Ativas ({activeSessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeSessions.map(session => (
                <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-500/20 bg-background">
                  <div>
                    <p className="font-medium">{(session as any).tenant?.name}</p>
                    <p className="text-sm text-muted-foreground">{session.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      Expira {formatDistanceToNow(new Date(session.expires_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => endSession.mutate(session.id)}>
                    <LogOut className="h-4 w-4 mr-1" /> Encerrar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Acesso de Suporte
              </CardTitle>
              <CardDescription>Sessões de acesso temporário aos dados de empresas clientes</CardDescription>
            </div>
            <Button onClick={() => setShowDialog(true)}>
              <LogIn className="h-4 w-4 mr-2" /> Iniciar Sessão
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
                <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell></TableRow>
              ) : !sessions?.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma sessão registrada</TableCell></TableRow>
              ) : sessions.map(session => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{(session as any).tenant?.name || '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{session.reason}</TableCell>
                  <TableCell>{format(new Date(session.started_at), 'dd/MM/yy HH:mm', { locale: ptBR })}</TableCell>
                  <TableCell>{format(new Date(session.expires_at), 'dd/MM/yy HH:mm', { locale: ptBR })}</TableCell>
                  <TableCell>{statusBadge(session.status, session.expires_at)}</TableCell>
                  <TableCell>
                    {session.status === 'active' && new Date(session.expires_at) > new Date() && (
                      <Button variant="ghost" size="sm" onClick={() => endSession.mutate(session.id)}>
                        Encerrar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> Nova Sessão de Suporte
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Empresa</Label>
              <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                <SelectContent>
                  {tenants?.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
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
                  <SelectItem value="15">15 minutos</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
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
              <Clock className="h-4 w-4 mr-2" /> Iniciar Sessão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
