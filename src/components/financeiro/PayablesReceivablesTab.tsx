import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinanceiroFiltersState } from "./FinanceiroFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Plus, CreditCard, Receipt, AlertTriangle, Clock, CheckCircle, ArrowDownCircle, ArrowUpCircle, Landmark, TrendingUp, TrendingDown, ArrowUpDown, ArrowUp, ArrowDown, Filter, X, Edit, Trash2, Loader2, Eye, Undo2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseDateLocal } from "@/lib/utils";
import { CreatePayableDialog } from "./CreatePayableDialog";
import { PayPayableDialog } from "./PayPayableDialog";
import { CreateReceivableDialog } from "./CreateReceivableDialog";
import { ReceivePaymentDialog } from "./ReceivePaymentDialog";
import { ViewEditPayableDialog } from "./ViewEditPayableDialog";
import { ViewEditReceivableDialog } from "./ViewEditReceivableDialog";
import { toast } from "sonner";
import { useFinanceiroSync } from "@/hooks/useFinanceiroSync";
import { bulkUpdatePayablesWithSync, bulkDeletePayablesWithSync, bulkUpdateReceivablesWithSync, bulkDeleteReceivablesWithSync } from "@/lib/financeiroIntegration";
import { DrillDownEntriesDialog, DrillDownFilter } from "./DrillDownEntriesDialog";

interface PayablesReceivablesTabProps {
  filters: FinanceiroFiltersState;
}

type ViewType = "all" | "payables" | "receivables";
type SortDirection = "asc" | "desc" | null;
type PayableSortColumn = "due_date" | "supplier" | "description" | "category" | "amount" | "status" | null;
type ReceivableSortColumn = "due_date" | "customer" | "description" | "category" | "amount" | "status" | null;

interface PayableColumnFilters {
  due_date: string;
  supplier: string;
  description: string;
  category: string;
  amount: string;
  status: string;
}

interface ReceivableColumnFilters {
  due_date: string;
  customer: string;
  description: string;
  category: string;
  amount: string;
  status: string;
}

