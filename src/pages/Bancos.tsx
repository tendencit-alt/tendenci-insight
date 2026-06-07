import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Landmark, Plus, Loader2, RefreshCw, Trash2, Eye, Link2,
  ArrowUpRight, ArrowDownRight, Download, CheckCircle2, AlertTriangle, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PluggyConnect } from "react-pluggy-connect";
import { formatDistanceToNow, format, subDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type Connection = {
  id: string;
  bank_name: string;
  bank_logo_url: string | null;
  status: string;
  last_sync_at: string | null;
  pluggy_item_id: string;
  last_error_message: string | null;
  account_count: number;
  total_balance: number;
};

type Transaction = {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string | null;
  merchant_name: string | null;
  reconciled_with: string | null;
  reconciled_id: string | null;
  reconciled_at: string | null;
  account_id: string;
  account_name: string | null;
  account_type: string;
  connection_id: string;
  bank_name: string;
  bank_logo_url: string | null;
};

type DashboardData = {
  connections: Connection[];
  recent_transactions: Transaction[];
  totals: { total_balance: number; pending_count: number; last_sync_at: string | null };
};

const STATUS_STYLES: Record<string, { label: string; cls: string; icon: any }> = {
  active: { label: "Ativo", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  login_required: { label: "Reautenticar", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30", icon: AlertTriangle },
  outdated: { label: "Desatualizado", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30", icon: AlertTriangle },
  error: { label: "Erro", cls: "bg-destructive/15 text-destructive border-destructive/30", icon: AlertTriangle },
  pending: { label: "Sincronizando", cls: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30", icon: Clock },
};

const PERIOD_PRESETS = [
  { value: "today", label: "Hoje", days: 0 },
  { value: "7d", label: "7 dias", days: 7 },
  { value: "30d", label: "30 dias", days: 30 },
  { value: "90d", label: "90 dias", days: 90 },
  { value: "all", label: "Tudo", days: -1 },
];

const BRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

export default function Bancos() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<Connection | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Filters
  const [filterBank, setFilterBank] = useState<string>("all");
  const [filterReconciled, setFilterReconciled] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("30d");
  const [filterMin, setFilterMin] = useState<string>("");
  const [filterMax, setFilterMax] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const fetchData = async () => {
    setLoading(true);
    const { data: res, error } = await supabase.rpc("get_bank_dashboard_data");
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar bancos", { description: error.message });
    } else {
      setData(res as unknown as DashboardData);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("pluggy-connect-token");
      if (error) throw error;
      const token = (res as any)?.accessToken;
      if (!token) throw new Error("Token não recebido");
      setConnectToken(token);
    } catch (e: any) {
      toast.error("Falha ao iniciar conexão", { description: e?.message ?? "Tente novamente" });
    } finally {
      setConnecting(false);
    }
  };

  const handlePluggySuccess = async (itemData: any) => {
    setConnectToken(null);
    const itemId = itemData?.item?.id ?? itemData?.id;
    if (!itemId) {
      toast.error("Conexão sem identificador retornado");
      return;
    }
    const loadingId = toast.loading("Importando dados do banco…");
    try {
      const { data: res, error } = await supabase.functions.invoke("pluggy-handle-connection", {
        body: { itemId },
      });
      if (error) throw error;
      const r = res as any;
      toast.success(`Banco conectado: ${r?.bankName ?? "OK"}`, {
        id: loadingId,
        description: `${r?.accountsCount ?? 0} conta(s) importada(s).`,
      });
      await fetchData();
    } catch (e: any) {
      toast.error("Erro ao importar dados do banco", { id: loadingId, description: e?.message ?? "" });
    }
  };

  const handlePluggyError = (err: any) => {
    console.error("[Pluggy] error", err);
    toast.error("Não foi possível concluir a conexão", {
      description: err?.message ?? "Tente novamente em instantes.",
    });
  };

  const handleDisconnect = async (conn: Connection) => {
    const { error } = await supabase
      .from("bank_connections")
      .update({ status: "deleted" })
      .eq("id", conn.id);
    if (error) {
      toast.error("Erro ao desconectar", { description: error.message });
    } else {
      toast.success(`${conn.bank_name} desconectado`, {
        description: "Histórico preservado. Sincronizações futuras pausadas.",
      });
      setConfirmDisconnect(null);
      await fetchData();
    }
  };

  const handleSyncNow = async (conn: Connection) => {
    toast.info(`Sincronização agendada — ${conn.bank_name}`, {
      description: "Aguarde alguns instantes e atualize a página.",
    });
    // (Hook para futura função pluggy-sync-now por item)
  };

  // Filtering
  const filtered = useMemo(() => {
    if (!data) return [];
    const preset = PERIOD_PRESETS.find((p) => p.value === filterPeriod);
    const cutoff = preset && preset.days >= 0 ? subDays(new Date(), preset.days) : null;
    const min = filterMin ? Number(filterMin) : null;
    const max = filterMax ? Number(filterMax) : null;
    return data.recent_transactions.filter((t) => {
      if (filterBank !== "all" && t.connection_id !== filterBank) return false;
      if (filterReconciled === "pending" && t.reconciled_with) return false;
      if (filterReconciled === "reconciled" && !t.reconciled_with) return false;
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      if (cutoff && parseISO(t.date) < cutoff) return false;
      if (min !== null && Math.abs(t.amount) < min) return false;
      if (max !== null && Math.abs(t.amount) > max) return false;
      return true;
    });
  }, [data, filterBank, filterReconciled, filterCategory, filterPeriod, filterMin, filterMax]);

  const categories = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    data.recent_transactions.forEach((t) => t.category && set.add(t.category));
    return Array.from(set).sort();
  }, [data]);

  const handleExportCsv = () => {
    if (!filtered.length) {
      toast.info("Nada para exportar");
      return;
    }
    const headers = ["Data", "Banco", "Conta", "Descrição", "Categoria", "Valor", "Conciliado"];
    const rows = filtered.map((t) => [
      t.date,
      t.bank_name,
      t.account_name ?? "",
      `"${(t.description ?? "").replace(/"/g, '""')}"`,
      t.category ?? "",
      String(t.amount),
      t.reconciled_with ? "Sim" : "Não",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extrato_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lastSync = data?.totals?.last_sync_at
    ? formatDistanceToNow(parseISO(data.totals.last_sync_at), { locale: ptBR, addSuffix: true })
    : "nunca";

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Contas Bancárias</h1>
              <p className="text-sm text-muted-foreground">
                Conecte suas contas e receba extratos automaticamente via Open Finance. Última sincronização: <strong>{lastSync}</strong>.
              </p>
            </div>
          </div>
          <Button size="lg" onClick={handleConnect} disabled={connecting}>
            {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Conectar banco
          </Button>
        </div>

        {/* KPIs */}
        {data && !loading && (
          <div className="grid gap-3 md:grid-cols-3">
            <Card><CardHeader className="pb-2"><CardDescription>Saldo total agregado</CardDescription>
              <CardTitle className="text-2xl">{BRL(data.totals.total_balance)}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>Transações pendentes de conciliação</CardDescription>
              <CardTitle className="text-2xl">{data.totals.pending_count}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>Conexões ativas</CardDescription>
              <CardTitle className="text-2xl">
                {data.connections.filter((c) => c.status === "active").length}
              </CardTitle></CardHeader></Card>
          </div>
        )}

        {/* CONEXÕES */}
        <div>
          <h2 className="mb-3 text-lg font-semibold">Conexões</h2>
          {loading ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
            </div>
          ) : !data?.connections.length ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <Landmark className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Nenhum banco conectado ainda. Clique em "Conectar banco" para começar.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {data.connections.map((c) => {
                const st = STATUS_STYLES[c.status] ?? STATUS_STYLES.pending;
                const StIcon = st.icon;
                return (
                  <Card key={c.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {c.bank_logo_url ? (
                            <img src={c.bank_logo_url} alt={c.bank_name} className="h-10 w-10 rounded object-contain bg-muted/30 p-1" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                              <Landmark className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-base">{c.bank_name}</CardTitle>
                            <CardDescription className="text-xs">
                              {c.account_count} conta(s)
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className={`${st.cls} flex items-center gap-1`}>
                          <StIcon className="h-3 w-3" /> {st.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-2xl font-bold">{BRL(c.total_balance)}</p>
                      <p className="text-xs text-muted-foreground">
                        Sincronizado{" "}
                        {c.last_sync_at
                          ? formatDistanceToNow(parseISO(c.last_sync_at), { locale: ptBR, addSuffix: true })
                          : "nunca"}
                      </p>
                      {c.last_error_message && (
                        <p className="text-xs text-destructive">{c.last_error_message}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setFilterBank(c.id)}>
                          <Eye className="mr-1 h-3 w-3" /> Ver extrato
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleSyncNow(c)}>
                          <RefreshCw className="mr-1 h-3 w-3" /> Sincronizar
                        </Button>
                        {c.status === "login_required" && (
                          <Button size="sm" variant="secondary" onClick={handleConnect}>
                            <Link2 className="mr-1 h-3 w-3" /> Reconectar
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                                onClick={() => setConfirmDisconnect(c)}>
                          <Trash2 className="mr-1 h-3 w-3" /> Desconectar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* EXTRATO */}
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Extrato recente</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleExportCsv}>
                <Download className="mr-1 h-4 w-4" /> Exportar CSV
              </Button>
              <Button size="sm" variant="outline" disabled>Conciliar selecionadas</Button>
            </div>
          </div>

          {/* Filtros */}
          <Card className="mb-3">
            <CardContent className="grid gap-3 p-4 md:grid-cols-6">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Banco</label>
                <Select value={filterBank} onValueChange={setFilterBank}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {data?.connections.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.bank_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Período</label>
                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIOD_PRESETS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Categoria</label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Conciliação</label>
                <Select value={filterReconciled} onValueChange={setFilterReconciled}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="reconciled">Conciliadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Valor mín.</label>
                <Input type="number" value={filterMin} onChange={(e) => setFilterMin(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Valor máx.</label>
                <Input type="number" value={filterMax} onChange={(e) => setFilterMax(e.target.value)} placeholder="∞" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : !filtered.length ? (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  Nenhuma transação encontrada com os filtros aplicados.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Banco</TableHead>
                      <TableHead>Conta</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((t) => (
                      <TableRow key={t.id} className="cursor-pointer" onClick={() => setSelectedTx(t)}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {format(parseISO(t.date), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="text-xs">{t.bank_name}</TableCell>
                        <TableCell className="text-xs">{t.account_name ?? "—"}</TableCell>
                        <TableCell className="max-w-[260px] truncate">{t.description}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t.category ?? "—"}</TableCell>
                        <TableCell className={`text-right font-medium ${t.amount >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                          <span className="inline-flex items-center gap-1">
                            {t.amount >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {BRL(t.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {t.reconciled_with ? (
                            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                              Conciliado
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pendente</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Widget Pluggy */}
      {connectToken && (
        <PluggyConnect
          connectToken={connectToken}
          includeSandbox={true}
          onSuccess={handlePluggySuccess}
          onError={handlePluggyError}
          onClose={() => setConnectToken(null)}
        />
      )}

      {/* Desconectar — confirmação */}
      <AlertDialog open={!!confirmDisconnect} onOpenChange={(o) => !o && setConfirmDisconnect(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar {confirmDisconnect?.bank_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              O histórico de transações <strong>permanece preservado</strong>. Apenas a sincronização
              automática futura será desativada. Você poderá reconectar a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDisconnect && handleDisconnect(confirmDisconnect)}>
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detalhes transação */}
      <Dialog open={!!selectedTx} onOpenChange={(o) => !o && setSelectedTx(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da transação</DialogTitle>
            <DialogDescription>{selectedTx?.description}</DialogDescription>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Data</p><p>{format(parseISO(selectedTx.date), "dd/MM/yyyy")}</p></div>
                <div><p className="text-xs text-muted-foreground">Valor</p>
                  <p className={selectedTx.amount >= 0 ? "text-emerald-600 font-medium" : "text-destructive font-medium"}>
                    {BRL(selectedTx.amount)}
                  </p>
                </div>
                <div><p className="text-xs text-muted-foreground">Banco</p><p>{selectedTx.bank_name}</p></div>
                <div><p className="text-xs text-muted-foreground">Conta</p><p>{selectedTx.account_name ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Categoria</p><p>{selectedTx.category ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Estabelecimento</p><p>{selectedTx.merchant_name ?? "—"}</p></div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status conciliação</p>
                {selectedTx.reconciled_with ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
                    Conciliado em {selectedTx.reconciled_at ? format(parseISO(selectedTx.reconciled_at), "dd/MM/yyyy") : ""}
                  </Badge>
                ) : (
                  <Badge variant="outline">Pendente — conciliação manual em breve</Badge>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTx(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
