import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, FileSpreadsheet, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type BulkEditField = "nature" | "in_dre" | "in_cashflow" | "active" | null;

export function ChartAccountsManager() {
  const queryClient = useQueryClient();
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

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkEditField, setBulkEditField] = useState<BulkEditField>(null);
  const [bulkEditValue, setBulkEditValue] = useState<string | boolean>("");
  const [bulkLoading, setBulkLoading] = useState(false);

  // Single delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<any>(null);

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

  // Optimistic update helper
  const optimisticUpdate = (updater: (prev: any[]) => any[]) => {
    queryClient.setQueryData(["fin-chart-accounts-all"], (old: any[] | undefined) => {
      if (!old) return old;
      return updater(old);
    });
  };

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
    const data = {
      code: form.code,
      name: form.name,
      nature: form.nature,
      parent_id: form.parent_id || null,
      in_dre: form.in_dre,
      in_cashflow: form.in_cashflow,
      active: form.active,
    };

    // Generate a temporary ID for new items
    const tempId = `temp-${Date.now()}`;

    // Optimistic update
    if (editing) {
      optimisticUpdate((prev) =>
        prev.map((a) => (a.id === editing.id ? { ...a, ...data } : a))
      );
    } else {
      // Add new item optimistically with temp ID
      const newItem = {
        id: tempId,
        ...data,
        created_at: new Date().toISOString(),
        dre_order: null,
      };
      optimisticUpdate((prev) => {
        // Insert in the right position based on code
        const newList = [...prev, newItem];
        return newList.sort((a, b) => a.code.localeCompare(b.code));
      });
    }

    setDialogOpen(false);

    try {
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

      // Success - optimistic update already applied, no refetch needed
    } catch (error: any) {
      toast.error("Erro: " + error.message);
      await refetch(); // Rollback on error
    } finally {
      setLoading(false);
    }
  };

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked && accounts) {
      setSelectedIds(new Set(accounts.map((a) => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const openBulkEditDialog = (field: BulkEditField) => {
    setBulkEditField(field);
    if (field === "nature") {
      setBulkEditValue("DESPESA");
    } else {
      setBulkEditValue(true);
    }
    setBulkEditDialogOpen(true);
  };

  const handleBulkEdit = async () => {
    if (!bulkEditField || selectedIds.size === 0) return;

    const idsToUpdate = Array.from(selectedIds);
    const updateData: Record<string, any> = {};
    updateData[bulkEditField] = bulkEditValue;

    // Optimistic update - apply immediately
    optimisticUpdate((prev) =>
      prev.map((a) => (idsToUpdate.includes(a.id) ? { ...a, ...updateData } : a))
    );

    setBulkEditDialogOpen(false);
    clearSelection();
    setBulkLoading(true);

    try {
      const { error } = await supabase
        .from("fin_chart_accounts")
        .update(updateData)
        .in("id", idsToUpdate);

      if (error) throw error;

      toast.success(`${idsToUpdate.length} conta(s) atualizada(s)!`);
      // Success - optimistic update already applied, no refetch needed
    } catch (error: any) {
      toast.error("Erro: " + error.message);
      await refetch(); // Rollback on error
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const idsToDelete = Array.from(selectedIds);

    // Optimistic update - remove immediately
    optimisticUpdate((prev) => prev.filter((a) => !idsToDelete.includes(a.id)));

    setBulkDeleteDialogOpen(false);
    clearSelection();
    setBulkLoading(true);

    try {
      const { error } = await supabase
        .from("fin_chart_accounts")
        .delete()
        .in("id", idsToDelete);

      if (error) throw error;

      toast.success(`${idsToDelete.length} conta(s) excluída(s)!`);
      // Success - optimistic update already applied, no refetch needed
    } catch (error: any) {
      toast.error("Erro: " + error.message);
      await refetch(); // Rollback on error
    } finally {
      setBulkLoading(false);
    }
  };

  // Single delete handler
  const handleDeleteSingle = async () => {
    if (!accountToDelete) return;

    const idToDelete = accountToDelete.id;

    // Optimistic update
    optimisticUpdate((prev) => prev.filter((a) => a.id !== idToDelete));

    setDeleteDialogOpen(false);
    setAccountToDelete(null);

    try {
      const { error } = await supabase
        .from("fin_chart_accounts")
        .delete()
        .eq("id", idToDelete);

      if (error) throw error;

      toast.success("Conta excluída!");
      // Success - optimistic update already applied, no refetch needed
    } catch (error: any) {
      toast.error("Erro: " + error.message);
      await refetch(); // Rollback on error
    }
  };

  const openDeleteDialog = (account: any) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
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

  const getFieldLabel = (field: BulkEditField) => {
    switch (field) {
      case "nature": return "Natureza";
      case "in_dre": return "DRE";
      case "in_cashflow": return "Fluxo de Caixa";
      case "active": return "Status";
      default: return "";
    }
  };

  const isAllSelected = accounts && accounts.length > 0 && selectedIds.size === accounts.length;
  const isSomeSelected = selectedIds.size > 0;

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
        {/* Bulk Actions Bar */}
        {isSomeSelected && (
          <div className="mb-4 p-3 bg-muted rounded-lg flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-normal">
                {selectedIds.size} selecionado(s)
              </Badge>
              <Button variant="ghost" size="sm" onClick={clearSelection} className="h-7 px-2">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground mr-2">Editar em massa:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openBulkEditDialog("nature")}
                className="h-8"
              >
                Natureza
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openBulkEditDialog("in_dre")}
                className="h-8"
              >
                DRE
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openBulkEditDialog("in_cashflow")}
                className="h-8"
              >
                Fluxo de Caixa
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openBulkEditDialog("active")}
                className="h-8"
              >
                Status
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteDialogOpen(true)}
                className="h-8 gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            </div>
          </div>
        )}

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
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Selecionar todos"
                  />
                </TableHead>
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
                <TableRow 
                  key={account.id}
                  className={cn(selectedIds.has(account.id) && "bg-muted/50")}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(account.id)}
                      onCheckedChange={(checked) => handleSelectOne(account.id, !!checked)}
                      aria-label={`Selecionar ${account.name}`}
                    />
                  </TableCell>
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
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(account)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openDeleteDialog(account)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit Dialog */}
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
              <Select value={form.parent_id || "none"} onValueChange={(v) => setForm({ ...form, parent_id: v === "none" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma (conta raiz)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (conta raiz)</SelectItem>
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

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditDialogOpen} onOpenChange={setBulkEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar {getFieldLabel(bulkEditField)} em Massa</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Alterando <strong>{selectedIds.size}</strong> conta(s) selecionada(s)
            </p>
            
            {bulkEditField === "nature" && (
              <div className="space-y-2">
                <Label>Nova Natureza</Label>
                <Select 
                  value={bulkEditValue as string} 
                  onValueChange={(v) => setBulkEditValue(v)}
                >
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
            )}

            {bulkEditField === "in_dre" && (
              <div className="space-y-2">
                <Label>Incluir no DRE</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Button
                    variant={bulkEditValue === true ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBulkEditValue(true)}
                  >
                    Sim
                  </Button>
                  <Button
                    variant={bulkEditValue === false ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBulkEditValue(false)}
                  >
                    Não
                  </Button>
                </div>
              </div>
            )}

            {bulkEditField === "in_cashflow" && (
              <div className="space-y-2">
                <Label>Incluir no Fluxo de Caixa</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Button
                    variant={bulkEditValue === true ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBulkEditValue(true)}
                  >
                    Sim
                  </Button>
                  <Button
                    variant={bulkEditValue === false ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBulkEditValue(false)}
                  >
                    Não
                  </Button>
                </div>
              </div>
            )}

            {bulkEditField === "active" && (
              <div className="space-y-2">
                <Label>Status da Conta</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Button
                    variant={bulkEditValue === true ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBulkEditValue(true)}
                  >
                    Ativa
                  </Button>
                  <Button
                    variant={bulkEditValue === false ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBulkEditValue(false)}
                  >
                    Inativa
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBulkEdit} disabled={bulkLoading}>
              {bulkLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Aplicar a {selectedIds.size} conta(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contas selecionadas?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir <strong>{selectedIds.size}</strong> conta(s) do plano de contas.
              Esta ação não pode ser desfeita e pode afetar lançamentos vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkLoading}
            >
              {bulkLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir {selectedIds.size} conta(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir a conta <strong>{accountToDelete?.code} - {accountToDelete?.name}</strong>.
              Esta ação não pode ser desfeita e pode afetar lançamentos vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSingle}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
