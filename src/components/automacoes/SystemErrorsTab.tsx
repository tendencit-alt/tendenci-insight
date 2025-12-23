import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  XCircle, 
  RefreshCw, 
  Search,
  Filter,
  ExternalLink
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ErrorDetailDialog, SystemError } from "./ErrorDetailDialog";

const severityConfig = {
  low: { label: 'Baixa', icon: Info, className: 'bg-blue-500/10 text-blue-500' },
  medium: { label: 'Média', icon: AlertCircle, className: 'bg-yellow-500/10 text-yellow-500' },
  high: { label: 'Alta', icon: AlertTriangle, className: 'bg-orange-500/10 text-orange-500' },
  critical: { label: 'Crítica', icon: XCircle, className: 'bg-red-500/10 text-red-500' }
};

interface SystemErrorsTabProps {
  onErrorCountChange?: (count: number) => void;
}

export function SystemErrorsTab({ onErrorCountChange }: SystemErrorsTabProps) {
  const [errors, setErrors] = useState<SystemError[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [selectedError, setSelectedError] = useState<SystemError | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchErrors = async () => {
    try {
      let query = supabase
        .from('system_errors')
        .select('*')
        .order('last_occurrence_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      
      const typedData: SystemError[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        module: item.module,
        severity: (item.severity || 'medium') as 'low' | 'medium' | 'high' | 'critical',
        status: (item.status || 'open') as 'open' | 'investigating' | 'resolved' | 'ignored',
        source: item.source,
        error_code: item.error_code,
        stack_trace: item.stack_trace,
        metadata: typeof item.metadata === 'object' ? item.metadata as Record<string, any> : null,
        created_at: item.created_at,
        updated_at: item.updated_at,
        occurrence_count: item.occurrence_count || 1,
        last_occurrence_at: item.last_occurrence_at,
        resolved_at: item.resolved_at,
        resolution_notes: item.resolution_notes
      }));
      
      setErrors(typedData);
      
      // Count open errors for badge
      const openCount = typedData.filter(e => e.status === 'open').length;
      onErrorCountChange?.(openCount);
    } catch (error) {
      console.error('Erro ao buscar erros:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchErrors();

    // Realtime subscription
    const channel = supabase
      .channel('system-errors-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_errors'
        },
        () => {
          fetchErrors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchErrors();
  };

  const filteredErrors = errors.filter(error => {
    const matchesSearch = searchTerm === "" || 
      error.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      error.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (error.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesModule = moduleFilter === "all" || error.module === moduleFilter;
    const matchesSeverity = severityFilter === "all" || error.severity === severityFilter;
    
    return matchesSearch && matchesModule && matchesSeverity;
  });

  const modules = [...new Set(errors.map(e => e.module))];

  const handleOpenError = (error: SystemError) => {
    setSelectedError(error);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar erros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="open">Abertos</SelectItem>
              <SelectItem value="investigating">Investigando</SelectItem>
              <SelectItem value="resolved">Resolvidos</SelectItem>
              <SelectItem value="ignored">Ignorados</SelectItem>
            </SelectContent>
          </Select>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="critical">Crítica</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>

          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Módulo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {modules.map(module => (
                <SelectItem key={module} value={module}>{module}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <Card className="p-3">
            <div className="text-2xl font-bold text-destructive">
              {errors.filter(e => e.status === 'open').length}
            </div>
            <div className="text-xs text-muted-foreground">Abertos</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-yellow-500">
              {errors.filter(e => e.severity === 'critical' && e.status === 'open').length}
            </div>
            <div className="text-xs text-muted-foreground">Críticos</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-green-500">
              {errors.filter(e => e.status === 'resolved').length}
            </div>
            <div className="text-xs text-muted-foreground">Resolvidos</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-muted-foreground">
              {errors.reduce((acc, e) => acc + e.occurrence_count, 0)}
            </div>
            <div className="text-xs text-muted-foreground">Total Ocorrências</div>
          </Card>
        </div>

        {/* Errors List */}
        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {filteredErrors.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    {errors.length === 0 
                      ? "Nenhum erro registrado" 
                      : "Nenhum erro corresponde aos filtros"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredErrors.map((error) => {
                const severity = severityConfig[error.severity] || severityConfig.medium;
                const SeverityIcon = severity.icon;
                
                return (
                  <Card 
                    key={error.id} 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleOpenError(error)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${severity.className}`}>
                          <SeverityIcon className="h-4 w-4" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{error.title}</h4>
                            {error.occurrence_count > 1 && (
                              <Badge variant="secondary" className="text-xs">
                                {error.occurrence_count}x
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {error.module}
                            </Badge>
                            {error.source && (
                              <span className="truncate">{error.source}</span>
                            )}
                            <span>•</span>
                            <span>
                              {formatDistanceToNow(
                                new Date(error.last_occurrence_at || error.created_at), 
                                { addSuffix: true, locale: ptBR }
                              )}
                            </span>
                          </div>
                          
                          {error.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                              {error.description}
                            </p>
                          )}
                        </div>

                        <Button variant="ghost" size="icon" className="shrink-0">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      <ErrorDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        error={selectedError}
        onStatusChange={handleRefresh}
      />
    </>
  );
}
