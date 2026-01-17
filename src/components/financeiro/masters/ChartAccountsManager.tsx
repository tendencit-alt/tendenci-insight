import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ChartAccountsManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    nature: "DESPESA",
    parent_id: "",
    in_dre: true,
    in_cashflow: true,
    active: true,
  });

  const { data: accounts, isLoading, refetch } = useQuery({
    queryKey: ["fin-chart-accounts-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_chart_accounts")
        .select("*")
        .order("code");
      return data || [];
    },
  });

  const parentAccounts = accounts?.filter((a) => !a.parent_id) || [];

  const handleEdit = (account: any) => {
    setEditing(account);
    setForm({
      code: account.code || "",
      name: account.name || "",
      nature: account.nature || "DESPESA",
      parent_id: account.parent_id || "",
      in_dre: account.in_dre ?? true,
      in_cashflow: account.in_cashflow ?? true,
      active: account.active ?? true,
    });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditing(null);
    setForm({
      code: "",
      name: "",
      nature: "DESPESA",
      parent_id: "",
      in_dre: true,
      in_cashflow: true,
      active: true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.code || !form.name || !form.nature) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const data = {
        code: form.code,
        name: form.name,
        nature: form.nature,
        parent_id: form.parent_id || null,
        in_dre: form.in_dre,
        in_cashflow: form.in_cashflow,
        active: form.active,
      };

      if (editing) {
        const { error } = await supabase
          .from("fin_chart_accounts")
          .update(data)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Conta atualizada!");
      } else {
        const { error } = await supabase
          .from("fin_chart_accounts")
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

  const getNatureBadge = (nature: string) => {
    switch (nature) {
      case "RECEITA":
        return <Badge className="bg-green-600">Receita</Badge>;
      case "DESPESA":
        return <Badge variant="destructive">Despesa</Badge>;
      case "RESULTADO":
        return <Badge variant="secondary">Resultado</Badge>;
      default:
        return <Badge variant="outline">{nature}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Plano de Contas
        </CardTitle>
        <Button onClick={handleNew} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Conta
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Natureza</TableHead>
                <TableHead>DRE</TableHead>
                <TableHead>Fluxo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts?.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className={cn("font-medium", account.parent_id && "pl-8")}>
                    {account.code}
                  </TableCell>
                  <TableCell>{account.name}</TableCell>
                  <TableCell>{getNatureBadge(account.nature)}</TableCell>
                  <TableCell>
                    {account.in_dre ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">Sim</Badge>
                    ) : (
                      <Badge variant="outline">Não</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {account.in_cashflow ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">Sim</Badge>
                    ) : (
                      <Badge variant="outline">Não</Badge>
                    )}
                  </TableCell>
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
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Conta" : "Nova Conta Contábil"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input
                  placeholder="Ex: 4.1.1"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Natureza *</Label>
                <Select value={form.nature} onValueChange={(v) => setForm({ ...form, nature: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RECEITA">Receita</SelectItem>
                    <SelectItem value="DESPESA">Despesa</SelectItem>
                    <SelectItem value="ATIVO">Ativo</SelectItem>
                    <SelectItem value="PASSIVO">Passivo</SelectItem>
                    <SelectItem value="RESULTADO">Resultado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                placeholder="Nome da conta..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Conta Pai</Label>
              <Select value={form.parent_id} onValueChange={(v) => setForm({ ...form, parent_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma (conta raiz)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma (conta raiz)</SelectItem>
                  {parentAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.in_dre}
                  onCheckedChange={(checked) => setForm({ ...form, in_dre: checked })}
                />
                <Label>Incluir no DRE</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.in_cashflow}
                  onCheckedChange={(checked) => setForm({ ...form, in_cashflow: checked })}
                />
                <Label>Incluir no Fluxo de Caixa</Label>
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
