import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  AlertTriangle, 
  Search, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock, 
  AlertCircle,
  Bug,
  Filter,
  RefreshCw,
  BarChart3,
  Repeat
} from "lucide-react";
import { Json } from "@/integrations/supabase/types";
import { ErrorsDashboard } from "@/components/system-errors/ErrorsDashboard";

interface SystemError {
  id: string;
  title: string;
  description: string | null;
  module: string;
  severity: string;
  status: string;
  source: string;
  error_code: string | null;
  stack_trace: string | null;
  metadata: Json | null;
  reported_by: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  occurrence_count?: number;
  last_occurrence_at?: string;
}

const MODULES = [
  "crm", "prospeccao", "projetos", "pedidos", "producao", 
  "estoque", "fornecedores", "compras", "metas", "campanhas",
  "autenticacao", "webhooks", "edge_functions", "outro"
];

const SEVERITY_OPTIONS = [
  { value: "low", label: "Baixa", color: "bg-blue-500" },
  { value: "medium", label: "Média", color: "bg-yellow-500" },
  { value: "high", label: "Alta", color: "bg-orange-500" },
  { value: "critical", label: "Crítica", color: "bg-red-500" }
];

const STATUS_OPTIONS = [
  { value: "open", label: "Aberto", icon: AlertCircle },
  { value: "investigating", label: "Investigando", icon: Eye },
  { value: "resolved", label: "Resolvido", icon: CheckCircle },
  { value: "ignored", label: "Ignorado", icon: XCircle }
];

const SOURCE_OPTIONS = [
  { value: "edge_function", label: "Edge Function" },
  { value: "frontend", label: "Frontend" },
  { value: "webhook", label: "Webhook" }
];

// Auto-refresh interval: 10 minutes
const AUTO_REFRESH_INTERVAL = 10 * 60 * 1000;

