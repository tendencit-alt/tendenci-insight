import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Wrench, CheckCircle2, XCircle, Clock, Zap, ShieldAlert, History, Play,
} from 'lucide-react';
import {
  useRecoveryOverview, useRecoveryCatalog, useRecoveryLogs,
  usePendingAutoRecoveries, useDispatchRecovery,
} from '@/hooks/useRecoveryActions';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const typeLabel: Record<string, string> = {
  safe_auto_recovery: 'Auto seguro',
  assisted_recovery: 'Assistido',
  protected_recovery: 'Protegido',
};

const typeBadge = (t: string): any => t === 'safe_auto_recovery' ? 'secondary' : t === 'protected_recovery' ? 'destructive' : 'default';
const riskBadge = (r: string): any => r === 'high' ? 'destructive' : r === 'medium' ? 'default' : 'secondary';
const resultBadge = (r: string): any => r === 'success' ? 'secondary' : r === 'failed' ? 'destructive' : r === 'pending' ? 'outline' : 'secondary';

export default function OwnerRecoveryActions() {
  const overview = useRecoveryOverview();
  const catalog = useRecoveryCatalog();
  const logs = useRecoveryLogs(50);
  const pending = usePendingAutoRecoveries();
  const dispatch = useDispatchRecovery();

  const [confirmAction, setConfirmAction] = useState<any>(null);
  const [reason, setReason] = useState('');

  const ov = overview.data;

  const triggerRecovery = (action: any, mode: 'manual' | 'assisted' = 'manual') => {
    if (action.recovery_type === 'protected_recovery' || action.requires_owner_confirmation) {
      setConfirmAction({ ...action, _mode: mode });
      return;
    }
    dispatch.mutate({
      recovery_code: action.code,
      failure_code: 'manual_trigger',
      target_module: action.target_module,
      execution_mode: mode,
    });
  };

  const confirmDispatch = () => {
    if (!confirmAction) return;
    dispatch.mutate({
      recovery_code: confirmAction.code,
      failure_code: 'manual_trigger',
      target_module: confirmAction.target_module,
      execution_mode: confirmAction._mode || 'manual',
      reason,
    });
    setConfirmAction(null);
    setReason('');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wrench className="h-8 w-8 text-primary" />
            Recovery Actions
          </h1>
          <p className="text-muted-foreground mt-1">
            Motor de ações corretivas automáticas e assistidas para falhas sistêmicas.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Zap className="h-4 w-4" />Execuções 24h
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview.isLoading ? <Skeleton className="h-8 w-12" /> :
              <div className="text-3xl font-bold">{ov?.total_24h ?? 0}</div>}
            <p className="text-xs text-muted-foreground mt-1">
              {ov?.auto_24h ?? 0} auto · {ov?.manual_24h ?? 0} manual
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />Taxa de sucesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview.isLoading ? <Skeleton className="h-8 w-12" /> :
              <div className="text-3xl font-bold">{ov?.success_rate ?? 0}%</div>}
            <p className="text-xs text-muted-foreground mt-1">
              {ov?.success_24h ?? 0} ok · {ov?.failed_24h ?? 0} falhas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />Tempo médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview.isLoading ? <Skeleton className="h-8 w-12" /> :
              <div className="text-3xl font-bold">
                {ov?.avg_duration_ms ? `${(Number(ov.avg_duration_ms) / 1000).toFixed(1)}s` : '—'}
              </div>}
            <p className="text-xs text-muted-foreground mt-1">por execução bem-sucedida</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <History className="h-4 w-4" />Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview.isLoading ? <Skeleton className="h-8 w-12" /> :
              <div className="text-3xl font-bold">{ov?.pending ?? 0}</div>}
            <p className="text-xs text-muted-foreground mt-1">
              {pending.data?.length ?? 0} auto-recoveries elegíveis
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="catalog" className="w-full">
        <TabsList>
          <TabsTrigger value="catalog">Catálogo</TabsTrigger>
          <TabsTrigger value="pending">Pendentes ({pending.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="logs">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Catálogo de ações de recuperação</CardTitle>
            </CardHeader>
            <CardContent>
              {catalog.isLoading ? <Skeleton className="h-40" /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ação</TableHead>
                      <TableHead>Módulo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Risco</TableHead>
                      <TableHead>Auto?</TableHead>
                      <TableHead className="text-right">Executar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(catalog.data || []).map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div className="font-medium">{a.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{a.code}</div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{a.target_module}</TableCell>
                        <TableCell><Badge variant={typeBadge(a.recovery_type)}>{typeLabel[a.recovery_type]}</Badge></TableCell>
                        <TableCell><Badge variant={riskBadge(a.risk_level)}>{a.risk_level}</Badge></TableCell>
                        <TableCell>{a.is_safe_auto ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : '—'}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant={a.recovery_type === 'protected_recovery' ? 'destructive' : 'default'}
                            onClick={() => triggerRecovery(a)} disabled={dispatch.isPending}>
                            {a.recovery_type === 'protected_recovery' && <ShieldAlert className="h-3 w-3 mr-1" />}
                            <Play className="h-3 w-3 mr-1" />Executar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Auto-recoveries elegíveis (próxima janela do cron)</CardTitle>
            </CardHeader>
            <CardContent>
              {pending.isLoading ? <Skeleton className="h-32" /> : (pending.data || []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma falha elegível para auto-recovery agora.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Falha</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Módulo</TableHead>
                      <TableHead>Tentativas</TableHead>
                      <TableHead>Cooldown</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(pending.data || []).map((p: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell><Badge variant="destructive">{p.failure_code}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{p.recovery_code}</TableCell>
                        <TableCell className="font-mono text-xs">{p.target_module}</TableCell>
                        <TableCell>{p.attempts_so_far} / {p.max_attempts}</TableCell>
                        <TableCell>{p.cooldown_minutes}min</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de execuções (auditoria)</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.isLoading ? <Skeleton className="h-40" /> : (logs.data || []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Sem execuções registradas.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quando</TableHead>
                      <TableHead>Falha</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Modo</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>Tentativa</TableHead>
                      <TableHead>Duração</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(logs.data || []).map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(l.started_at), { locale: ptBR, addSuffix: true })}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{l.failure_code}</TableCell>
                        <TableCell className="font-mono text-xs">{l.recovery_code}</TableCell>
                        <TableCell><Badge variant="outline">{l.execution_mode}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={resultBadge(l.result)}>
                            {l.result === 'success' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {l.result === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                            {l.result}
                          </Badge>
                        </TableCell>
                        <TableCell>#{l.attempt_number}</TableCell>
                        <TableCell className="text-xs">{l.duration_ms ? `${l.duration_ms}ms` : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmação para protected/assisted */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirmAction?.recovery_type === 'protected_recovery' && <ShieldAlert className="h-5 w-5 text-destructive" />}
              Confirmar execução
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a executar <strong>{confirmAction?.name}</strong> sobre o módulo <code className="bg-muted px-1 rounded">{confirmAction?.target_module}</code>.
              {confirmAction?.recovery_type === 'protected_recovery' && (
                <span className="block mt-2 text-destructive font-medium">
                  Esta é uma ação PROTEGIDA com risco {confirmAction?.risk_level}. Informe o motivo abaixo.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmAction?.recovery_type === 'protected_recovery' && (
            <Textarea
              placeholder="Descreva o motivo da execução (obrigatório)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDispatch}
              disabled={confirmAction?.recovery_type === 'protected_recovery' && reason.trim().length < 10}
            >
              Confirmar e executar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