export function PayablesReceivablesTab({ filters }: PayablesReceivablesTabProps) {
  const [viewType, setViewType] = useState<ViewType>("all");
  const [createPayableOpen, setCreatePayableOpen] = useState(false);
  const [createReceivableOpen, setCreateReceivableOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<any>(null);
  const [selectedReceivable, setSelectedReceivable] = useState<any>(null);
  const { invalidatePayables, invalidateReceivables } = useFinanceiroSync();

  // View/Edit dialog states
  const [viewEditPayableOpen, setViewEditPayableOpen] = useState(false);
  const [viewEditPayableMode, setViewEditPayableMode] = useState<"view" | "edit">("view");
  const [viewEditReceivableOpen, setViewEditReceivableOpen] = useState(false);
  const [viewEditReceivableMode, setViewEditReceivableMode] = useState<"view" | "edit">("view");

  // Payables selection and sorting
  const [selectedPayableIds, setSelectedPayableIds] = useState<Set<string>>(new Set());
  const [payableSortColumn, setPayableSortColumn] = useState<PayableSortColumn>("due_date");
  const [payableSortDirection, setPayableSortDirection] = useState<SortDirection>("asc");
  const [payableColumnFilters, setPayableColumnFilters] = useState<PayableColumnFilters>({
    due_date: "", supplier: "", description: "", category: "", amount: "", status: ""
  });
  const [payableBulkEditOpen, setPayableBulkEditOpen] = useState(false);
  const [payableBulkDeleteOpen, setPayableBulkDeleteOpen] = useState(false);
  const [payableBulkLoading, setPayableBulkLoading] = useState(false);
  const [payableBulkEditForm, setPayableBulkEditForm] = useState({ status: "" });

  // Receivables selection and sorting
  const [selectedReceivableIds, setSelectedReceivableIds] = useState<Set<string>>(new Set());
  const [receivableSortColumn, setReceivableSortColumn] = useState<ReceivableSortColumn>("due_date");
  const [receivableSortDirection, setReceivableSortDirection] = useState<SortDirection>("asc");
  const [receivableColumnFilters, setReceivableColumnFilters] = useState<ReceivableColumnFilters>({
    due_date: "", customer: "", description: "", category: "", amount: "", status: ""
  });
  const [receivableBulkEditOpen, setReceivableBulkEditOpen] = useState(false);
  const [receivableBulkDeleteOpen, setReceivableBulkDeleteOpen] = useState(false);
  const [receivableBulkLoading, setReceivableBulkLoading] = useState(false);
  const [receivableBulkEditForm, setReceivableBulkEditForm] = useState({ status: "" });
  const [drillDown, setDrillDown] = useState<DrillDownFilter | null>(null);

  const dfFrom = filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : "2000-01-01";
  const dfTo = filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : "2099-12-31";

  // Fetch Payables
  const { data: payables, isLoading: payablesLoading, refetch: refetchPayables } = useQuery({
    queryKey: ["fin-payables", filters],
    queryFn: async () => {
      let query = supabase
        .from("fin_payables")
        .select(`
          *,
          supplier:suppliers(name),
          chart_account:fin_chart_accounts(name, code),
          bank_account:fin_bank_accounts(nickname)
        `)
        .or(`and(due_date.gte.${dfFrom},due_date.lte.${dfTo}),and(competence_date.gte.${dfFrom},competence_date.lte.${dfTo})`);

      // Apply sorting from global filters
      if (filters.sortField === "date") {
        query = query.order("due_date", { ascending: filters.sortDirection === "asc" });
      } else if (filters.sortField === "value") {
        query = query.order("amount", { ascending: filters.sortDirection === "asc" });
      } else {
        query = query.order("due_date", { ascending: true });
      }

      if (filters.costCenterId) {
        query = query.eq("cost_center_id", filters.costCenterId);
      }
      if (filters.projectId) {
        query = query.eq("project_id", filters.projectId);
      }
      // Subcategoria tem prioridade sobre categoria
      if (filters.subcategoryId) {
        query = query.eq("chart_account_id", filters.subcategoryId);
      } else if (filters.categoryId) {
        query = query.eq("chart_account_id", filters.categoryId);
      }
      if (filters.search) {
        query = query.ilike("description", `%${filters.search}%`);
      }

      const { data } = await query;
      return data || [];
    },
  });

  // Fetch Receivables
  const { data: receivables, isLoading: receivablesLoading, refetch: refetchReceivables } = useQuery({
    queryKey: ["fin-receivables", filters],
    queryFn: async () => {
      let query = supabase
        .from("fin_receivables")
        .select(`
          *,
          customer:clients(name),
          chart_account:fin_chart_accounts(name, code),
          bank_account:fin_bank_accounts(nickname)
        `)
        .or(`and(due_date.gte.${dfFrom},due_date.lte.${dfTo}),and(competence_date.gte.${dfFrom},competence_date.lte.${dfTo})`);

      // Apply sorting from global filters
      if (filters.sortField === "date") {
        query = query.order("due_date", { ascending: filters.sortDirection === "asc" });
      } else if (filters.sortField === "value") {
        query = query.order("amount", { ascending: filters.sortDirection === "asc" });
      } else {
        query = query.order("due_date", { ascending: true });
      }

      if (filters.costCenterId) {
        query = query.eq("cost_center_id", filters.costCenterId);
      }
      if (filters.projectId) {
        query = query.eq("project_id", filters.projectId);
      }
      // Subcategoria tem prioridade sobre categoria
      if (filters.subcategoryId) {
        query = query.eq("chart_account_id", filters.subcategoryId);
      } else if (filters.categoryId) {
        query = query.eq("chart_account_id", filters.categoryId);
      }
      if (filters.search) {
        query = query.ilike("description", `%${filters.search}%`);
      }

      const { data } = await query;
      return data || [];
    },
  });

  // Fetch Payables Summary with 7d, 15d, 30d
  const { data: payablesSummary, isLoading: payablesSummaryLoading } = useQuery({
    queryKey: ["fin-payables-summary-unified"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_payables")
        .select("status, amount, paid_amount, due_date, payment_date")
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
        pagasValor: pagas.reduce((sum, d) => sum + Number(d.paid_amount || d.amount), 0),
        aVencer7d: abertas.filter(d => parseDateLocal(d.due_date) <= in7Days).length,
        aVencer15d: abertas.filter(d => parseDateLocal(d.due_date) <= in15Days).length,
        aVencer30d: abertas.filter(d => parseDateLocal(d.due_date) <= in30Days).length,
      };
    },
  });

  // Fetch Receivables Summary with 7d, 15d, 30d
  const { data: receivablesSummary, isLoading: receivablesSummaryLoading } = useQuery({
    queryKey: ["fin-receivables-summary-unified"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fin_receivables")
        .select("status, amount, received_amount, due_date")
        .neq("status", "CANCELADO");

      const today = new Date();
      const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const in15Days = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);
      const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      const abertas = data?.filter(d => d.status === "ABERTO") || [];
      const vencidas = data?.filter(d => d.status === "VENCIDO") || [];
      const recebidas = data?.filter(d => d.status === "RECEBIDO") || [];

      return {
        abertasCount: abertas.length,
        abertasValor: abertas.reduce((sum, d) => sum + Number(d.amount) - Number(d.received_amount || 0), 0),
        vencidasCount: vencidas.length,
        vencidasValor: vencidas.reduce((sum, d) => sum + Number(d.amount) - Number(d.received_amount || 0), 0),
        recebidasCount: recebidas.length,
        recebidasValor: recebidas.reduce((sum, d) => sum + Number(d.received_amount || d.amount), 0),
        aVencer7d: abertas.filter(d => parseDateLocal(d.due_date) <= in7Days).length,
        aVencer15d: abertas.filter(d => parseDateLocal(d.due_date) <= in15Days).length,
        aVencer30d: abertas.filter(d => parseDateLocal(d.due_date) <= in30Days).length,
      };
    },
  });

  // Fetch Unified Bank Balance
  const { data: bankBalance, isLoading: bankBalanceLoading } = useQuery({
    queryKey: ["fin-bank-balance-unified"],
    queryFn: async () => {
      const { data: accounts } = await supabase
        .from("fin_bank_accounts")
        .select("id, nickname, opening_balance, opening_balance_date")
        .eq("active", true);

      const { data: entries } = await supabase
        .from("fin_ledger_entries")
        .select("bank_account_id, type, amount, status, cash_date")
        .neq("status", "CANCELADO")
        .not("cash_date", "is", null);

      let totalSaldoInicial = 0;
      let totalEntradas = 0;
      let totalSaidas = 0;

      accounts?.forEach(account => {
        totalSaldoInicial += Number(account.opening_balance || 0);
        
        const accountEntries = entries?.filter(e => e.bank_account_id === account.id) || [];
        accountEntries.forEach(entry => {
          if (entry.type === "RECEITA") {
            totalEntradas += Number(entry.amount);
          } else if (entry.type === "DESPESA") {
            totalSaidas += Number(entry.amount);
          }
        });
      });

      const saldoAtual = totalSaldoInicial + totalEntradas - totalSaidas;

      return {
        saldoInicial: totalSaldoInicial,
        entradas: totalEntradas,
        saidas: totalSaidas,
        saldoAtual,
        contasAtivas: accounts?.length || 0,
      };
    },
  });

  // Filtered and sorted payables
  const filteredPayables = useMemo(() => {
    if (!payables) return [];

    let result = payables.filter((p) => {
      if (payableColumnFilters.due_date && !format(parseDateLocal(p.due_date), "dd/MM/yyyy").includes(payableColumnFilters.due_date)) return false;
      if (payableColumnFilters.supplier && !(p.supplier?.name || "").toLowerCase().includes(payableColumnFilters.supplier.toLowerCase())) return false;
      if (payableColumnFilters.description && !(p.description || "").toLowerCase().includes(payableColumnFilters.description.toLowerCase())) return false;
      if (payableColumnFilters.category) {
        const catText = p.chart_account?.name || "";
        if (!catText.toLowerCase().includes(payableColumnFilters.category.toLowerCase())) return false;
      }
      if (payableColumnFilters.amount && !String(p.amount).includes(payableColumnFilters.amount)) return false;
      if (payableColumnFilters.status && p.status !== payableColumnFilters.status) return false;
      return true;
    });

    if (payableSortColumn && payableSortDirection) {
      result.sort((a, b) => {
        let aVal: any, bVal: any;
        switch (payableSortColumn) {
          case "due_date": aVal = parseDateLocal(a.due_date).getTime(); bVal = parseDateLocal(b.due_date).getTime(); break;
          case "supplier": aVal = a.supplier?.name || ""; bVal = b.supplier?.name || ""; break;
          case "description": aVal = a.description || ""; bVal = b.description || ""; break;
          case "category": aVal = a.chart_account?.name || ""; bVal = b.chart_account?.name || ""; break;
          case "amount": aVal = Number(a.amount); bVal = Number(b.amount); break;
          case "status": aVal = a.status; bVal = b.status; break;
          default: return 0;
        }
        if (typeof aVal === "string") return payableSortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        return payableSortDirection === "asc" ? aVal - bVal : bVal - aVal;
      });
    }

    return result;
  }, [payables, payableColumnFilters, payableSortColumn, payableSortDirection]);

  // Filtered and sorted receivables
  const filteredReceivables = useMemo(() => {
    if (!receivables) return [];

    let result = receivables.filter((r) => {
      if (receivableColumnFilters.due_date && !format(parseDateLocal(r.due_date), "dd/MM/yyyy").includes(receivableColumnFilters.due_date)) return false;
      if (receivableColumnFilters.customer && !(r.customer?.name || "").toLowerCase().includes(receivableColumnFilters.customer.toLowerCase())) return false;
      if (receivableColumnFilters.description && !(r.description || "").toLowerCase().includes(receivableColumnFilters.description.toLowerCase())) return false;
      if (receivableColumnFilters.category) {
        const catText = r.chart_account?.name || "";
        if (!catText.toLowerCase().includes(receivableColumnFilters.category.toLowerCase())) return false;
      }
      if (receivableColumnFilters.amount && !String(r.amount).includes(receivableColumnFilters.amount)) return false;
      if (receivableColumnFilters.status && r.status !== receivableColumnFilters.status) return false;
      return true;
    });

    if (receivableSortColumn && receivableSortDirection) {
      result.sort((a, b) => {
        let aVal: any, bVal: any;
        switch (receivableSortColumn) {
          case "due_date": aVal = parseDateLocal(a.due_date).getTime(); bVal = parseDateLocal(b.due_date).getTime(); break;
          case "customer": aVal = a.customer?.name || ""; bVal = b.customer?.name || ""; break;
          case "description": aVal = a.description || ""; bVal = b.description || ""; break;
          case "category": aVal = a.chart_account?.name || ""; bVal = b.chart_account?.name || ""; break;
          case "amount": aVal = Number(a.amount); bVal = Number(b.amount); break;
          case "status": aVal = a.status; bVal = b.status; break;
          default: return 0;
        }
        if (typeof aVal === "string") return receivableSortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        return receivableSortDirection === "asc" ? aVal - bVal : bVal - aVal;
      });
    }

    return result;
  }, [receivables, receivableColumnFilters, receivableSortColumn, receivableSortDirection]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const getPayableStatusBadge = (status: string) => {
    switch (status) {
      case "ABERTO": return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Aberto</Badge>;
      case "PROVISIONADO": return <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400"><Clock className="h-3 w-3" /> Provisionado</Badge>;
      case "CONFIRMADO": return <Badge variant="outline" className="gap-1 border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-400"><CheckCircle className="h-3 w-3" /> Confirmado</Badge>;
      case "VENCIDO": return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Vencido</Badge>;
      case "PARCIALMENTE_PAGO": return <Badge variant="secondary" className="gap-1 border-orange-300 bg-orange-50 text-orange-700">Parcial</Badge>;
      case "PAGO": return <Badge className="bg-green-600 gap-1"><CheckCircle className="h-3 w-3" /> Pago</Badge>;
      case "CONCILIADO": return <Badge className="bg-emerald-700 gap-1"><CheckCircle className="h-3 w-3" /> Conciliado</Badge>;
      case "EM_DISPUTA": return <Badge variant="secondary" className="gap-1 border-red-300 bg-red-50 text-red-700">Em Disputa</Badge>;
      case "RENEGOCIADO": return <Badge variant="secondary" className="gap-1 border-purple-300 bg-purple-50 text-purple-700">Renegociado</Badge>;
      case "CANCELADO": return <Badge className="bg-gray-500 gap-1">Cancelado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReceivableStatusBadge = (status: string) => {
    switch (status) {
      case "ABERTO": return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Aberto</Badge>;
      case "PROVISIONADO": return <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400"><Clock className="h-3 w-3" /> Provisionado</Badge>;
      case "CONFIRMADO": return <Badge variant="outline" className="gap-1 border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-400"><CheckCircle className="h-3 w-3" /> Confirmado</Badge>;
      case "VENCIDO": return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Vencido</Badge>;
      case "PARCIALMENTE_RECEBIDO": return <Badge variant="secondary" className="gap-1 border-orange-300 bg-orange-50 text-orange-700">Parcial</Badge>;
      case "RECEBIDO": return <Badge className="bg-green-600 gap-1"><CheckCircle className="h-3 w-3" /> Recebido</Badge>;
      case "CONCILIADO": return <Badge className="bg-emerald-700 gap-1"><CheckCircle className="h-3 w-3" /> Conciliado</Badge>;
      case "EM_DISPUTA": return <Badge variant="secondary" className="gap-1 border-red-300 bg-red-50 text-red-700">Em Disputa</Badge>;
      case "RENEGOCIADO": return <Badge variant="secondary" className="gap-1 border-purple-300 bg-purple-50 text-purple-700">Renegociado</Badge>;
      case "CANCELADO": return <Badge className="bg-gray-500 gap-1">Cancelado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handlePay = (payable: any) => { setSelectedPayable(payable); setPayDialogOpen(true); };
  const handleReceive = (receivable: any) => { setSelectedReceivable(receivable); setReceiveDialogOpen(true); };
  const handleViewPayable = (payable: any) => { setSelectedPayable(payable); setViewEditPayableMode("view"); setViewEditPayableOpen(true); };
  const handleEditPayable = (payable: any) => { setSelectedPayable(payable); setViewEditPayableMode("edit"); setViewEditPayableOpen(true); };
  const handleViewReceivable = (receivable: any) => { setSelectedReceivable(receivable); setViewEditReceivableMode("view"); setViewEditReceivableOpen(true); };
  const handleEditReceivable = (receivable: any) => { setSelectedReceivable(receivable); setViewEditReceivableMode("edit"); setViewEditReceivableOpen(true); };

  const handleReopenPayable = async (payable: any) => {
    try {
      // Revert payable status to ABERTO and clear paid_amount/paid_at
      const { error: payableError } = await supabase
        .from("fin_payables")
        .update({ status: "ABERTO", paid_amount: 0, payment_date: null, reconciled: false })
        .eq("id", payable.id);
      if (payableError) throw payableError;

      // Revert linked ledger entry status
      if (payable.ledger_entry_id) {
        await supabase
          .from("fin_ledger_entries")
          .update({ status: "ABERTO", cash_date: null, reconciled: false })
          .eq("id", payable.ledger_entry_id);
      }

      toast.success("Conta reaberta com sucesso");
      refetchPayables();
    } catch (err) {
      toast.error("Erro ao reabrir conta");
    }
  };

  const handleReopenReceivable = async (receivable: any) => {
    try {
      const { error: receivableError } = await supabase
        .from("fin_receivables")
        .update({ status: "ABERTO", received_amount: 0, reconciled: false })
        .eq("id", receivable.id);
      if (receivableError) throw receivableError;

      if (receivable.ledger_entry_id) {
        await supabase
          .from("fin_ledger_entries")
          .update({ status: "ABERTO", cash_date: null, reconciled: false })
          .eq("id", receivable.ledger_entry_id);
      }

      toast.success("Conta reaberta com sucesso");
      refetchReceivables();
    } catch (err) {
      toast.error("Erro ao reabrir conta");
    }
  };

  // Payable selection handlers
  const togglePayableSelectAll = () => {
    if (selectedPayableIds.size === filteredPayables.length) {
      setSelectedPayableIds(new Set());
    } else {
      setSelectedPayableIds(new Set(filteredPayables.map(p => p.id)));
    }
  };

  const togglePayableSelect = (id: string) => {
    const newSelected = new Set(selectedPayableIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedPayableIds(newSelected);
  };

  // Receivable selection handlers
  const toggleReceivableSelectAll = () => {
    if (selectedReceivableIds.size === filteredReceivables.length) {
      setSelectedReceivableIds(new Set());
    } else {
      setSelectedReceivableIds(new Set(filteredReceivables.map(r => r.id)));
    }
  };

  const toggleReceivableSelect = (id: string) => {
    const newSelected = new Set(selectedReceivableIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedReceivableIds(newSelected);
  };

  // Sort handlers
  const handlePayableSort = (column: PayableSortColumn) => {
    if (payableSortColumn === column) {
      if (payableSortDirection === "asc") setPayableSortDirection("desc");
      else if (payableSortDirection === "desc") { setPayableSortColumn(null); setPayableSortDirection(null); }
      else setPayableSortDirection("asc");
    } else {
      setPayableSortColumn(column);
      setPayableSortDirection("asc");
    }
  };

  const handleReceivableSort = (column: ReceivableSortColumn) => {
    if (receivableSortColumn === column) {
      if (receivableSortDirection === "asc") setReceivableSortDirection("desc");
      else if (receivableSortDirection === "desc") { setReceivableSortColumn(null); setReceivableSortDirection(null); }
      else setReceivableSortDirection("asc");
    } else {
      setReceivableSortColumn(column);
      setReceivableSortDirection("asc");
    }
  };

  const getPayableSortIcon = (column: PayableSortColumn) => {
    if (payableSortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    if (payableSortDirection === "asc") return <ArrowUp className="h-3 w-3 ml-1" />;
    return <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const getReceivableSortIcon = (column: ReceivableSortColumn) => {
    if (receivableSortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    if (receivableSortDirection === "asc") return <ArrowUp className="h-3 w-3 ml-1" />;
    return <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const hasActivePayableFilters = Object.values(payableColumnFilters).some(v => v !== "");
  const hasActiveReceivableFilters = Object.values(receivableColumnFilters).some(v => v !== "");

  const clearPayableFilters = () => setPayableColumnFilters({ due_date: "", supplier: "", description: "", category: "", amount: "", status: "" });
  const clearReceivableFilters = () => setReceivableColumnFilters({ due_date: "", customer: "", description: "", category: "", amount: "", status: "" });

  // Bulk action handlers
  const handlePayableBulkEdit = async () => {
    if (!payableBulkEditForm.status) { toast.error("Selecione um status"); return; }
    setPayableBulkLoading(true);
    try {
      await bulkUpdatePayablesWithSync(Array.from(selectedPayableIds), payableBulkEditForm.status);
      toast.success(`${selectedPayableIds.size} contas atualizadas`);
      setSelectedPayableIds(new Set());
      setPayableBulkEditOpen(false);
      setPayableBulkEditForm({ status: "" });
      invalidatePayables();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setPayableBulkLoading(false);
    }
  };

  const handlePayableBulkDelete = async () => {
    setPayableBulkLoading(true);
    try {
      await bulkDeletePayablesWithSync(Array.from(selectedPayableIds));
      toast.success(`${selectedPayableIds.size} contas excluídas`);
      setSelectedPayableIds(new Set());
      setPayableBulkDeleteOpen(false);
      invalidatePayables();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setPayableBulkLoading(false);
    }
  };

  const handleReceivableBulkEdit = async () => {
    if (!receivableBulkEditForm.status) { toast.error("Selecione um status"); return; }
    setReceivableBulkLoading(true);
    try {
      await bulkUpdateReceivablesWithSync(Array.from(selectedReceivableIds), receivableBulkEditForm.status);
      toast.success(`${selectedReceivableIds.size} contas atualizadas`);
      setSelectedReceivableIds(new Set());
      setReceivableBulkEditOpen(false);
      setReceivableBulkEditForm({ status: "" });
      invalidateReceivables();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setReceivableBulkLoading(false);
    }
  };

  const handleReceivableBulkDelete = async () => {
    setReceivableBulkLoading(true);
    try {
      await bulkDeleteReceivablesWithSync(Array.from(selectedReceivableIds));
      toast.success(`${selectedReceivableIds.size} contas excluídas`);
      setSelectedReceivableIds(new Set());
      setReceivableBulkDeleteOpen(false);
      invalidateReceivables();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setReceivableBulkLoading(false);
    }
  };

  const FilterPopover = ({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options?: string[] }) => {
    const handleSelectChange = (val: string) => {
      onChange(val === "__all__" ? "" : val);
    };
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className={`h-5 w-5 p-0 ${value ? "text-primary" : "opacity-50"}`} onClick={(e) => e.stopPropagation()}>
            <Filter className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start" onClick={(e) => e.stopPropagation()}>
          {options ? (
            <Select value={value || "__all__"} onValueChange={handleSelectChange}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="h-8" />
          )}
        </PopoverContent>
      </Popover>
    );
  };

  const showPayables = viewType === "all" || viewType === "payables";
  const showReceivables = viewType === "all" || viewType === "receivables";

  return (
    <div className="space-y-4">
      {/* View Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Tabs value={viewType} onValueChange={(v) => setViewType(v as ViewType)}>
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="all" className="text-xs sm:text-sm px-2 sm:px-3">Todas</TabsTrigger>
            <TabsTrigger value="payables" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <ArrowDownCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
              <span className="hidden xs:inline">A Pagar</span>
              <span className="xs:hidden">Pagar</span>
            </TabsTrigger>
            <TabsTrigger value="receivables" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <ArrowUpCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
              <span className="hidden xs:inline">A Receber</span>
              <span className="xs:hidden">Receber</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={() => setCreatePayableOpen(true)} variant="outline" size="sm" className="gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm">
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Conta a</span> Pagar
          </Button>
          <Button onClick={() => setCreateReceivableOpen(true)} size="sm" className="gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm">
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Conta a</span> Receber
          </Button>
        </div>
      </div>

      {/* Bank Balance Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-4">
          {bankBalanceLoading ? (
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-8 w-32" />
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Landmark className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saldo Consolidado ({bankBalance?.contasAtivas || 0} contas)</p>
                  <p className={`text-2xl font-bold ${(bankBalance?.saldoAtual || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(bankBalance?.saldoAtual || 0)}
                  </p>
                </div>
              </div>
              <div className="flex gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-muted-foreground text-xs">Total Entradas</p>
                    <p className="font-semibold text-green-600">{formatCurrency(bankBalance?.entradas || 0)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-muted-foreground text-xs">Total Saídas</p>
                    <p className="font-semibold text-red-600">{formatCurrency(bankBalance?.saidas || 0)}</p>
                  </div>
                </div>
                <div className="border-l pl-6">
                  <p className="text-muted-foreground text-xs">Saldo Inicial</p>
                  <p className="font-semibold">{formatCurrency(bankBalance?.saldoInicial || 0)}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className={!showReceivables ? "opacity-50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-green-500" />
              Contas a Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            {receivablesSummaryLoading ? (
              <div className="space-y-2"><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-24" /></div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => setDrillDown({ type: "receivables", statusFilter: "open", title: "Contas a Receber - Em Aberto" })}
                  className="flex items-center justify-between w-full rounded px-1 py-0.5 -mx-1 hover:bg-muted/80 cursor-pointer transition-colors"
                >
                  <span className="text-muted-foreground text-sm">Em Aberto</span>
                  <span className="font-semibold">{receivablesSummary?.abertasCount || 0} lançamentos - {formatCurrency(receivablesSummary?.abertasValor || 0)}</span>
                </button>
                <button
                  onClick={() => setDrillDown({ type: "receivables", statusFilter: "overdue", title: "Recebimentos em Atraso" })}
                  className="flex items-center justify-between w-full rounded px-1 py-0.5 -mx-1 hover:bg-muted/80 cursor-pointer transition-colors text-red-600"
                >
                  <span className="text-sm">Em Atraso</span>
                  <span className="font-semibold">{receivablesSummary?.vencidasCount || 0} lançamentos - {formatCurrency(receivablesSummary?.vencidasValor || 0)}</span>
                </button>
                <button
                  onClick={() => setDrillDown({ type: "receivables", statusFilter: "paid", title: "Contas a Receber - Recebidas" })}
                  className="flex items-center justify-between w-full rounded px-1 py-0.5 -mx-1 hover:bg-muted/80 cursor-pointer transition-colors text-green-600"
                >
                  <span className="text-sm">Recebidas</span>
                  <span className="font-semibold">{receivablesSummary?.recebidasCount || 0} lançamentos - {formatCurrency(receivablesSummary?.recebidasValor || 0)}</span>
                </button>
                <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />7d: {receivablesSummary?.aVencer7d || 0}</span>
                  <span>15d: {receivablesSummary?.aVencer15d || 0}</span>
                  <span>30d: {receivablesSummary?.aVencer30d || 0}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={!showPayables ? "opacity-50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-red-500" />
              Contas a Pagar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payablesSummaryLoading ? (
              <div className="space-y-2"><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-24" /></div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => setDrillDown({ type: "payables", statusFilter: "open", title: "Contas a Pagar - Em Aberto" })}
                  className="flex items-center justify-between w-full rounded px-1 py-0.5 -mx-1 hover:bg-muted/80 cursor-pointer transition-colors"
                >
                  <span className="text-muted-foreground text-sm">Em Aberto</span>
                  <span className="font-semibold">{payablesSummary?.abertasCount || 0} lançamentos - {formatCurrency(payablesSummary?.abertasValor || 0)}</span>
                </button>
                <button
                  onClick={() => setDrillDown({ type: "payables", statusFilter: "overdue", title: "Contas a Pagar - Vencidas" })}
                  className="flex items-center justify-between w-full rounded px-1 py-0.5 -mx-1 hover:bg-muted/80 cursor-pointer transition-colors text-red-600"
                >
                  <span className="text-sm">Vencidas</span>
                  <span className="font-semibold">{payablesSummary?.vencidasCount || 0} lançamentos - {formatCurrency(payablesSummary?.vencidasValor || 0)}</span>
                </button>
                <button
                  onClick={() => setDrillDown({ type: "payables", statusFilter: "paid", title: "Contas a Pagar - Pagas" })}
                  className="flex items-center justify-between w-full rounded px-1 py-0.5 -mx-1 hover:bg-muted/80 cursor-pointer transition-colors text-blue-600"
                >
                  <span className="text-sm">Pagas</span>
                  <span className="font-semibold">{payablesSummary?.pagasCount || 0} lançamentos - {formatCurrency(payablesSummary?.pagasValor || 0)}</span>
                </button>
                <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />7d: {payablesSummary?.aVencer7d || 0}</span>
                  <span>15d: {payablesSummary?.aVencer15d || 0}</span>
                  <span>30d: {payablesSummary?.aVencer30d || 0}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payables Bulk Actions */}
      {showPayables && selectedPayableIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">{selectedPayableIds.size} conta(s) a pagar selecionada(s)</span>
          <span className="text-sm font-semibold text-primary">
            Total: {filteredPayables
              .filter(p => selectedPayableIds.has(p.id))
              .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
              .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => setPayableBulkEditOpen(true)} className="gap-1">
            <Edit className="h-4 w-4" /> Editar Status
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setPayableBulkDeleteOpen(true)} className="gap-1">
            <Trash2 className="h-4 w-4" /> Excluir
          </Button>
        </div>
      )}

      {/* Payables Table */}
      {showPayables && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-red-500" />
                Contas a Pagar ({filteredPayables.length})
              </CardTitle>
              {hasActivePayableFilters && (
                <Button variant="ghost" size="sm" onClick={clearPayableFilters} className="gap-1 text-xs">
                  <X className="h-3 w-3" /> Limpar Filtros
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {payablesLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox checked={filteredPayables.length > 0 && selectedPayableIds.size === filteredPayables.length} onCheckedChange={togglePayableSelectAll} />
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handlePayableSort("due_date")}>
                        <div className="flex items-center gap-1">Vencimento {getPayableSortIcon("due_date")}
                          <FilterPopover value={payableColumnFilters.due_date} onChange={(v) => setPayableColumnFilters(f => ({...f, due_date: v}))} placeholder="dd/mm/aaaa" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handlePayableSort("supplier")}>
                        <div className="flex items-center gap-1">Fornecedor {getPayableSortIcon("supplier")}
                          <FilterPopover value={payableColumnFilters.supplier} onChange={(v) => setPayableColumnFilters(f => ({...f, supplier: v}))} placeholder="Buscar..." />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50 hidden md:table-cell" onClick={() => handlePayableSort("description")}>
                        <div className="flex items-center gap-1">Descrição {getPayableSortIcon("description")}
                          <FilterPopover value={payableColumnFilters.description} onChange={(v) => setPayableColumnFilters(f => ({...f, description: v}))} placeholder="Buscar..." />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50 hidden lg:table-cell" onClick={() => handlePayableSort("category")}>
                        <div className="flex items-center gap-1">Categoria {getPayableSortIcon("category")}
                          <FilterPopover value={payableColumnFilters.category} onChange={(v) => setPayableColumnFilters(f => ({...f, category: v}))} placeholder="Buscar..." />
                        </div>
                      </TableHead>
                      <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handlePayableSort("amount")}>
                        <div className="flex items-center justify-end gap-1">Valor {getPayableSortIcon("amount")}
                          <FilterPopover value={payableColumnFilters.amount} onChange={(v) => setPayableColumnFilters(f => ({...f, amount: v}))} placeholder="Valor..." />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handlePayableSort("status")}>
                        <div className="flex items-center gap-1">Status {getPayableSortIcon("status")}
                          <FilterPopover value={payableColumnFilters.status} onChange={(v) => setPayableColumnFilters(f => ({...f, status: v}))} placeholder="Status" options={["ABERTO", "VENCIDO", "PAGO", "PARCIAL", "CANCELADO"]} />
                        </div>
                      </TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayables.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8 text-sm">Nenhuma conta a pagar encontrada</TableCell></TableRow>
                    ) : (
                      filteredPayables.map((payable) => (
                        <TableRow key={payable.id} className={selectedPayableIds.has(payable.id) ? "bg-muted/50" : ""}>
                          <TableCell><Checkbox checked={selectedPayableIds.has(payable.id)} onCheckedChange={() => togglePayableSelect(payable.id)} /></TableCell>
                          <TableCell className="font-medium text-xs sm:text-sm">{format(parseDateLocal(payable.due_date), "dd/MM/yy", { locale: ptBR })}</TableCell>
                          <TableCell className="text-xs sm:text-sm max-w-[120px] truncate">{payable.supplier?.name || "-"}</TableCell>
                          <TableCell className="text-xs sm:text-sm max-w-[150px] truncate hidden md:table-cell">{payable.description || "-"}</TableCell>
                          <TableCell className="text-xs hidden lg:table-cell">{payable.chart_account?.name || "-"}</TableCell>
                          <TableCell className="text-right font-medium text-xs sm:text-sm">
                            {formatCurrency(Number(payable.amount))}
                            {payable.paid_amount > 0 && <div className="text-xs text-muted-foreground">Pago: {formatCurrency(Number(payable.paid_amount))}</div>}
                          </TableCell>
                          <TableCell>{getPayableStatusBadge(payable.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleViewPayable(payable)} title="Visualizar">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {payable.status !== "PAGO" && payable.status !== "CANCELADO" && !(Number(payable.paid_amount) > 0) && (
                                <>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditPayable(payable)} title="Editar">
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => handlePay(payable)}>Pagar</Button>
                                </>
                              )}
                              {(payable.status === "PAGO" || Number(payable.paid_amount) > 0) && (
                                <Button variant="outline" size="sm" className="text-xs h-7 px-2 gap-1" onClick={() => handleReopenPayable(payable)} title="Reabrir como em aberto">
                                  <Undo2 className="h-3 w-3" /> Reabrir
                                </Button>
                              )}
                            </div>
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
      )}

      {/* Receivables Bulk Actions */}
      {showReceivables && selectedReceivableIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">{selectedReceivableIds.size} conta(s) a receber selecionada(s)</span>
          <span className="text-sm font-semibold text-primary">
            Total: {filteredReceivables
              .filter(r => selectedReceivableIds.has(r.id))
              .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
              .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => setReceivableBulkEditOpen(true)} className="gap-1">
            <Edit className="h-4 w-4" /> Editar Status
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setReceivableBulkDeleteOpen(true)} className="gap-1">
            <Trash2 className="h-4 w-4" /> Excluir
          </Button>
        </div>
      )}

      {/* Receivables Table */}
      {showReceivables && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Receipt className="h-5 w-5 text-green-500" />
                Contas a Receber ({filteredReceivables.length})
              </CardTitle>
              {hasActiveReceivableFilters && (
                <Button variant="ghost" size="sm" onClick={clearReceivableFilters} className="gap-1 text-xs">
                  <X className="h-3 w-3" /> Limpar Filtros
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {receivablesLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox checked={filteredReceivables.length > 0 && selectedReceivableIds.size === filteredReceivables.length} onCheckedChange={toggleReceivableSelectAll} />
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleReceivableSort("due_date")}>
                        <div className="flex items-center gap-1">Vencimento {getReceivableSortIcon("due_date")}
                          <FilterPopover value={receivableColumnFilters.due_date} onChange={(v) => setReceivableColumnFilters(f => ({...f, due_date: v}))} placeholder="dd/mm/aaaa" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleReceivableSort("customer")}>
                        <div className="flex items-center gap-1">Cliente {getReceivableSortIcon("customer")}
                          <FilterPopover value={receivableColumnFilters.customer} onChange={(v) => setReceivableColumnFilters(f => ({...f, customer: v}))} placeholder="Buscar..." />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50 hidden md:table-cell" onClick={() => handleReceivableSort("description")}>
                        <div className="flex items-center gap-1">Descrição {getReceivableSortIcon("description")}
                          <FilterPopover value={receivableColumnFilters.description} onChange={(v) => setReceivableColumnFilters(f => ({...f, description: v}))} placeholder="Buscar..." />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50 hidden lg:table-cell" onClick={() => handleReceivableSort("category")}>
                        <div className="flex items-center gap-1">Categoria {getReceivableSortIcon("category")}
                          <FilterPopover value={receivableColumnFilters.category} onChange={(v) => setReceivableColumnFilters(f => ({...f, category: v}))} placeholder="Buscar..." />
                        </div>
                      </TableHead>
                      <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleReceivableSort("amount")}>
                        <div className="flex items-center justify-end gap-1">Valor {getReceivableSortIcon("amount")}
                          <FilterPopover value={receivableColumnFilters.amount} onChange={(v) => setReceivableColumnFilters(f => ({...f, amount: v}))} placeholder="Valor..." />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleReceivableSort("status")}>
                        <div className="flex items-center gap-1">Status {getReceivableSortIcon("status")}
                          <FilterPopover value={receivableColumnFilters.status} onChange={(v) => setReceivableColumnFilters(f => ({...f, status: v}))} placeholder="Status" options={["ABERTO", "VENCIDO", "RECEBIDO", "PARCIAL", "CANCELADO"]} />
                        </div>
                      </TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceivables.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8 text-sm">Nenhuma conta a receber encontrada</TableCell></TableRow>
                    ) : (
                      filteredReceivables.map((receivable) => (
                        <TableRow key={receivable.id} className={selectedReceivableIds.has(receivable.id) ? "bg-muted/50" : ""}>
                          <TableCell><Checkbox checked={selectedReceivableIds.has(receivable.id)} onCheckedChange={() => toggleReceivableSelect(receivable.id)} /></TableCell>
                          <TableCell className="font-medium text-xs sm:text-sm">{format(parseDateLocal(receivable.due_date), "dd/MM/yy", { locale: ptBR })}</TableCell>
                          <TableCell className="text-xs sm:text-sm max-w-[120px] truncate">{receivable.customer?.name || "-"}</TableCell>
                          <TableCell className="text-xs sm:text-sm max-w-[150px] truncate hidden md:table-cell">{receivable.description || "-"}</TableCell>
                          <TableCell className="text-xs hidden lg:table-cell">{receivable.chart_account?.name || "-"}</TableCell>
                          <TableCell className="text-right font-medium text-xs sm:text-sm">
                            {formatCurrency(Number(receivable.amount))}
                            {receivable.received_amount > 0 && <div className="text-xs text-muted-foreground">Recebido: {formatCurrency(Number(receivable.received_amount))}</div>}
                          </TableCell>
                          <TableCell>{getReceivableStatusBadge(receivable.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleViewReceivable(receivable)} title="Visualizar">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {receivable.status !== "RECEBIDO" && receivable.status !== "CANCELADO" && !(Number(receivable.received_amount) > 0) && (
                                <>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditReceivable(receivable)} title="Editar">
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => handleReceive(receivable)}>Receber</Button>
                                </>
                              )}
                              {(receivable.status === "RECEBIDO" || Number(receivable.received_amount) > 0) && (
                                <Button variant="outline" size="sm" className="text-xs h-7 px-2 gap-1" onClick={() => handleReopenReceivable(receivable)} title="Reabrir como em aberto">
                                  <Undo2 className="h-3 w-3" /> Reabrir
                                </Button>
                              )}
                            </div>
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
      )}

      {/* Dialogs */}
      <CreatePayableDialog open={createPayableOpen} onOpenChange={setCreatePayableOpen} onSuccess={refetchPayables} />
      <PayPayableDialog open={payDialogOpen} onOpenChange={setPayDialogOpen} payable={selectedPayable} onSuccess={refetchPayables} />
      <CreateReceivableDialog open={createReceivableOpen} onOpenChange={setCreateReceivableOpen} onSuccess={refetchReceivables} />
      <ReceivePaymentDialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen} receivable={selectedReceivable} onSuccess={refetchReceivables} />
      <ViewEditPayableDialog open={viewEditPayableOpen} onOpenChange={setViewEditPayableOpen} payable={selectedPayable} onSuccess={refetchPayables} mode={viewEditPayableMode} />
      <ViewEditReceivableDialog open={viewEditReceivableOpen} onOpenChange={setViewEditReceivableOpen} receivable={selectedReceivable} onSuccess={refetchReceivables} mode={viewEditReceivableMode} />

      {/* Payable Bulk Edit Dialog */}
      <Dialog open={payableBulkEditOpen} onOpenChange={setPayableBulkEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Status em Lote</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Label>Novo Status para {selectedPayableIds.size} conta(s)</Label>
            <Select value={payableBulkEditForm.status} onValueChange={(v) => setPayableBulkEditForm({ status: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ABERTO">Aberto</SelectItem>
                <SelectItem value="VENCIDO">Vencido</SelectItem>
                <SelectItem value="PAGO">Pago</SelectItem>
                <SelectItem value="PARCIAL">Parcial</SelectItem>
                <SelectItem value="CANCELADO">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayableBulkEditOpen(false)}>Cancelar</Button>
            <Button onClick={handlePayableBulkEdit} disabled={payableBulkLoading}>{payableBulkLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payable Bulk Delete Dialog */}
      <AlertDialog open={payableBulkDeleteOpen} onOpenChange={setPayableBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Contas a Pagar</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir {selectedPayableIds.size} conta(s)? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handlePayableBulkDelete} disabled={payableBulkLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {payableBulkLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Receivable Bulk Edit Dialog */}
      <Dialog open={receivableBulkEditOpen} onOpenChange={setReceivableBulkEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Status em Lote</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Label>Novo Status para {selectedReceivableIds.size} conta(s)</Label>
            <Select value={receivableBulkEditForm.status} onValueChange={(v) => setReceivableBulkEditForm({ status: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ABERTO">Aberto</SelectItem>
                <SelectItem value="VENCIDO">Vencido</SelectItem>
                <SelectItem value="RECEBIDO">Recebido</SelectItem>
                <SelectItem value="PARCIAL">Parcial</SelectItem>
                <SelectItem value="CANCELADO">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceivableBulkEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleReceivableBulkEdit} disabled={receivableBulkLoading}>{receivableBulkLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receivable Bulk Delete Dialog */}
      <AlertDialog open={receivableBulkDeleteOpen} onOpenChange={setReceivableBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Contas a Receber</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir {selectedReceivableIds.size} conta(s)? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReceivableBulkDelete} disabled={receivableBulkLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {receivableBulkLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {drillDown && (
        <DrillDownEntriesDialog
          filter={drillDown}
          dateFrom="2000-01-01"
          dateTo="2099-12-31"
          onClose={() => setDrillDown(null)}
        />
      )}
    </div>
  );
}
