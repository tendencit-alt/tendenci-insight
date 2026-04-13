import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Search, Download, Clock, User, Database, FileText, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const EVENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  CREATE: { label: "Criação", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  UPDATE: { label: "Alteração", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  DELETE_LOGICO: { label: "Exclusão", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  LOGIN: { label: "Login", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  APPROVE: { label: "Aprovação", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  REJECT: { label: "Rejeição", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  IMPORT: { label: "Importação", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300" },
  EXPORT: { label: "Exportação", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" },
};

const TABLE_LABELS: Record<string, string> = {
  orders: "Pedidos",
  fin_ledger_entries: "Livro Razão",
  fin_payables: "Contas a Pagar",
  fin_receivables: "Contas a Receber",
  fin_financial_goals: "Metas",
  fin_cost_centers: "Centros de Custo",
  fin_chart_accounts: "Plano de Contas",
  fin_bank_accounts: "Contas Bancárias",
  clients: "Clientes",
  suppliers: "Fornecedores",
  profiles: "Usuários",
  company_settings: "Configurações",
  fin_event_automation_rules: "Automações",
  profile_type_permissions: "Permissões",
};

export function AuditCenter() {
  const [search, setSearch] = useState("");
  const [filterTable, setFilterTable] = useState<string>("all");
  const [filterEvent, setFilterEvent] = useState<string>("all");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-log", filterTable, filterEvent, search, page],
    queryFn: async () => {
      let query = supabase
        .from("audit_log")
        .select("*, profiles:user_id(full_name)")
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filterTable !== "all") query = query.eq("table_name", filterTable);
      if (filterEvent !== "all") query = query.eq("event_type", filterEvent);
      if (search) query = query.or(`record_id.ilike.%${search}%,field_name.ilike.%${search}%,new_value.ilike.%${search}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: importLogs } = useQuery({
    queryKey: ["audit-import-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_import_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["audit-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_log")
        .select("event_type")
        .limit(1000);

      const counts: Record<string, number> = {};
      data?.forEach((row: any) => {
        counts[row.event_type] = (counts[row.event_type] || 0) + 1;
      });
      return counts;
    },
  });

  const handleExportCSV = () => {
    if (!logs?.length) return;
    const headers = ["Data", "Usuário", "Tabela", "Registro", "Campo", "Valor Anterior", "Valor Novo", "Tipo", "Origem"];
    const rows = logs.map((log: any) => [
      format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss"),
      (log.profiles as any)?.full_name || log.user_id || "Sistema",
      TABLE_LABELS[log.table_name] || log.table_name,
      log.record_id,
      log.field_name || "-",
      log.old_value || "-",
      log.new_value?.substring(0, 100) || "-",
      EVENT_TYPE_LABELS[log.event_type]?.label || log.event_type,
      log.event_source,
    ]);

    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Central de Auditoria</h2>
            <p className="text-sm text-muted-foreground">Histórico permanente de alterações (append-only)</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!logs?.length}>
          <Download className="h-4 w-4 mr-1" /> Exportar CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(EVENT_TYPE_LABELS).slice(0, 4).map(([key, cfg]) => (
          <Card key={key}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{cfg.label}</p>
              <p className="text-2xl font-bold">{stats?.[key] || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="logs">
        <TabsList>
          <TabsTrigger value="logs" className="gap-1.5"><Database className="h-3.5 w-3.5" />Logs</TabsTrigger>
          <TabsTrigger value="imports" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Importações</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                placeholder="Buscar por registro, campo ou valor..."
                className="pl-9"
              />
            </div>
            <Select value={filterTable} onValueChange={v => { setFilterTable(v); setPage(0); }}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Tabela" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as tabelas</SelectItem>
                {Object.entries(TABLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEvent} onValueChange={v => { setFilterEvent(v); setPage(0); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(EVENT_TYPE_LABELS).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Log list */}
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : !logs?.length ? (
              <div className="text-center py-8 text-muted-foreground">Nenhum registro de auditoria encontrado.</div>
            ) : (
              <div className="space-y-1">
                {logs.map((log: any) => {
                  const evtCfg = EVENT_TYPE_LABELS[log.event_type] || { label: log.event_type, color: "bg-muted text-muted-foreground" };
                  return (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-accent/20 transition-colors">
                      <div className="flex-shrink-0 mt-0.5">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-[10px] ${evtCfg.color}`}>{evtCfg.label}</Badge>
                          <Badge variant="outline" className="text-[10px]">{TABLE_LABELS[log.table_name] || log.table_name}</Badge>
                          {log.field_name && (
                            <span className="text-xs font-mono text-muted-foreground">{log.field_name}</span>
                          )}
                        </div>
                        {log.event_type === "UPDATE" && log.field_name && (
                          <div className="mt-1 text-xs">
                            <span className="text-red-500 line-through">{log.old_value?.substring(0, 80) || "vazio"}</span>
                            <span className="mx-1">→</span>
                            <span className="text-green-600">{log.new_value?.substring(0, 80) || "vazio"}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {(log.profiles as any)?.full_name || "Sistema"}
                          </span>
                          <span>{format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</span>
                          <span className="font-mono">{log.record_id?.substring(0, 8)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Pagination */}
          <div className="flex justify-between items-center">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground">Página {page + 1}</span>
            <Button variant="outline" size="sm" disabled={!logs || logs.length < pageSize} onClick={() => setPage(p => p + 1)}>
              Próxima
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="imports" className="mt-4">
          {!importLogs?.length ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma importação registrada.</div>
          ) : (
            <div className="space-y-2">
              {importLogs.map((imp: any) => (
                <div key={imp.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{imp.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {imp.record_count} registros • {imp.success_count} sucesso • {imp.error_count} erros
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={imp.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                      {imp.status}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(imp.created_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
