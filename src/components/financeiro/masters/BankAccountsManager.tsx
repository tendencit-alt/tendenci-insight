import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DateBrInput } from "@/components/ui/date-br-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Pencil, Landmark, Loader2, Link2, RefreshCw, Trash2, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PluggyConnect } from "react-pluggy-connect";
import { useNavigate } from "react-router-dom";

type UnifiedAccount = {
  id: string;
  source: "manual" | "open_finance";
  nickname: string;
  bank_name: string | null;
  agency: string | null;
  account_number: string | null;
  opening_balance: number;
  active: boolean;
  last_sync_at: string | null;
  connection_id?: string;
  raw: any;
};

export function BankAccountsManager() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<UnifiedAccount | null>(null);
  const [form, setForm] = useState({
    nickname: "",
    bank_name: "",
    agency: "",
    account_number: "",
    opening_balance: "0",
    opening_balance_date: format(new Date(), "yyyy-MM-dd"),
    active: true,
  });

  const { data: manualAccounts, isLoading: loadingManual, refetch: refetchManual } = useQuery({
    queryKey: ["fin-bank-accounts-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_bank_accounts")
        .select("*")
        .order("nickname");
      return data || [];
    },
  });

  const { data: ofData, isLoading: loadingOF, refetch: refetchOF } = useQuery({
    queryKey: ["open-finance-accounts"],
    queryFn: async () => {
      const { data: connections } = await supabase
        .from("bank_connections")
        .select("id, bank_name, bank_logo_url, status, last_sync_at")
        .neq("status", "deleted");
      const { data: accounts } = await supabase
        .from("bank_accounts")
        .select("id, connection_id, marketing_name, account_type, agency, account_number, balance");
      return {
        connections: connections || [],
        accounts: accounts || [],
      };
    },
  });

  const refetchAll = () => {
    refetchManual();
    refetchOF();
  };

  const unified: UnifiedAccount[] = useMemo(() => {
    const list: UnifiedAccount[] = [];
    // Open Finance first
    (ofData?.accounts || []).forEach((a: any) => {
      const conn = (ofData?.connections || []).find((c: any) => c.id === a.connection_id);
      if (!conn) return; // hide deleted
      list.push({
        id: a.id,
        source: "open_finance",
        nickname: a.marketing_name || `${conn.bank_name} ${a.account_type ?? ""}`.trim(),
        bank_name: conn.bank_name,
        agency: a.agency,
        account_number: a.account_number,
        opening_balance: Number(a.balance || 0),
        active: conn.status === "active",
        last_sync_at: conn.last_sync_at,
        connection_id: conn.id,
        raw: { ...a, connection: conn },
      });
    });
    (manualAccounts || []).forEach((a: any) => {
      list.push({
        id: a.id,
        source: "manual",
        nickname: a.nickname,
        bank_name: a.bank_name,
        agency: a.agency,
        account_number: a.account_number,
        opening_balance: Number(a.opening_balance || 0),
        active: a.active ?? true,
        last_sync_at: null,
        raw: a,
      });
    });
    return list;
  }, [manualAccounts, ofData]);

  const isLoading = loadingManual || loadingOF;

  const handleEdit = (account: any) => {
    setEditing(account);
    setForm({
      nickname: account.nickname || "",
      bank_name: account.bank_name || "",
      agency: account.agency || "",
      account_number: account.account_number || "",
      opening_balance: String(account.opening_balance || 0),
      opening_balance_date: account.opening_balance_date || format(new Date(), "yyyy-MM-dd"),
      active: account.active ?? true,
    });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditing(null);
    setForm({
      nickname: "",
      bank_name: "",
      agency: "",
      account_number: "",
      opening_balance: "0",
      opening_balance_date: format(new Date(), "yyyy-MM-dd"),
      active: true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.nickname) {
      toast.error("Nome da conta é obrigatório");
      return;
    }
    setLoading(true);
    try {
      const data = {
        nickname: form.nickname,
        bank_name: form.bank_name || null,
        agency: form.agency || null,
        account_number: form.account_number || null,
        opening_balance: parseFloat(form.opening_balance.replace(",", ".")) || 0,
        opening_balance_date: form.opening_balance_date,
        active: form.active,
      };
      if (editing) {
        const { error } = await supabase.from("fin_bank_accounts").update(data).eq("id", editing.id);
        if (error) throw error;
        toast.success("Conta atualizada!");
      } else {
        const { error } = await supabase.from("fin_bank_accounts").insert(data);
        if (error) throw error;
        toast.success("Conta criada!");
      }
      refetchAll();
      setDialogOpen(false);
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Open Finance / Pluggy ──
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
      refetchAll();
    } catch (e: any) {
      toast.error("Erro ao importar dados do banco", { id: loadingId, description: e?.message ?? "" });
    }
  };

  const handlePluggyError = (err: any) => {
    console.error("[Pluggy] error", err);
    setConnectToken(null);
    toast.error("Não foi possível concluir a conexão", {
      description: err?.message ?? "Tente novamente em instantes.",
    });
  };

  const handleDisconnect = async (acc: UnifiedAccount) => {
    if (!acc.connection_id) return;
    const { error } = await supabase
      .from("bank_connections")
      .update({ status: "deleted" })
      .eq("id", acc.connection_id);
    if (error) {
      toast.error("Erro ao desconectar", { description: error.message });
    } else {
      toast.success(`${acc.bank_name} desconectado`, {
        description: "Histórico preservado. Sincronizações futuras pausadas.",
      });
      setConfirmDisconnect(null);
      refetchAll();
    }
  };

  const handleSyncNow = async (acc: UnifiedAccount) => {
    toast.info(`Sincronização agendada — ${acc.bank_name}`, {
      description: "Aguarde alguns instantes e atualize a página.",
    });
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 pb-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Contas Bancárias
          </CardTitle>
          <CardDescription className="mt-1">
            Cadastre contas manualmente ou conecte automaticamente via Open Finance para receber extratos.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleNew} size="sm" variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Conta
          </Button>
          <Button onClick={handleConnect} size="sm" disabled={connecting} className="gap-2">
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Landmark className="h-4 w-4" />}
            Conectar Banco
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : unified.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-10 text-center">
            <Landmark className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada ainda.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleNew}>
                <Plus className="mr-1 h-4 w-4" /> Cadastrar conta manual
              </Button>
              <Button size="sm" onClick={handleConnect} disabled={connecting}>
                <Landmark className="mr-1 h-4 w-4" /> Conectar banco automaticamente
              </Button>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Agência</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Última sincronização</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unified.map((account) => (
                <TableRow key={`${account.source}-${account.id}`}>
                  <TableCell className="font-medium">{account.nickname}</TableCell>
                  <TableCell>{account.bank_name || "-"}</TableCell>
                  <TableCell>{account.agency || "-"}</TableCell>
                  <TableCell>{account.account_number || "-"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(account.opening_balance)}</TableCell>
                  <TableCell>
                    {account.source === "open_finance" ? (
                      <Badge className="bg-blue-600 hover:bg-blue-600">Open Finance</Badge>
                    ) : (
                      <Badge variant="secondary">Manual</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {account.active ? (
                      <Badge className="bg-green-600 hover:bg-green-600">Ativa</Badge>
                    ) : (
                      <Badge variant="secondary">Inativa</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {account.source === "open_finance"
                      ? account.last_sync_at
                        ? formatDistanceToNow(parseISO(account.last_sync_at), { locale: ptBR, addSuffix: true })
                        : "nunca"
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {account.source === "manual" ? (
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(account.raw)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : (
                        <>
                          <Button variant="ghost" size="sm" title="Ver extrato"
                                  onClick={() => navigate("/financeiro?tab=reconciliation")}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Sincronizar agora"
                                  onClick={() => handleSyncNow(account)}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Reconectar" onClick={handleConnect}>
                            <Link2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Desconectar"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setConfirmDisconnect(account)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Manual account dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Conta" : "Nova Conta Bancária"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Conta *</Label>
              <Input
                placeholder="Ex: Conta Principal, Caixa..."
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Banco</Label>
                <Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Agência</Label>
                <Input value={form.agency} onChange={(e) => setForm({ ...form, agency: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Número da Conta</Label>
              <Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Saldo Inicial</Label>
                <Input value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Data do Saldo</Label>
                <DateBrInput value={form.opening_balance_date} onChange={(iso) => setForm({ ...form, opening_balance_date: iso })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(checked) => setForm({ ...form, active: checked })} />
              <Label>Conta ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pluggy widget */}
      {connectToken && (
        <PluggyConnect
          connectToken={connectToken}
          includeSandbox
          onSuccess={handlePluggySuccess}
          onError={handlePluggyError}
          onClose={() => setConnectToken(null)}
        />
      )}

      {/* Disconnect confirm */}
      <AlertDialog open={!!confirmDisconnect} onOpenChange={(o) => !o && setConfirmDisconnect(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar {confirmDisconnect?.bank_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              O histórico de transações será preservado, mas novas sincronizações serão pausadas.
              Você pode reconectar a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDisconnect && handleDisconnect(confirmDisconnect)}>
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
