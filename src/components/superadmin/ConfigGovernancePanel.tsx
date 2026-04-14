import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Lock, Unlock, GitCompare, RotateCcw, Plus, FileText, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { useConfigGovernance, type DivergenceLevel } from '@/hooks/useConfigGovernance';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DIVERGENCE_COLORS: Record<DivergenceLevel, string> = {
  baixo: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  medio: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  alto: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  chart_of_accounts: 'Plano de Contas',
  dre_structure: 'Estrutura DRE',
  cost_centers: 'Centros de Custo',
  categories: 'Categorias',
  dashboards: 'Dashboards',
};

export function ConfigGovernancePanel() {
  const {
    templates, overrides, locks, divergenceLog,
    createTemplate, toggleLock, resetTenantOverrides,
    getDivergenceScore, getStructuralDiff,
  } = useConfigGovernance();

  const [newTemplate, setNewTemplate] = useState({ template_type: 'chart_of_accounts', name: '', description: '', snapshot: '{}' });

  // Fetch tenants for divergence view
  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants-governance'],
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('id, name').order('name');
      return data || [];
    },
  });

  const handleCreateTemplate = () => {
    try {
      const snapshot = JSON.parse(newTemplate.snapshot);
      createTemplate.mutate({
        template_type: newTemplate.template_type,
        name: newTemplate.name,
        description: newTemplate.description || undefined,
        snapshot,
      });
      setNewTemplate({ template_type: 'chart_of_accounts', name: '', description: '', snapshot: '{}' });
    } catch {
      // invalid JSON handled silently
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{templates.length}</p>
                <p className="text-sm text-muted-foreground">Templates Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ArrowRightLeft className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{overrides.length}</p>
                <p className="text-sm text-muted-foreground">Overrides Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Lock className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{locks.filter(l => l.is_locked).length}</p>
                <p className="text-sm text-muted-foreground">Módulos Bloqueados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">
                  {tenants.filter(t => getDivergenceScore(t.id).level === 'alto').length}
                </p>
                <p className="text-sm text-muted-foreground">Empresas Alta Divergência</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="locks" className="w-full">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="locks" className="gap-1.5"><Shield className="h-4 w-4" />Locks Estruturais</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5"><FileText className="h-4 w-4" />Templates Base</TabsTrigger>
          <TabsTrigger value="divergence" className="gap-1.5"><GitCompare className="h-4 w-4" />Divergência</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5"><AlertTriangle className="h-4 w-4" />Auditoria</TabsTrigger>
        </TabsList>

        {/* Locks */}
        <TabsContent value="locks" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bloqueios Estruturais por Módulo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {locks.map(lock => (
                  <div key={lock.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      {lock.is_locked ? <Lock className="h-5 w-5 text-red-500" /> : <Unlock className="h-5 w-5 text-green-500" />}
                      <div>
                        <p className="font-medium">{lock.display_name}</p>
                        <p className="text-sm text-muted-foreground">{lock.reason}</p>
                      </div>
                    </div>
                    <Switch
                      checked={lock.is_locked}
                      onCheckedChange={(checked) => toggleLock.mutate({ id: lock.id, locked: checked })}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5" /> Novo Template Base
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newTemplate.template_type}
                  onChange={e => setNewTemplate(p => ({ ...p, template_type: e.target.value }))}
                >
                  {Object.entries(TEMPLATE_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <Input
                  placeholder="Nome do template"
                  value={newTemplate.name}
                  onChange={e => setNewTemplate(p => ({ ...p, name: e.target.value }))}
                />
                <Input
                  placeholder="Descrição"
                  value={newTemplate.description}
                  onChange={e => setNewTemplate(p => ({ ...p, description: e.target.value }))}
                />
              </div>
              <Textarea
                placeholder='Snapshot JSON (ex: {"items": [...]})'
                value={newTemplate.snapshot}
                onChange={e => setNewTemplate(p => ({ ...p, snapshot: e.target.value }))}
                rows={4}
                className="font-mono text-xs"
              />
              <Button onClick={handleCreateTemplate} disabled={!newTemplate.name || createTemplate.isPending}>
                <Plus className="h-4 w-4 mr-2" /> Criar Template
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Templates Ativos</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Versão</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Criado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Badge variant="outline">{TEMPLATE_TYPE_LABELS[t.template_type] || t.template_type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell><Badge>v{t.version}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{t.description || '—'}</TableCell>
                      <TableCell className="text-sm">{format(new Date(t.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                    </TableRow>
                  ))}
                  {templates.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum template cadastrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Divergence */}
        <TabsContent value="divergence" className="space-y-4 pt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Score Divergência por Empresa</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Overrides</TableHead>
                    <TableHead>Divergência</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map(t => {
                    const score = getDivergenceScore(t.id);
                    const diff = getStructuralDiff(t.id);
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell>{score.count}</TableCell>
                        <TableCell>{score.pct}%</TableCell>
                        <TableCell>
                          <Badge className={DIVERGENCE_COLORS[score.level]}>
                            {score.level.charAt(0).toUpperCase() + score.level.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resetTenantOverrides.mutate(t.id)}
                            disabled={score.count === 0}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" /> Reset
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Diff visual for each tenant with overrides */}
          {tenants.filter(t => getDivergenceScore(t.id).count > 0).map(t => {
            const diff = getStructuralDiff(t.id);
            return (
              <Card key={t.id}>
                <CardHeader>
                  <CardTitle className="text-base">Diff Estrutural — {t.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Template</TableHead>
                        <TableHead>Original</TableHead>
                        <TableHead>Atual</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {diff.map((d, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{d.target_key}</TableCell>
                          <TableCell><Badge variant="secondary">{d.override_type}</Badge></TableCell>
                          <TableCell className="text-sm">{d.template}</TableCell>
                          <TableCell className="text-red-600 dark:text-red-400 text-sm line-through">{d.original || '—'}</TableCell>
                          <TableCell className="text-green-600 dark:text-green-400 text-sm font-medium">{d.current || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Audit */}
        <TabsContent value="audit" className="space-y-4 pt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Log Divergências Estruturais</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo Template</TableHead>
                    <TableHead>Divergência</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Original</TableHead>
                    <TableHead>Atual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {divergenceLog.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="text-sm">{format(new Date(d.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                      <TableCell><Badge variant="outline">{TEMPLATE_TYPE_LABELS[d.template_type] || d.template_type}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{d.divergence_type}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{d.target_key}</TableCell>
                      <TableCell className="text-sm text-red-600 dark:text-red-400">{d.original_value || '—'}</TableCell>
                      <TableCell className="text-sm text-green-600 dark:text-green-400">{d.current_value || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {divergenceLog.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma divergência registrada</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
