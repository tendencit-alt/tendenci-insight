import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Target, AlertTriangle, RefreshCw, ExternalLink, ShieldAlert, Network,
} from "lucide-react";
import { useExecutionPriority, type PriorityLevel } from "@/hooks/useExecutionPriority";
import { useArchitectureBoard } from "@/hooks/useArchitectureBoard";

const LEVEL_BADGE: Record<PriorityLevel, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  medium: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

const LEVEL_ORDER: Record<PriorityLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const KPI = ({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "warn" | "ok" | "bad" }) => {
  const toneCls =
    tone === "ok" ? "text-emerald-600" :
    tone === "warn" ? "text-amber-600" :
    tone === "bad" ? "text-destructive" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`mt-1 text-2xl font-semibold ${toneCls}`}>{value}</div>
      </CardContent>
    </Card>
  );
};

export default function OwnerExecutionPriority() {
  const { rows, summary, isLoading, recompute } = useExecutionPriority();
  const { layers, status, sources, deps } = useArchitectureBoard();

  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const layerByCode = useMemo(() => {
    const m = new Map<string, typeof layers[number]>();
    layers.forEach((l) => m.set(l.code, l));
    return m;
  }, [layers]);

  const statusByCode = useMemo(() => {
    const m = new Map<string, typeof status[number]>();
    status.forEach((s) => m.set(s.layer_code, s));
    return m;
  }, [status]);

  const groups = useMemo(() => Array.from(new Set(layers.map((l) => l.group))).sort(), [layers]);

  const enriched = useMemo(() => {
    return rows
      .map((r) => ({ ...r, layer: layerByCode.get(r.layer_code), status: statusByCode.get(r.layer_code) }))
      .sort((a, b) => {
        const lvl = LEVEL_ORDER[a.priority_level] - LEVEL_ORDER[b.priority_level];
        return lvl !== 0 ? lvl : b.execution_priority_index - a.execution_priority_index;
      });
  }, [rows, layerByCode, statusByCode]);

  const filtered = useMemo(() => {
    return enriched.filter((r) => {
      if (filterLevel !== "all" && r.priority_level !== filterLevel) return false;
      if (filterGroup !== "all" && r.layer?.group !== filterGroup) return false;
      if (search && !`${r.layer?.name ?? ""} ${r.layer_code}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [enriched, filterLevel, filterGroup, search]);

  const selectedRow = enriched.find((r) => r.layer_code === selected);
  const selectedSources = sources.filter((s) => s.layer_code === selected);
  const selectedDepsOut = deps.filter((d) => d.layer_code === selected);
  const selectedDepsIn = deps.filter((d) => d.depends_on_layer_code === selected);

  const criticalCount = summary?.critical ?? 0;
  const blockingHubs = summary?.blocking_hubs ?? 0;

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Execution Priority Board</h1>
            <p className="text-sm text-muted-foreground">
              Fila inteligente de execução técnica baseada em impacto arquitetural real.
            </p>
          </div>
        </div>
        <Button onClick={() => recompute.mutate()} disabled={recompute.isPending} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${recompute.isPending ? "animate-spin" : ""}`} />
          Recalcular
        </Button>
      </div>

      {/* Alertas */}
      {criticalCount > 0 && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Critical architecture action required</AlertTitle>
          <AlertDescription>
            {criticalCount} módulo(s) em estado crítico exigem intervenção imediata.
          </AlertDescription>
        </Alert>
      )}
      {blockingHubs > 0 && (
        <Alert>
          <Network className="h-4 w-4" />
          <AlertTitle>Dependency backbone incomplete</AlertTitle>
          <AlertDescription>
            {blockingHubs} hub(s) de dependência estão incompletos — risco em cascata.
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KPI label="Críticos" value={summary?.critical ?? "—"} tone={criticalCount ? "bad" : "ok"} />
        <KPI label="Hubs bloqueantes" value={summary?.blocking_hubs ?? "—"} tone={blockingHubs ? "warn" : "ok"} />
        <KPI label="Incompletos" value={summary?.incomplete ?? "—"} tone={(summary?.incomplete ?? 0) ? "warn" : "ok"} />
        <KPI label="Sem integração" value={summary?.no_integration ?? "—"} tone={(summary?.no_integration ?? 0) ? "warn" : "ok"} />
        <KPI label="Invisíveis no menu" value={summary?.invisible_menu ?? "—"} tone={(summary?.invisible_menu ?? 0) ? "warn" : "ok"} />
        <KPI label="Sem rota" value={summary?.no_route ?? "—"} tone={(summary?.no_route ?? 0) ? "bad" : "ok"} />
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <Input placeholder="Buscar camada..." value={search} onChange={(e) => setSearch(e.target.value)} className="md:max-w-xs" />
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="md:w-44"><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as prioridades</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="md:w-44"><SelectValue placeholder="Grupo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os grupos</SelectItem>
              {groups.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground md:ml-auto">
            {filtered.length} de {rows.length} camadas
          </div>
        </CardContent>
      </Card>

      {/* Tabela ordenada por prioridade */}
      <Card>
        <CardHeader>
          <CardTitle>Fila de execução</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Camada</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead className="w-40">Índice</TableHead>
                <TableHead className="text-center">Deps</TableHead>
                <TableHead className="text-center">Impacta</TableHead>
                <TableHead className="text-center">Incidentes</TableHead>
                <TableHead>Razão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum resultado</TableCell></TableRow>
              )}
              {filtered.map((r) => (
                <TableRow key={r.layer_code} className="cursor-pointer" onClick={() => setSelected(r.layer_code)}>
                  <TableCell>
                    <div className="font-medium">{r.layer?.name ?? r.layer_code}</div>
                    <div className="text-xs text-muted-foreground">{r.layer_code} · {r.layer?.group}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={LEVEL_BADGE[r.priority_level]}>
                      {r.priority_level}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Number(r.execution_priority_index)} className="h-2 w-24" />
                      <span className="text-xs tabular-nums">{Number(r.execution_priority_index).toFixed(0)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs tabular-nums">{r.dependency_count}</TableCell>
                  <TableCell className="text-center text-xs tabular-nums">{r.impacted_count}</TableCell>
                  <TableCell className="text-center text-xs tabular-nums">
                    {r.incident_count > 0 ? (
                      <Badge variant="destructive">{r.incident_count}</Badge>
                    ) : <span className="text-muted-foreground">0</span>}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{r.priority_reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Painel lateral */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selectedRow && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selectedRow.layer?.name}
                  <Badge variant="outline" className={LEVEL_BADGE[selectedRow.priority_level]}>
                    {selectedRow.priority_level}
                  </Badge>
                </SheetTitle>
                <SheetDescription>{selectedRow.priority_reason}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <section>
                  <h3 className="mb-3 text-sm font-semibold">Score breakdown</h3>
                  <div className="space-y-2">
                    {[
                      { label: "Impacto (×0.30)", value: selectedRow.impact_score },
                      { label: "Dependência (×0.25)", value: selectedRow.dependency_score },
                      { label: "Incidentes (×0.20)", value: selectedRow.incident_score },
                      { label: "Integração (×0.15)", value: selectedRow.integration_score },
                      { label: "Conclusão (×0.10)", value: selectedRow.completion_score },
                      { label: "Visibilidade (informativo)", value: selectedRow.visibility_score },
                    ].map((s) => (
                      <div key={s.label}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{s.label}</span>
                          <span className="tabular-nums">{Number(s.value).toFixed(0)}</span>
                        </div>
                        <Progress value={Number(s.value)} className="h-1.5" />
                      </div>
                    ))}
                    <div className="mt-3 flex items-center justify-between border-t pt-3">
                      <span className="text-sm font-semibold">Índice final</span>
                      <span className="text-lg font-bold tabular-nums">{Number(selectedRow.execution_priority_index).toFixed(1)}</span>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="mb-2 text-sm font-semibold">Rota & menu</h3>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Rota</span>
                      <span className="flex items-center gap-1">
                        <code>{selectedRow.status?.actual_route ?? "—"}</code>
                        {selectedRow.status?.actual_route && (
                          <a href={selectedRow.status.actual_route} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3 w-3 text-primary" />
                          </a>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">No sidebar</span>
                      <Badge variant={selectedRow.status?.sidebar_present ? "default" : "destructive"}>
                        {selectedRow.status?.sidebar_present ? "Sim" : "Não"}
                      </Badge>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="mb-2 text-sm font-semibold">
                    Dependências saindo ({selectedDepsOut.length})
                  </h3>
                  {selectedDepsOut.length === 0 && <div className="text-xs text-muted-foreground">Nenhuma.</div>}
                  {selectedDepsOut.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded border border-border/50 px-2 py-1 text-xs">
                      <span>→ <code>{d.depends_on_layer_code}</code> <span className="text-muted-foreground">({d.dependency_type})</span></span>
                      {d.is_critical && <Badge variant="destructive">crítica</Badge>}
                    </div>
                  ))}
                </section>

                <section>
                  <h3 className="mb-2 text-sm font-semibold">
                    Impactaria se quebrar ({selectedDepsIn.length})
                  </h3>
                  {selectedDepsIn.length === 0 && <div className="text-xs text-muted-foreground">Nenhuma camada depende desta.</div>}
                  {selectedDepsIn.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded border border-border/50 px-2 py-1 text-xs">
                      <span><code>{d.layer_code}</code> ← <span className="text-muted-foreground">({d.dependency_type})</span></span>
                      {d.is_critical && <Badge variant="destructive">crítica</Badge>}
                    </div>
                  ))}
                </section>

                <section>
                  <h3 className="mb-2 text-sm font-semibold">Fontes de dados ({selectedSources.length})</h3>
                  {selectedSources.length === 0 && <div className="text-xs text-muted-foreground">Sem fontes mapeadas.</div>}
                  {selectedSources.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded border border-border/50 px-2 py-1 text-xs">
                      <code>{s.source_name}</code>
                      <Badge variant={s.is_connected ? "default" : "destructive"}>{s.is_connected ? "ok" : "ausente"}</Badge>
                    </div>
                  ))}
                </section>

                {selectedRow.incident_count > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{selectedRow.incident_count} incidente(s) ativo(s)</AlertTitle>
                    <AlertDescription>
                      Verifique a Incident Timeline para detalhes e recoveries disponíveis.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
