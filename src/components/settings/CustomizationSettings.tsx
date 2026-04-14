import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useTenantCustomization } from '@/hooks/useTenantCustomization';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Palette, Type, LayoutGrid, Rocket, BarChart3, GitBranch,
  Save, RotateCcw, Camera, Clock, Sparkles
} from 'lucide-react';

export function CustomizationSettings() {
  const {
    customization, upsert, saveSnapshot, snapshots, restoreSnapshot,
    applySegmentTemplate, DEFAULT_MODULE_NAMES, DEFAULT_KPI_OPTIONS, SEGMENT_TEMPLATES,
  } = useTenantCustomization();

  const [moduleAliases, setModuleAliases] = useState<Record<string, string>>(
    customization?.module_aliases || {}
  );
  const [dreAliases, setDreAliases] = useState<Record<string, string>>(
    customization?.dre_aliases || {}
  );
  const [sidebarHidden, setSidebarHidden] = useState<string[]>(
    customization?.sidebar_config?.hidden || []
  );
  const [kpiPriorities, setKpiPriorities] = useState<string[]>(
    customization?.kpi_priorities || []
  );
  const [segment, setSegment] = useState(customization?.segment || '');
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [showSnapshotDialog, setShowSnapshotDialog] = useState(false);

  const DRE_CATEGORIES = [
    'Despesas Operacionais', 'Custos Variáveis', 'Resultado Econômico',
    'Receita Líquida', 'Margem de Contribuição', 'EBITDA',
    'Resultado Financeiro', 'Capital e Financiamentos',
  ];

  const handleSaveModules = () => {
    upsert.mutate({ module_aliases: moduleAliases } as any);
  };

  const handleSaveDre = () => {
    upsert.mutate({ dre_aliases: dreAliases } as any);
  };

  const handleSaveSidebar = () => {
    upsert.mutate({
      sidebar_config: { order: [], hidden: sidebarHidden },
    } as any);
  };

  const handleSaveKpis = () => {
    upsert.mutate({ kpi_priorities: kpiPriorities } as any);
  };

  const handleApplyTemplate = () => {
    if (!segment) return;
    applySegmentTemplate(segment);
  };

  const handleSaveSnapshot = () => {
    if (!snapshotLabel.trim()) return;
    saveSnapshot.mutate(snapshotLabel);
    setShowSnapshotDialog(false);
    setSnapshotLabel('');
  };

  const toggleKpi = (key: string) => {
    setKpiPriorities(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleSidebarModule = (key: string) => {
    setSidebarHidden(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Personalização da Empresa
          </h2>
          <p className="text-sm text-muted-foreground">
            Adapte o sistema à realidade da sua empresa sem alterar a estrutura financeira
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSnapshotDialog(true)}>
            <Camera className="h-4 w-4 mr-1" /> Salvar Snapshot
          </Button>
        </div>
      </div>

      <Tabs defaultValue="modules">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="modules" className="text-xs gap-1.5">
            <Type className="h-3.5 w-3.5" /> Módulos
          </TabsTrigger>
          <TabsTrigger value="dre" className="text-xs gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> DRE
          </TabsTrigger>
          <TabsTrigger value="sidebar" className="text-xs gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5" /> Sidebar
          </TabsTrigger>
          <TabsTrigger value="kpis" className="text-xs gap-1.5">
            <Rocket className="h-3.5 w-3.5" /> KPIs
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Templates
          </TabsTrigger>
        </TabsList>

        {/* Módulos */}
        <TabsContent value="modules" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Renomear Módulos</CardTitle>
              <CardDescription>Altere os nomes visuais dos módulos sem afetar a estrutura</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(DEFAULT_MODULE_NAMES).map(([key, defaultName]) => (
                <div key={key} className="grid grid-cols-2 gap-3 items-center">
                  <Label className="text-sm text-muted-foreground">{defaultName}</Label>
                  <Input
                    placeholder={defaultName}
                    value={moduleAliases[key] || ''}
                    onChange={e => setModuleAliases(prev => ({ ...prev, [key]: e.target.value }))}
                    className="h-9"
                  />
                </div>
              ))}
              <Button size="sm" onClick={handleSaveModules} disabled={upsert.isPending}>
                <Save className="h-4 w-4 mr-1" /> Salvar Nomes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DRE Aliases */}
        <TabsContent value="dre" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aliases Visuais DRE</CardTitle>
              <CardDescription>Defina nomes alternativos para categorias da DRE (sem alterar cálculos)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {DRE_CATEGORIES.map(cat => (
                <div key={cat} className="grid grid-cols-2 gap-3 items-center">
                  <Label className="text-sm text-muted-foreground">{cat}</Label>
                  <Input
                    placeholder={cat}
                    value={dreAliases[cat] || ''}
                    onChange={e => setDreAliases(prev => ({ ...prev, [cat]: e.target.value }))}
                    className="h-9"
                  />
                </div>
              ))}
              <Button size="sm" onClick={handleSaveDre} disabled={upsert.isPending}>
                <Save className="h-4 w-4 mr-1" /> Salvar Aliases
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sidebar */}
        <TabsContent value="sidebar" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personalizar Sidebar</CardTitle>
              <CardDescription>Mostre ou oculte módulos na navegação lateral</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(DEFAULT_MODULE_NAMES).map(([key, name]) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm">{moduleAliases[key] || name}</span>
                  <Switch
                    checked={!sidebarHidden.includes(key)}
                    onCheckedChange={() => toggleSidebarModule(key)}
                  />
                </div>
              ))}
              <Button size="sm" onClick={handleSaveSidebar} disabled={upsert.isPending}>
                <Save className="h-4 w-4 mr-1" /> Salvar Sidebar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KPIs */}
        <TabsContent value="kpis" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">KPIs Prioritários</CardTitle>
              <CardDescription>Selecione os indicadores que serão destacados no launcher</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {DEFAULT_KPI_OPTIONS.map(kpi => (
                <div key={kpi.key} className="flex items-center gap-3 py-2">
                  <Checkbox
                    checked={kpiPriorities.includes(kpi.key)}
                    onCheckedChange={() => toggleKpi(kpi.key)}
                  />
                  <span className="text-sm">{kpi.label}</span>
                  {kpiPriorities.includes(kpi.key) && (
                    <Badge variant="secondary" className="text-[10px] ml-auto">
                      #{kpiPriorities.indexOf(kpi.key) + 1}
                    </Badge>
                  )}
                </div>
              ))}
              <Button size="sm" onClick={handleSaveKpis} disabled={upsert.isPending}>
                <Save className="h-4 w-4 mr-1" /> Salvar KPIs
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates & Snapshots */}
        <TabsContent value="templates" className="pt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template por Segmento</CardTitle>
              <CardDescription>Aplique uma configuração otimizada para seu tipo de empresa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <Label>Segmento</Label>
                  <Select value={segment} onValueChange={setSegment}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comercio">Comércio</SelectItem>
                      <SelectItem value="servico">Serviço</SelectItem>
                      <SelectItem value="industria">Indústria</SelectItem>
                      <SelectItem value="arquitetura">Arquitetura</SelectItem>
                      <SelectItem value="moveis_planejados">Móveis Planejados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleApplyTemplate} disabled={!segment || upsert.isPending}>
                  <Sparkles className="h-4 w-4 mr-1" /> Aplicar Template
                </Button>
              </div>
              {segment && SEGMENT_TEMPLATES[segment] && (
                <div className="p-3 rounded-lg bg-muted/50 text-xs">
                  <p className="font-medium mb-1">O template aplicará:</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>• KPIs: {(SEGMENT_TEMPLATES[segment].kpi_priorities as string[])?.join(', ')}</li>
                    <li>• Sidebar otimizada para {segment.replace('_', ' ')}</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" /> Snapshots de Configuração
              </CardTitle>
              <CardDescription>Versões anteriores da personalização</CardDescription>
            </CardHeader>
            <CardContent>
              {!snapshots?.length ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum snapshot salvo</p>
              ) : (
                <div className="space-y-2">
                  {snapshots.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div>
                        <p className="text-sm font-medium">{s.label || 'Sem label'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(s.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => restoreSnapshot.mutate(s.id)}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restaurar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showSnapshotDialog} onOpenChange={setShowSnapshotDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Snapshot</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Nome do snapshot</Label>
            <Input
              value={snapshotLabel}
              onChange={e => setSnapshotLabel(e.target.value)}
              placeholder="Ex: Configuração antes da mudança..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSnapshotDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveSnapshot} disabled={!snapshotLabel.trim()}>
              <Camera className="h-4 w-4 mr-1" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
