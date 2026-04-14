import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GitBranch, Flag, Plus, RefreshCw, Rocket, History,
  ToggleLeft, Percent, Shield, FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ── Types ──
interface Release {
  id: string;
  version: string;
  title: string;
  description: string | null;
  improvements: string[];
  fixes: string[];
  breaking_changes: string[];
  status: string;
  released_at: string | null;
  created_at: string;
}

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  module: string | null;
  status: string;
  rollout_percentage: number;
  pilot_tenant_ids: string[];
  release_id: string | null;
}

interface ChangelogEntry {
  id: string;
  release_id: string;
  change_type: string;
  module: string | null;
  title: string;
  description: string | null;
  created_at: string;
}

export function ReleaseManagementPanel() {
  const { toast } = useToast();
  const [releases, setReleases] = useState<Release[]>([]);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const [r, f, c] = await Promise.all([
      (supabase as any).from("system_releases").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("feature_flags").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("system_changelog").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setReleases(r.data || []);
    setFlags(f.data || []);
    setChangelog(c.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Release form ──
  const [newRelease, setNewRelease] = useState({ version: "", title: "", description: "" });
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);

  const createRelease = async () => {
    if (!newRelease.version || !newRelease.title) return;
    const { error } = await (supabase as any).from("system_releases").insert({
      version: newRelease.version,
      title: newRelease.title,
      description: newRelease.description || null,
      status: "draft",
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Release criada" });
    setNewRelease({ version: "", title: "", description: "" });
    setReleaseDialogOpen(false);
    fetchAll();
  };

  const activateRelease = async (id: string) => {
    await (supabase as any).from("system_releases").update({ status: "active", released_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "Release ativada" });
    fetchAll();
  };

  const archiveRelease = async (id: string) => {
    await (supabase as any).from("system_releases").update({ status: "archived" }).eq("id", id);
    fetchAll();
  };

  // ── Feature Flag form ──
  const [newFlag, setNewFlag] = useState({ key: "", name: "", description: "", module: "" });
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);

  const createFlag = async () => {
    if (!newFlag.key || !newFlag.name) return;
    const { error } = await (supabase as any).from("feature_flags").insert({
      key: newFlag.key,
      name: newFlag.name,
      description: newFlag.description || null,
      module: newFlag.module || null,
      status: "disabled",
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Feature flag criada" });
    setNewFlag({ key: "", name: "", description: "", module: "" });
    setFlagDialogOpen(false);
    fetchAll();
  };

  const updateFlagStatus = async (id: string, status: string) => {
    await (supabase as any).from("feature_flags").update({ status }).eq("id", id);
    fetchAll();
  };

  const updateRollout = async (id: string, pct: number) => {
    await (supabase as any).from("feature_flags").update({ rollout_percentage: pct, status: "rollout" }).eq("id", id);
    fetchAll();
  };

  // ── Changelog form ──
  const [newChange, setNewChange] = useState({ release_id: "", change_type: "feature", module: "", title: "", description: "" });
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);

  const createChangelog = async () => {
    if (!newChange.release_id || !newChange.title) return;
    await (supabase as any).from("system_changelog").insert({
      release_id: newChange.release_id,
      change_type: newChange.change_type,
      module: newChange.module || null,
      title: newChange.title,
      description: newChange.description || null,
    });
    toast({ title: "Entrada adicionada ao changelog" });
    setNewChange({ release_id: "", change_type: "feature", module: "", title: "", description: "" });
    setChangeDialogOpen(false);
    fetchAll();
  };

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;
  }

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { draft: "secondary", active: "default", archived: "outline", disabled: "secondary", owner_only: "default", pilot: "default", rollout: "default", enabled: "default" };
    return <Badge variant={map[s] as any || "secondary"}>{s}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><GitBranch className="h-6 w-6 text-primary" /> Release Management</h2>
          <p className="text-sm text-muted-foreground">Versionamento, feature flags e rollout progressivo</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10 text-primary"><Rocket className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{releases.filter(r => r.status === "active").length}</p><p className="text-xs text-muted-foreground">Releases Ativas</p></div></CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10 text-primary"><Flag className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{flags.length}</p><p className="text-xs text-muted-foreground">Feature Flags</p></div></CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10 text-primary"><ToggleLeft className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{flags.filter(f => f.status === "enabled").length}</p><p className="text-xs text-muted-foreground">Flags Ativas</p></div></CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10 text-primary"><Percent className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{flags.filter(f => f.status === "rollout").length}</p><p className="text-xs text-muted-foreground">Em Rollout</p></div></CardContent></Card>
      </div>

      <Tabs defaultValue="releases" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="releases">Releases</TabsTrigger>
          <TabsTrigger value="flags">Feature Flags</TabsTrigger>
          <TabsTrigger value="changelog">Changelog</TabsTrigger>
        </TabsList>

        {/* ── Releases ── */}
        <TabsContent value="releases" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Release</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Release</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Versão</Label><Input placeholder="v2.5.0" value={newRelease.version} onChange={e => setNewRelease(p => ({ ...p, version: e.target.value }))} /></div>
                  <div><Label>Título</Label><Input placeholder="Melhorias DRE e Forecast" value={newRelease.title} onChange={e => setNewRelease(p => ({ ...p, title: e.target.value }))} /></div>
                  <div><Label>Descrição</Label><Textarea value={newRelease.description} onChange={e => setNewRelease(p => ({ ...p, description: e.target.value }))} /></div>
                  <Button onClick={createRelease} className="w-full">Criar Release</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Versão</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {releases.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono font-bold">{r.version}</TableCell>
                      <TableCell>{r.title}</TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.released_at ? format(new Date(r.released_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {r.status === "draft" && <Button size="sm" variant="outline" onClick={() => activateRelease(r.id)}>Ativar</Button>}
                        {r.status === "active" && <Button size="sm" variant="ghost" onClick={() => archiveRelease(r.id)}>Arquivar</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {releases.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhuma release</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Feature Flags ── */}
        <TabsContent value="flags" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Flag</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Feature Flag</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Key</Label><Input placeholder="new_dre_v2" value={newFlag.key} onChange={e => setNewFlag(p => ({ ...p, key: e.target.value }))} /></div>
                  <div><Label>Nome</Label><Input placeholder="DRE V2" value={newFlag.name} onChange={e => setNewFlag(p => ({ ...p, name: e.target.value }))} /></div>
                  <div><Label>Módulo</Label><Input placeholder="Financeiro" value={newFlag.module} onChange={e => setNewFlag(p => ({ ...p, module: e.target.value }))} /></div>
                  <div><Label>Descrição</Label><Textarea value={newFlag.description} onChange={e => setNewFlag(p => ({ ...p, description: e.target.value }))} /></div>
                  <Button onClick={createFlag} className="w-full">Criar Flag</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {flags.map(f => (
              <Card key={f.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold">{f.name}</span>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{f.key}</code>
                        {f.module && <Badge variant="outline">{f.module}</Badge>}
                      </div>
                      {f.description && <p className="text-sm text-muted-foreground">{f.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Select value={f.status} onValueChange={v => updateFlagStatus(f.id, v)}>
                        <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="disabled">Desativado</SelectItem>
                          <SelectItem value="owner_only">Só Owner</SelectItem>
                          <SelectItem value="pilot">Piloto</SelectItem>
                          <SelectItem value="rollout">Rollout</SelectItem>
                          <SelectItem value="enabled">Ativo (todos)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {f.status === "rollout" && (
                    <div className="mt-3 flex items-center gap-4">
                      <span className="text-sm text-muted-foreground w-20">{f.rollout_percentage}%</span>
                      <Slider
                        value={[f.rollout_percentage]}
                        max={100}
                        step={5}
                        className="flex-1"
                        onValueCommit={(v) => updateRollout(f.id, v[0])}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {flags.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma feature flag criada</p>}
          </div>
        </TabsContent>

        {/* ── Changelog ── */}
        <TabsContent value="changelog" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Dialog open={changeDialogOpen} onOpenChange={setChangeDialogOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Entrada</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Adicionar ao Changelog</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Release</Label>
                    <Select value={newChange.release_id} onValueChange={v => setNewChange(p => ({ ...p, release_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione a release" /></SelectTrigger>
                      <SelectContent>{releases.map(r => <SelectItem key={r.id} value={r.id}>{r.version} – {r.title}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={newChange.change_type} onValueChange={v => setNewChange(p => ({ ...p, change_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="feature">Feature</SelectItem>
                        <SelectItem value="fix">Correção</SelectItem>
                        <SelectItem value="improvement">Melhoria</SelectItem>
                        <SelectItem value="breaking">Breaking Change</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Módulo</Label><Input placeholder="Financeiro" value={newChange.module} onChange={e => setNewChange(p => ({ ...p, module: e.target.value }))} /></div>
                  <div><Label>Título</Label><Input value={newChange.title} onChange={e => setNewChange(p => ({ ...p, title: e.target.value }))} /></div>
                  <div><Label>Descrição</Label><Textarea value={newChange.description} onChange={e => setNewChange(p => ({ ...p, description: e.target.value }))} /></div>
                  <Button onClick={createChangelog} className="w-full">Adicionar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changelog.map(c => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Badge variant={c.change_type === "breaking" ? "destructive" : c.change_type === "fix" ? "secondary" : "default"}>
                          {c.change_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{c.module || "—"}</TableCell>
                      <TableCell>
                        <span className="font-medium">{c.title}</span>
                        {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(c.created_at), "dd/MM/yy", { locale: ptBR })}</TableCell>
                    </TableRow>
                  ))}
                  {changelog.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Sem entradas</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