export default function SystemErrors() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterModule, setFilterModule] = useState<string>("all");
  const [selectedError, setSelectedError] = useState<SystemError | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("table");

  // Verificar se é admin
  if (profile?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const { data: errors, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["system-errors", filterStatus, filterSeverity, filterModule],
    queryFn: async () => {
      let query = supabase
        .from("system_errors")
        .select("*")
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }
      if (filterSeverity !== "all") {
        query = query.eq("severity", filterSeverity);
      }
      if (filterModule !== "all") {
        query = query.eq("module", filterModule);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SystemError[];
    },
    refetchInterval: AUTO_REFRESH_INTERVAL
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('system-errors-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_errors'
        },
        (payload) => {
          console.log('🔔 System error realtime update:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ["system-errors"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const updateError = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SystemError> }) => {
      const { data, error } = await supabase
        .from("system_errors")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-errors"] });
      toast.success("Erro atualizado");
      setIsDetailOpen(false);
    }
  });

  const filteredErrors = errors?.filter(error => 
    error.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    error.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    error.module.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSeverityBadge = (severity: string) => {
    const option = SEVERITY_OPTIONS.find(o => o.value === severity);
    return (
      <Badge className={`${option?.color} text-white`}>
        {option?.label || severity}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find(o => o.value === status);
    const Icon = option?.icon || AlertCircle;
    const colorClass = status === "resolved" ? "bg-green-500" : 
                       status === "investigating" ? "bg-blue-500" :
                       status === "ignored" ? "bg-gray-500" : "bg-red-500";
    return (
      <Badge className={`${colorClass} text-white gap-1`}>
        <Icon className="h-3 w-3" />
        {option?.label || status}
      </Badge>
    );
  };

  // Métricas
  const openCount = errors?.filter(e => e.status === "open").length || 0;
  const criticalCount = errors?.filter(e => e.severity === "critical" && e.status !== "resolved").length || 0;
  const resolvedToday = errors?.filter(e => 
    e.status === "resolved" && 
    e.resolved_at && 
    new Date(e.resolved_at).toDateString() === new Date().toDateString()
  ).length || 0;
  const totalOccurrences = errors?.reduce((sum, e) => sum + (e.occurrence_count || 1), 0) || 0;

  const lastUpdate = dataUpdatedAt ? format(new Date(dataUpdatedAt), "HH:mm:ss", { locale: ptBR }) : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bug className="h-8 w-8 text-red-500" />
            <div>
              <h1 className="text-2xl font-bold">Erros do Sistema</h1>
              <p className="text-muted-foreground">
                Monitoramento automático {lastUpdate && <span className="text-xs">(atualizado às {lastUpdate})</span>}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Abertos</p>
                  <p className="text-2xl font-bold">{openCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Críticos</p>
                  <p className="text-2xl font-bold">{criticalCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Resolvidos Hoje</p>
                  <p className="text-2xl font-bold">{resolvedToday}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Repeat className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ocorrências</p>
                  <p className="text-2xl font-bold">{totalOccurrences}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Erros</p>
                  <p className="text-2xl font-bold">{errors?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="table" className="gap-2">
              <Bug className="h-4 w-4" />
              Lista de Erros
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard Analítico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-4">
            {errors && <ErrorsDashboard errors={errors} />}
          </TabsContent>

          <TabsContent value="table" className="mt-4 space-y-4">
            {/* Filtros */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar erros..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Status</SelectItem>
                      {STATUS_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Severidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {SEVERITY_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterModule} onValueChange={setFilterModule}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Módulo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Módulos</SelectItem>
                      {MODULES.map(mod => (
                        <SelectItem key={mod} value={mod}>{mod}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(filterStatus !== "all" || filterSeverity !== "all" || filterModule !== "all") && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setFilterStatus("all");
                        setFilterSeverity("all");
                        setFilterModule("all");
                      }}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Limpar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tabela */}
            <Card>
              <CardHeader>
                <CardTitle>Erros Capturados Automaticamente</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : filteredErrors?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum erro registrado pelo sistema
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Módulo</TableHead>
                        <TableHead>Severidade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ocorrências</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Última</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredErrors?.map((error) => (
                        <TableRow key={error.id}>
                          <TableCell className="font-medium max-w-[250px] truncate">
                            {error.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{error.module}</Badge>
                          </TableCell>
                          <TableCell>{getSeverityBadge(error.severity)}</TableCell>
                          <TableCell>{getStatusBadge(error.status)}</TableCell>
                          <TableCell>
                            {(error.occurrence_count || 1) > 1 ? (
                              <Badge variant="secondary" className="gap-1">
                                <Repeat className="h-3 w-3" />
                                {error.occurrence_count}x
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">1x</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {SOURCE_OPTIONS.find(s => s.value === error.source)?.label || error.source}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {format(new Date(error.last_occurrence_at || error.created_at), "dd/MM HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedError(error);
                                setIsDetailOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Erro</DialogTitle>
            </DialogHeader>
            {selectedError && (
              <ErrorDetailView 
                error={selectedError} 
                onUpdate={(updates) => updateError.mutate({ id: selectedError.id, updates })}
                isUpdating={updateError.isPending}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

function ErrorDetailView({ 
  error, 
  onUpdate,
  isUpdating 
}: { 
  error: SystemError; 
  onUpdate: (updates: Partial<SystemError>) => void;
  isUpdating: boolean;
}) {
  const [status, setStatus] = useState(error.status);
  const [resolutionNotes, setResolutionNotes] = useState(error.resolution_notes || "");
  const { profile } = useAuth();

  const handleResolve = () => {
    onUpdate({
      status: "resolved",
      resolved_by: profile?.id,
      resolved_at: new Date().toISOString(),
      resolution_notes: resolutionNotes
    });
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    if (newStatus !== "resolved") {
      onUpdate({ status: newStatus });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-muted-foreground">Título</Label>
          <p className="font-medium">{error.title}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Módulo</Label>
          <Badge variant="outline">{error.module}</Badge>
        </div>
        <div>
          <Label className="text-muted-foreground">Severidade</Label>
          <div className="mt-1">
            {SEVERITY_OPTIONS.find(o => o.value === error.severity) && (
              <Badge className={`${SEVERITY_OPTIONS.find(o => o.value === error.severity)?.color} text-white`}>
                {SEVERITY_OPTIONS.find(o => o.value === error.severity)?.label}
              </Badge>
            )}
          </div>
        </div>
        <div>
          <Label className="text-muted-foreground">Origem</Label>
          <Badge variant="secondary">
            {SOURCE_OPTIONS.find(s => s.value === error.source)?.label || error.source}
          </Badge>
        </div>
        <div>
          <Label className="text-muted-foreground">Primeira Ocorrência</Label>
          <p>{format(new Date(error.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Ocorrências</Label>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Repeat className="h-3 w-3" />
              {error.occurrence_count || 1}x
            </Badge>
            {error.last_occurrence_at && (
              <span className="text-xs text-muted-foreground">
                última: {format(new Date(error.last_occurrence_at), "dd/MM HH:mm", { locale: ptBR })}
              </span>
            )}
          </div>
        </div>
        {error.error_code && (
          <div>
            <Label className="text-muted-foreground">Código</Label>
            <p className="font-mono">{error.error_code}</p>
          </div>
        )}
      </div>

      {error.description && (
        <div>
          <Label className="text-muted-foreground">Descrição</Label>
          <p className="mt-1 whitespace-pre-wrap">{error.description}</p>
        </div>
      )}

      {error.stack_trace && (
        <div>
          <Label className="text-muted-foreground">Stack Trace / Logs</Label>
          <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-x-auto max-h-[200px]">
            {error.stack_trace}
          </pre>
        </div>
      )}

      <div className="border-t pt-4">
        <Label>Status</Label>
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {status === "resolved" && error.status !== "resolved" && (
        <div className="space-y-2">
          <Label>Notas de Resolução</Label>
          <Textarea
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder="Descreva como o erro foi resolvido..."
            rows={3}
          />
          <Button onClick={handleResolve} disabled={isUpdating} className="w-full">
            {isUpdating ? "Salvando..." : "Marcar como Resolvido"}
          </Button>
        </div>
      )}

      {error.status === "resolved" && error.resolution_notes && (
        <div className="bg-green-500/10 p-4 rounded-lg">
          <Label className="text-green-600">Resolução</Label>
          <p className="mt-1">{error.resolution_notes}</p>
          {error.resolved_at && (
            <p className="text-sm text-muted-foreground mt-2">
              Resolvido em {format(new Date(error.resolved_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
