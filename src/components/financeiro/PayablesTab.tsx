import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, CreditCard, AlertTriangle, Clock, CheckCircle, ArrowDownCircle, Trash2, Edit, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreatePayableDialog } from "./CreatePayableDialog";
import { PayPayableDialog } from "./PayPayableDialog";
import { toast } from "sonner";
import { useFinanceiroSync } from "@/hooks/useFinanceiroSync";
import { bulkUpdatePayablesWithSync, bulkDeletePayablesWithSync } from "@/lib/financeiroIntegration";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface PayablesTabProps {
  filters: FinanceiroFiltersState;
}

type SortDirection = "asc" | "desc" | null;
type SortColumn = "due_date" | "supplier" | "description" | "category" | "amount" | "status" | null;

interface ColumnFilters {
  due_date: string;
  supplier: string;
  description: string;
  category: string;
  amount: string;
  status: string;
}

export function PayablesTab({ filters }: PayablesTabProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState({ status: "" });
  const { invalidatePayables } = useFinanceiroSync();

  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn>("due_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Column filters state
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
    due_date: "",
    supplier: "",
    description: "",
    category: "",
    amount: "",
    status: "",
  });

  const { data: payables, isLoading, refetch } = useQuery({
    queryKey: ["fin-payables", filters],
    queryFn: async () => {
      const dateFrom = format(filters.dateFrom, "yyyy-MM-dd");
      const dateTo = format(filters.dateTo, "yyyy-MM-dd");

      let query = supabase
        .from("fin_payables")
        .select(`
          *,
          supplier:suppliers(name),
          chart_account:fin_chart_accounts(name, code),
          bank_account:fin_bank_accounts(nickname)
        `)
        .gte("due_date", dateFrom)
        .lte("due_date", dateTo)
        .order("due_date", { ascending: true });

      if (filters.costCenterId) {
        query = query.eq("cost_center_id", filters.costCenterId);
      }
      if (filters.projectId) {
        query = query.eq("project_id", filters.projectId);
      }
      if (filters.search) {
        query = query.ilike("description", `%${filters.search}%`);
      }

      const { data } = await query;
      return data || [];
    },
  });

  // Fetch summary - includes PAGO
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["fin-payables-summary-tab"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_payables")
        .select("status, amount, paid_amount, due_date")
        .neq("status", "CANCELADO");

      const today = new Date();
      const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const in15Days = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);
      const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      const abertas = data?.filter(d => d.status === "ABERTO") || [];
      const vencidas = data?.filter(d => d.status === "VENCIDO") || [];
      const pagas = data?.filter(d => d.status === "PAGO") || [];

      return {
        abertasCount: abertas.length,
        abertasValor: abertas.reduce((sum, d) => sum + Number(d.amount) - Number(d.paid_amount || 0), 0),
        vencidasCount: vencidas.length,
        vencidasValor: vencidas.reduce((sum, d) => sum + Number(d.amount) - Number(d.paid_amount || 0), 0),
        pagasCount: pagas.length,
        pagasValor: pagas.reduce((sum, d) => sum + Number(d.amount), 0),
        aVencer7d: abertas.filter(d => new Date(d.due_date) <= in7Days).length,
        aVencer15d: abertas.filter(d => new Date(d.due_date) <= in15Days).length,
        aVencer30d: abertas.filter(d => new Date(d.due_date) <= in30Days).length,
      };
    },
  });

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    if (!payables) return [];

    let result = payables.filter((p) => {
      if (columnFilters.due_date && !format(new Date(p.due_date), "dd/MM/yyyy").includes(columnFilters.due_date)) return false;
      if (columnFilters.supplier && !(p.supplier?.name || "").toLowerCase().includes(columnFilters.supplier.toLowerCase())) return false;
      if (columnFilters.description && !(p.description || "").toLowerCase().includes(columnFilters.description.toLowerCase())) return false;
      if (columnFilters.category) {
        const catText = p.chart_account?.name || "";
        if (!catText.toLowerCase().includes(columnFilters.category.toLowerCase())) return false;
      }
      if (columnFilters.amount && !String(p.amount).includes(columnFilters.amount)) return false;
      if (columnFilters.status && p.status !== columnFilters.status) return false;
      return true;
    });

    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortColumn) {
          case "due_date":
            aVal = new Date(a.due_date).getTime();
            bVal = new Date(b.due_date).getTime();
            break;
          case "supplier":
            aVal = a.supplier?.name || "";
            bVal = b.supplier?.name || "";
            break;
          case "description":
            aVal = a.description || "";
            bVal = b.description || "";
            break;
          case "category":
            aVal = a.chart_account?.code || "";
            bVal = b.chart_account?.code || "";
            break;
          case "amount":
            aVal = Number(a.amount);
            bVal = Number(b.amount);
            break;
          case "status":
            aVal = a.status;
            bVal = b.status;
            break;
          default:
            return 0;
        }
        if (typeof aVal === "string") {
          return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      });
    }

    return result;
  }, [payables, columnFilters, sortColumn, sortDirection]);

  // Calculate KPIs from filtered data
  const kpis = filteredAndSortedData.reduce(
    (acc, p) => {
      const pendingAmount = Number(p.amount) - Number(p.paid_amount || 0);
      if (p.status === "ABERTO") {
        acc.aberto += pendingAmount;
        acc.abertoCount++;
      } else if (p.status === "VENCIDO") {
        acc.vencido += pendingAmount;
        acc.vencidoCount++;
      } else if (p.status === "PAGO") {
        acc.pago += Number(p.amount);
        acc.pagoCount++;
      }
      return acc;
    },
    { aberto: 0, abertoCount: 0, vencido: 0, vencidoCount: 0, pago: 0, pagoCount: 0 }
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ABERTO":
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Aberto</Badge>;
      case "VENCIDO":
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Vencido</Badge>;
      case "PAGO":
        return <Badge className="bg-green-600 gap-1"><CheckCircle className="h-3 w-3" /> Pago</Badge>;
      case "PARCIAL":
        return <Badge variant="secondary" className="gap-1">Parcial</Badge>;
      case "CANCELADO":
        return <Badge variant="outline" className="gap-1 text-muted-foreground">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handlePay = (payable: any) => {
    setSelectedPayable(payable);
    setPayDialogOpen(true);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedData.map(p => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") { setSortColumn(null); setSortDirection(null); }
      else setSortDirection("asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    if (sortDirection === "asc") return <ArrowUp className="h-3 w-3 ml-1" />;
    return <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const clearFilters = () => {
    setColumnFilters({ due_date: "", supplier: "", description: "", category: "", amount: "", status: "" });
  };

  const hasActiveFilters = Object.values(columnFilters).some(v => v !== "");

  const handleBulkEdit = async () => {
    if (!bulkEditForm.status) {
      toast.error("Selecione um status");
      return;
    }
    setBulkLoading(true);
    try {
      await bulkUpdatePayablesWithSync(Array.from(selectedIds), bulkEditForm.status);
      toast.success(`${selectedIds.size} contas atualizadas com sucesso`);
      setSelectedIds(new Set());
      setBulkEditOpen(false);
      setBulkEditForm({ status: "" });
      invalidatePayables();
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkLoading(true);
    try {
      await bulkDeletePayablesWithSync(Array.from(selectedIds));
      toast.success(`${selectedIds.size} contas excluídas com sucesso`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      invalidatePayables();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    } finally {
      setBulkLoading(false);
    }
  };

  const FilterPopover = ({ column, value, onChange, placeholder, options }: { column: string; value: string; onChange: (v: string) => void; placeholder: string; options?: string[] }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={`h-6 w-6 p-0 ${value ? "text-primary" : "opacity-50"}`}>
          <Filter className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        {options ? (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {options.map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-8"
          />
        )}
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-red-500" />
              Contas a Pagar - Resumo Global
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Em Aberto</span>
                  <span className="font-semibold">
                    {summary?.abertasCount || 0} títulos - R$ {(summary?.abertasValor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-red-600">
                  <span className="text-sm">Vencidas</span>
                  <span className="font-semibold">
                    {summary?.vencidasCount || 0} títulos - R$ {(summary?.vencidasValor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-green-600">
                  <span className="text-sm">Pagas</span>
                  <span className="font-semibold">
                    {summary?.pagasCount || 0} títulos - R$ {(summary?.pagasValor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    7d: {summary?.aVencer7d || 0}
                  </span>
                  <span>15d: {summary?.aVencer15d || 0}</span>
                  <span>30d: {summary?.aVencer30d || 0}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="flex items-center justify-center">
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Conta a Pagar
          </Button>
        </Card>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Em Aberto (Período)</p>
                <p className="text-xl font-bold text-yellow-600">{formatCurrency(kpis.aberto)}</p>
                <p className="text-xs text-muted-foreground">{kpis.abertoCount} títulos</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Vencidas (Período)</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(kpis.vencido)}</p>
                <p className="text-xs text-muted-foreground">{kpis.vencidoCount} títulos</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pagas no Período</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(kpis.pago)}</p>
                <p className="text-xs text-muted-foreground">{kpis.pagoCount} títulos</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size} selecionado(s)</span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => setBulkEditOpen(true)} className="gap-2">
            <Edit className="h-4 w-4" />
            Alterar Status
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Contas a Pagar ({filteredAndSortedData.length})
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-xs">
                <X className="h-3 w-3" />
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox 
                        checked={filteredAndSortedData.length > 0 && selectedIds.size === filteredAndSortedData.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("due_date")}>
                      <div className="flex items-center gap-1">
                        Vencimento {getSortIcon("due_date")}
                        <FilterPopover column="due_date" value={columnFilters.due_date} onChange={(v) => setColumnFilters(f => ({...f, due_date: v}))} placeholder="dd/mm/aaaa" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("supplier")}>
                      <div className="flex items-center gap-1">
                        Fornecedor {getSortIcon("supplier")}
                        <FilterPopover column="supplier" value={columnFilters.supplier} onChange={(v) => setColumnFilters(f => ({...f, supplier: v}))} placeholder="Buscar..." />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("description")}>
                      <div className="flex items-center gap-1">
                        Descrição {getSortIcon("description")}
                        <FilterPopover column="description" value={columnFilters.description} onChange={(v) => setColumnFilters(f => ({...f, description: v}))} placeholder="Buscar..." />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("category")}>
                      <div className="flex items-center gap-1">
                        Categoria {getSortIcon("category")}
                        <FilterPopover column="category" value={columnFilters.category} onChange={(v) => setColumnFilters(f => ({...f, category: v}))} placeholder="Buscar..." />
                      </div>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort("amount")}>
                      <div className="flex items-center justify-end gap-1">
                        Valor {getSortIcon("amount")}
                        <FilterPopover column="amount" value={columnFilters.amount} onChange={(v) => setColumnFilters(f => ({...f, amount: v}))} placeholder="Valor..." />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                      <div className="flex items-center gap-1">
                        Status {getSortIcon("status")}
                        <FilterPopover column="status" value={columnFilters.status} onChange={(v) => setColumnFilters(f => ({...f, status: v}))} placeholder="Status" options={["ABERTO", "VENCIDO", "PAGO", "PARCIAL", "CANCELADO"]} />
                      </div>
                    </TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Nenhuma conta a pagar encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedData.map((payable) => (
                      <TableRow key={payable.id} className={selectedIds.has(payable.id) ? "bg-muted/50" : ""}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedIds.has(payable.id)}
                            onCheckedChange={() => toggleSelect(payable.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {format(new Date(payable.due_date), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>{payable.supplier?.name || "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{payable.description || "-"}</TableCell>
                        <TableCell className="text-xs">
                          {payable.chart_account?.name || "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(payable.amount))}
                          {payable.paid_amount > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Pago: {formatCurrency(Number(payable.paid_amount))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(payable.status)}</TableCell>
                        <TableCell>
                          {payable.status !== "PAGO" && payable.status !== "CANCELADO" && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handlePay(payable)}
                            >
                              Pagar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreatePayableDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={refetch} />
      <PayPayableDialog 
        open={payDialogOpen} 
        onOpenChange={setPayDialogOpen} 
        payable={selectedPayable}
        onSuccess={refetch}
      />

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status em Massa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Você está alterando o status de <strong>{selectedIds.size}</strong> conta(s) a pagar.
            </p>
            <div className="space-y-2">
              <Label>Novo Status</Label>
              <Select value={bulkEditForm.status} onValueChange={(v) => setBulkEditForm({ status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABERTO">Aberto</SelectItem>
                  <SelectItem value="VENCIDO">Vencido</SelectItem>
                  <SelectItem value="PAGO">Pago</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleBulkEdit} disabled={bulkLoading}>
              {bulkLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir <strong>{selectedIds.size}</strong> conta(s) a pagar.
              Os lançamentos vinculados serão marcados como cancelados mas não serão excluídos.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={bulkLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {bulkLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
