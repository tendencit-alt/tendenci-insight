import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useArchitectureBoard, type StatusColor } from "@/hooks/useArchitectureBoard";
import { LayoutGrid, ExternalLink } from "lucide-react";

const dotClass: Record<StatusColor, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-destructive",
  gray: "bg-muted-foreground/40",
};

function StatusDot({ value, label }: { value: StatusColor; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass[value]}`} />
      {label ? <span className="text-xs text-muted-foreground">{label}</span> : null}
    </div>
  );
}

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

export default function OwnerArchitectureBoard() {
  const { layers, status, sources, deps, summary, isLoading } = useArchitectureBoard();
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [filterHealth, setFilterHealth] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const statusByCode = useMemo(() => {
    const m = new Map<string, typeof status[number]>();
    status.forEach((s) => m.set(s.layer_code, s));
    return m;
  }, [status]);

  const groups = useMemo(() => Array.from(new Set(layers.map((l) => l.group))).sort(), [layers]);

  const filtered = useMemo(() => {
    return layers.filter((l) => {
      if (filterGroup !== "all" && l.group !== filterGroup) return false;
      const s = statusByCode.get(l.code);
      if (filterHealth !== "all" && s?.health_status !== filterHealth) return false;
      if (search && !`${l.name} ${l.code}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [layers, filterGroup, filterHealth, search, statusByCode]);

  const selectedLayer = layers.find((l) => l.code === selected);
  const selectedStatus = selected ? statusByCode.get(selected) : undefined;
  const selectedSources = sources.filter((s) => s.layer_code === selected);
  const selectedDeps = deps.filter((d) => d.layer_code === selected);

  return (
    <div className="container mx-auto space-y-6 p-6">
        <div className="flex items-center gap-3">
          <LayoutGrid className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Architecture Master Board</h1>
            <p className="text-sm text-muted-foreground">
              Quadro mestre vivo da arquitetura do ERP Tendenci.
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          <KPI label="Total de camadas" value={summary?.total_layers ?? "—"} />
          <KPI label="100% ativas" value={summary?.fully_active ?? "—"} tone="ok" />
          <KPI label="Parciais" value={summary?.partial ?? "—"} tone="warn" />
          <KPI label="Sem menu" value={summary?.missing_menu ?? "—"} tone={summary?.missing_menu ? "warn" : "default"} />
          <KPI label="Sem rota" value={summary?.missing_route ?? "—"} tone={summary?.missing_route ? "bad" : "default"} />
          <KPI label="Sem UI" value={summary?.missing_ui ?? "—"} tone={summary?.missing_ui ? "bad" : "default"} />
          <KPI label="Sem backend" value={summary?.missing_backend ?? "—"} tone={summary?.missing_backend ? "bad" : "default"} />
          <KPI label="Sem dados" value={summary?.missing_data ?? "—"} tone={summary?.missing_data ? "warn" : "default"} />
          <KPI label="Integração incompleta" value={summary?.incomplete_integration ?? "—"} tone="warn" />
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
            <Input
              placeholder="Buscar camada..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="md:max-w-xs"
            />
            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger className="md:w-48"><SelectValue placeholder="Grupo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os grupos</SelectItem>
                {groups.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterHealth} onValueChange={setFilterHealth}>
              <SelectTrigger className="md:w-40"><SelectValue placeholder="Health" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="green">Verde</SelectItem>
                <SelectItem value="yellow">Amarelo</SelectItem>
                <SelectItem value="red">Vermelho</SelectItem>
                <SelectItem value="gray">Cinza</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground md:ml-auto">
              {filtered.length} de {layers.length} camadas
            </div>
          </CardContent>
        </Card>

        {/* Matriz */}
        <Card>
          <CardHeader>
            <CardTitle>Matriz de status estrutural</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Camada</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead className="text-center">UI</TableHead>
                  <TableHead className="text-center">Backend</TableHead>
                  <TableHead className="text-center">Rota</TableHead>
                  <TableHead className="text-center">Menu</TableHead>
                  <TableHead className="text-center">Dados</TableHead>
                  <TableHead className="text-center">Integração</TableHead>
                  <TableHead className="text-center">Health</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>
                )}
                {!isLoading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Nenhuma camada encontrada</TableCell></TableRow>
                )}
                {filtered.map((l) => {
                  const s = statusByCode.get(l.code);
                  return (
                    <TableRow
                      key={l.code}
                      className="cursor-pointer"
                      onClick={() => setSelected(l.code)}
                    >
                      <TableCell>
                        <div className="font-medium">{l.name}</div>
                        <div className="text-xs text-muted-foreground">{l.code}</div>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{l.group}</Badge></TableCell>
                      <TableCell className="text-center"><div className="flex justify-center"><StatusDot value={s?.ui_exists ?? "gray"} /></div></TableCell>
                      <TableCell className="text-center"><div className="flex justify-center"><StatusDot value={s?.backend_exists ?? "gray"} /></div></TableCell>
                      <TableCell className="text-center"><div className="flex justify-center"><StatusDot value={s?.route_exists ?? "gray"} /></div></TableCell>
                      <TableCell className="text-center"><div className="flex justify-center"><StatusDot value={s?.menu_exists ?? "gray"} /></div></TableCell>
                      <TableCell className="text-center"><div className="flex justify-center"><StatusDot value={s?.data_connected ?? "gray"} /></div></TableCell>
                      <TableCell className="text-center"><div className="flex justify-center"><StatusDot value={s?.integration_connected ?? "gray"} /></div></TableCell>
                      <TableCell className="text-center"><div className="flex justify-center"><StatusDot value={s?.health_status ?? "gray"} /></div></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Detalhe lateral */}
        <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
            {selectedLayer && (
              <>
                <SheetHeader>
                  <SheetTitle>{selectedLayer.name}</SheetTitle>
                  <SheetDescription>{selectedLayer.description}</SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  <section>
                    <h3 className="mb-2 text-sm font-semibold">Status</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <StatusDot value={selectedStatus?.ui_exists ?? "gray"} label="UI" />
                      <StatusDot value={selectedStatus?.backend_exists ?? "gray"} label="Backend" />
                      <StatusDot value={selectedStatus?.route_exists ?? "gray"} label="Rota" />
                      <StatusDot value={selectedStatus?.menu_exists ?? "gray"} label="Menu" />
                      <StatusDot value={selectedStatus?.data_connected ?? "gray"} label="Dados" />
                      <StatusDot value={selectedStatus?.integration_connected ?? "gray"} label="Integração" />
                      <StatusDot value={selectedStatus?.health_status ?? "gray"} label="Health geral" />
                    </div>
                  </section>

                  <section>
                    <h3 className="mb-2 text-sm font-semibold">Rota & Menu</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Rota esperada</span>
                        <code className="text-xs">{selectedStatus?.expected_route ?? "—"}</code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Rota real</span>
                        <span className="flex items-center gap-1">
                          <code className="text-xs">{selectedStatus?.actual_route ?? "—"}</code>
                          {selectedStatus?.actual_route && (
                            <a href={selectedStatus.actual_route} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3 w-3 text-primary" />
                            </a>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">No sidebar</span>
                        <Badge variant={selectedStatus?.sidebar_present ? "default" : "outline"}>
                          {selectedStatus?.sidebar_present ? "Sim" : "Não"}
                        </Badge>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="mb-2 text-sm font-semibold">Fontes de dados ({selectedSources.length})</h3>
                    <div className="space-y-1">
                      {selectedSources.length === 0 && <div className="text-xs text-muted-foreground">Nenhuma fonte mapeada.</div>}
                      {selectedSources.map((s) => (
                        <div key={s.id} className="flex items-center justify-between rounded border border-border/50 px-2 py-1 text-xs">
                          <div>
                            <code>{s.source_name}</code>
                            <span className="ml-2 text-muted-foreground">({s.source_type})</span>
                          </div>
                          <Badge variant={s.is_connected ? "default" : "destructive"}>
                            {s.is_connected ? "ok" : "ausente"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="mb-2 text-sm font-semibold">Dependências ({selectedDeps.length})</h3>
                    <div className="space-y-1">
                      {selectedDeps.length === 0 && <div className="text-xs text-muted-foreground">Sem dependências mapeadas.</div>}
                      {selectedDeps.map((d) => (
                        <div key={d.id} className="flex items-center justify-between rounded border border-border/50 px-2 py-1 text-xs">
                          <div>
                            → <code>{d.depends_on_layer_code}</code>
                            <span className="ml-2 text-muted-foreground">({d.dependency_type})</span>
                          </div>
                          {d.is_critical && <Badge variant="destructive">crítica</Badge>}
                        </div>
                      ))}
                    </div>
                  </section>

                  {selectedStatus?.notes && (
                    <section>
                      <h3 className="mb-2 text-sm font-semibold">Observações</h3>
                      <p className="text-xs text-muted-foreground">{selectedStatus.notes}</p>
                    </section>
                  )}
                </div>
              </>
            )}
          </SheetContent>
      </Sheet>
    </div>
  );
}
