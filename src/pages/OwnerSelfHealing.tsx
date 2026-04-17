import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Activity, AlertTriangle, CheckCircle2, Ban, ArrowUpCircle } from 'lucide-react';
import {
  useSelfHealingOverview, useSelfHealingPolicies, useSelfHealingGuardrailLogs,
  useSelfHealingEscalations, useSelfHealingStability, useUpdatePolicy, useResolveEscalation,
} from '@/hooks/useSelfHealing';
import { format } from 'date-fns';

const SAFETY_COLORS: Record<string, string> = {
  safe_auto: 'bg-green-500/10 text-green-700 border-green-500/30',
  semi_auto: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  manual_only: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  critical_manual: 'bg-red-500/10 text-red-700 border-red-500/30',
};

const DECISION_ICON: Record<string, JSX.Element> = {
  allow: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  block: <Ban className="h-4 w-4 text-amber-600" />,
  escalate: <ArrowUpCircle className="h-4 w-4 text-red-600" />,
};

export default function OwnerSelfHealing() {
  const { data: overview } = useSelfHealingOverview();
  const { data: policies = [] } = useSelfHealingPolicies();
  const { data: logs = [] } = useSelfHealingGuardrailLogs();
  const { data: escalations = [] } = useSelfHealingEscalations('open');
  const { data: stability = [] } = useSelfHealingStability();
  const updatePolicy = useUpdatePolicy();
  const resolveEsc = useResolveEscalation();

  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const modules = Array.from(new Set(policies.map((p: any) => p.module_code).filter(Boolean)));
  const filteredPolicies = moduleFilter === 'all'
    ? policies : policies.filter((p: any) => p.module_code === moduleFilter);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Self-Healing Policies</h1>
          <p className="text-muted-foreground">
            Controle de execução automática segura, retry budgets, escalonamentos e estabilidade pós-recovery.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Políticas ativas" value={overview?.policies_total ?? 0} sub={`${overview?.policies_safe_auto ?? 0} auto · ${overview?.policies_manual ?? 0} manual`} />
        <Kpi label="Avaliações 24h" value={overview?.evaluations_24h ?? 0}
          sub={`${overview?.allowed_24h ?? 0} ok · ${overview?.blocked_24h ?? 0} bloq · ${overview?.escalated_24h ?? 0} esc`} />
        <Kpi label="Escalonamentos abertos" value={overview?.open_escalations ?? 0} icon={<AlertTriangle className="h-4 w-4 text-red-600" />} />
        <Kpi label="Estabilidade pass rate" value={`${overview?.stability_pass_rate ?? 0}%`} sub={`${overview?.stability_checks_24h ?? 0} checks 24h`} />
      </div>

      <Tabs defaultValue="policies">
        <TabsList>
          <TabsTrigger value="policies">Políticas</TabsTrigger>
          <TabsTrigger value="logs">Guardrail Logs</TabsTrigger>
          <TabsTrigger value="escalations">Escalonamentos {escalations.length > 0 && <Badge variant="destructive" className="ml-2">{escalations.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="stability">Estabilidade</TabsTrigger>
        </TabsList>

        {/* POLICIES */}
        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Registro de Políticas</CardTitle>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os módulos</SelectItem>
                  {modules.map((m: any) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Safety</TableHead>
                    <TableHead>Max Tent.</TableHead>
                    <TableHead>Cooldown (s)</TableHead>
                    <TableHead>Min Conf.</TableHead>
                    <TableHead>Max Depth</TableHead>
                    <TableHead>Ativa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPolicies.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.action_code}</TableCell>
                      <TableCell className="text-xs">{p.module_code || '—'}</TableCell>
                      <TableCell>
                        <Select
                          value={p.safety_level}
                          onValueChange={(v) => updatePolicy.mutate({ id: p.id, patch: { safety_level: v } })}
                        >
                          <SelectTrigger className={`w-36 h-8 ${SAFETY_COLORS[p.safety_level]}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="safe_auto">safe_auto</SelectItem>
                            <SelectItem value="semi_auto">semi_auto</SelectItem>
                            <SelectItem value="manual_only">manual_only</SelectItem>
                            <SelectItem value="critical_manual">critical_manual</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input type="number" defaultValue={p.max_auto_attempts} className="w-20 h-8"
                          onBlur={(e) => {
                            const v = parseInt(e.target.value);
                            if (v !== p.max_auto_attempts) updatePolicy.mutate({ id: p.id, patch: { max_auto_attempts: v } });
                          }} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" defaultValue={p.cooldown_seconds} className="w-24 h-8"
                          onBlur={(e) => {
                            const v = parseInt(e.target.value);
                            if (v !== p.cooldown_seconds) updatePolicy.mutate({ id: p.id, patch: { cooldown_seconds: v } });
                          }} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" step="0.05" defaultValue={p.requires_root_cause_confidence} className="w-20 h-8"
                          onBlur={(e) => {
                            const v = parseFloat(e.target.value);
                            if (v !== p.requires_root_cause_confidence) updatePolicy.mutate({ id: p.id, patch: { requires_root_cause_confidence: v } });
                          }} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" defaultValue={p.max_dependency_depth} className="w-16 h-8"
                          onBlur={(e) => {
                            const v = parseInt(e.target.value);
                            if (v !== p.max_dependency_depth) updatePolicy.mutate({ id: p.id, patch: { max_dependency_depth: v } });
                          }} />
                      </TableCell>
                      <TableCell>
                        <Switch checked={p.active}
                          onCheckedChange={(v) => updatePolicy.mutate({ id: p.id, patch: { active: v } })} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOGS */}
        <TabsContent value="logs">
          <Card>
            <CardHeader><CardTitle>Decisões dos Guardrails</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Decisão</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Severidade</TableHead>
                    <TableHead>Conf.</TableHead>
                    <TableHead>Depth</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{format(new Date(l.evaluated_at), 'dd/MM HH:mm:ss')}</TableCell>
                      <TableCell className="flex items-center gap-2">{DECISION_ICON[l.decision]} {l.decision}</TableCell>
                      <TableCell className="font-mono text-xs">{l.action_code}</TableCell>
                      <TableCell className="text-xs">{l.module_code || '—'}</TableCell>
                      <TableCell><Badge variant="outline">{l.severity}</Badge></TableCell>
                      <TableCell className="text-xs">{l.root_cause_confidence ?? '—'}</TableCell>
                      <TableCell className="text-xs">{l.dependency_depth ?? 0}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{l.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ESCALATIONS */}
        <TabsContent value="escalations">
          <Card>
            <CardHeader><CardTitle>Escalonamentos abertos</CardTitle></CardHeader>
            <CardContent>
              {escalations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Nenhum escalonamento aberto.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quando</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Módulo</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Severidade</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {escalations.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs">{format(new Date(e.created_at), 'dd/MM HH:mm')}</TableCell>
                        <TableCell className="font-mono text-xs">{e.action_code || '—'}</TableCell>
                        <TableCell className="text-xs">{e.module_code || '—'}</TableCell>
                        <TableCell className="text-xs">{e.trigger_reason}</TableCell>
                        <TableCell><Badge variant="destructive">{e.severity}</Badge></TableCell>
                        <TableCell className="space-x-2">
                          <Button size="sm" variant="outline" onClick={() => resolveEsc.mutate({ id: e.id, status: 'acknowledged' })}>Ack</Button>
                          <Button size="sm" variant="outline" onClick={() => resolveEsc.mutate({ id: e.id, status: 'resolved' })}>Resolver</Button>
                          <Button size="sm" variant="ghost" onClick={() => resolveEsc.mutate({ id: e.id, status: 'dismissed' })}>Descartar</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* STABILITY */}
        <TabsContent value="stability">
          <Card>
            <CardHeader><CardTitle>Verificações de estabilidade</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Saúde</TableHead>
                    <TableHead>Dependências</TableHead>
                    <TableHead>Snapshot</TableHead>
                    <TableHead>Timeline</TableHead>
                    <TableHead>Resultado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stability.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{format(new Date(s.checked_at), 'dd/MM HH:mm')}</TableCell>
                      <TableCell className="text-xs">{s.module_code || '—'}</TableCell>
                      <TableCell>{s.integration_health_ok ? '✓' : '✗'}</TableCell>
                      <TableCell>{s.dependency_stable ? '✓' : '✗'}</TableCell>
                      <TableCell>{s.snapshot_fresh ? '✓' : '✗'}</TableCell>
                      <TableCell>{s.timeline_clean ? '✓' : '✗'}</TableCell>
                      <TableCell>
                        {s.overall_stable
                          ? <Badge className="bg-green-500/10 text-green-700 border-green-500/30">Estável</Badge>
                          : <Badge variant="destructive">Instável</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ label, value, sub, icon }: { label: string; value: any; sub?: string; icon?: JSX.Element }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          {icon ?? <Activity className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="text-2xl font-bold mt-2">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
