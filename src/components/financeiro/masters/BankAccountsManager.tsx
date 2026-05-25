import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateBrInput } from "@/components/ui/date-br-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Landmark, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { numericCodeSort } from "@/lib/numericCodeSort";
export function BankAccountsManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nickname: "",
    bank_name: "",
    agency: "",
    account_number: "",
    opening_balance: "0",
    opening_balance_date: format(new Date(), "yyyy-MM-dd"),
    active: true,
  });

  const { data: accounts, isLoading, refetch } = useQuery({
    queryKey: ["fin-bank-accounts-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_bank_accounts")
        .select("*")
        .order("nickname");
      return data || [];
    },
  });

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
        const { error } = await supabase
          .from("fin_bank_accounts")
          .update(data)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Conta atualizada!");
      } else {
        const { error } = await supabase
          .from("fin_bank_accounts")
          .insert(data);
        if (error) throw error;
        toast.success("Conta criada!");
      }

      refetch();
      setDialogOpen(false);
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const sortedAccounts = useMemo(() => numericCodeSort(accounts || [], 'nickname'), [accounts]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Landmark className="h-5 w-5" />
          Contas Bancárias
        </CardTitle>
        <Button onClick={handleNew} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Conta
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Agência</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Saldo Inicial</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.nickname}</TableCell>
                  <TableCell>{account.bank_name || "-"}</TableCell>
                  <TableCell>{account.agency || "-"}</TableCell>
                  <TableCell>{account.account_number || "-"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(account.opening_balance || 0))}</TableCell>
                  <TableCell>
                    {account.active ? (
                      <Badge className="bg-green-600">Ativa</Badge>
                    ) : (
                      <Badge variant="secondary">Inativa</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(account)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {accounts?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma conta cadastrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

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
                <Input
                  placeholder="Nome do banco..."
                  value={form.bank_name}
                  onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Agência</Label>
                <Input
                  placeholder="0000"
                  value={form.agency}
                  onChange={(e) => setForm({ ...form, agency: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Número da Conta</Label>
              <Input
                placeholder="00000-0"
                value={form.account_number}
                onChange={(e) => setForm({ ...form, account_number: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Saldo Inicial</Label>
                <Input
                  type="text"
                  placeholder="0,00"
                  value={form.opening_balance}
                  onChange={(e) => setForm({ ...form, opening_balance: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data do Saldo</Label>
                <DateBrInput
                  value={form.opening_balance_date}
                  onChange={(iso) => setForm({ ...form, opening_balance_date: iso })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.active}
                onCheckedChange={(checked) => setForm({ ...form, active: checked })}
              />
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
    </Card>
  );
}
