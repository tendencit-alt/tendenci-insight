import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DeletedRecordDetailDialog } from "./DeletedRecordDetailDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2, Search, Eye, AlertCircle, Filter, RefreshCw } from "lucide-react";

interface DeletedRecord {
  id: string;
  original_table: string;
  original_id: string;
  original_data: Record<string, unknown>;
  deleted_by: string | null;
  deleted_by_name: string | null;
  deleted_at: string;
  deletion_reason: string | null;
  record_type: string;
  record_identifier: string | null;
}

const RECORD_TYPE_OPTIONS = [
  { value: "all", label: "Todos os tipos" },
  { value: "order", label: "Pedidos" },
  { value: "deal", label: "Negócios CRM" },
  { value: "architect", label: "Profissionais Parceiros" },
  { value: "goal", label: "Metas" },
  { value: "user", label: "Usuários" },
  { value: "bank_account", label: "Contas Bancárias" },
  { value: "chart_account", label: "Plano de Contas" },
  { value: "cost_center", label: "Centros de Custo" },
  { value: "project", label: "Projetos Financeiros" },
  { value: "task", label: "Tarefas" },
  { value: "lead", label: "Leads" },
  { value: "client", label: "Clientes" },
  { value: "supplier", label: "Fornecedores" },
  { value: "payable", label: "Contas a Pagar" },
  { value: "receivable", label: "Contas a Receber" },
  { value: "ledger_entry", label: "Lançamentos" },
];

const RECORD_TYPE_LABELS: Record<string, string> = {
  order: "Pedido",
  deal: "Negócio CRM",
  architect: "Profissional Parceiro",
  goal: "Meta",
  user: "Usuário",
  bank_account: "Conta Bancária",
  chart_account: "Plano de Contas",
  cost_center: "Centro de Custo",
  project: "Projeto Financeiro",
  task: "Tarefa",
  lead: "Lead",
  client: "Cliente",
  supplier: "Fornecedor",
  payable: "Conta a Pagar",
  receivable: "Conta a Receber",
  ledger_entry: "Lançamento",
};

const RECORD_TYPE_COLORS: Record<string, string> = {
  order: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  deal: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  architect: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  goal: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  user: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  bank_account: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  chart_account: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  cost_center: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  project: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  task: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  lead: "bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300",
  client: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  supplier: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  payable: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  receivable: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  ledger_entry: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
};

export function DeletedRecordsTab() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<DeletedRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: records, isLoading, refetch } = useQuery({
    queryKey: ["deleted-records", typeFilter, search],
    queryFn: async () => {
      let query = supabase
        .from("deleted_records")
        .select("*")
        .order("deleted_at", { ascending: false })
        .limit(100);

      if (typeFilter !== "all") {
        query = query.eq("record_type", typeFilter);
      }

      if (search) {
        query = query.or(`record_identifier.ilike.%${search}%,deleted_by_name.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as DeletedRecord[];
    },
  });

  const handleViewDetails = (record: DeletedRecord) => {
    setSelectedRecord(record);
    setIsDetailOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-destructive" />
          Registros Excluídos
        </CardTitle>
        <CardDescription>
          Visualize todos os registros que foram excluídos do sistema com informações de rastreabilidade
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por identificador ou usuário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                {RECORD_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : records && records.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Identificador</TableHead>
                  <TableHead>Excluído por</TableHead>
                  <TableHead>Data de Exclusão</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Badge className={RECORD_TYPE_COLORS[record.record_type] || "bg-gray-100 text-gray-800"}>
                        {RECORD_TYPE_LABELS[record.record_type] || record.record_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {record.record_identifier || "-"}
                    </TableCell>
                    <TableCell>
                      {record.deleted_by_name || "Sistema"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(record.deleted_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {record.deletion_reason || "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetails(record)}
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-lg mb-1">Nenhum registro excluído</h3>
            <p className="text-muted-foreground text-sm">
              {search || typeFilter !== "all"
                ? "Nenhum registro encontrado com os filtros aplicados"
                : "Os registros excluídos do sistema aparecerão aqui"}
            </p>
          </div>
        )}

        {/* Summary */}
        {records && records.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Exibindo {records.length} registro{records.length !== 1 ? "s" : ""} excluído{records.length !== 1 ? "s" : ""}
          </div>
        )}
      </CardContent>

      <DeletedRecordDetailDialog
        record={selectedRecord}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </Card>
  );
}
