import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Clock, 
  Users, 
  MessageSquare, 
  AlertTriangle,
  Timer,
  Ban,
  Circle
} from "lucide-react";
import { useDispatchRealtime, DispatchSession, DispatchSessionItem } from "@/hooks/useDispatchRealtime";
import { cn } from "@/lib/utils";

interface DispatchProgressMonitorProps {
  sessionId: string | null;
  onClose?: () => void;
}

export function DispatchProgressMonitor({ sessionId, onClose }: DispatchProgressMonitorProps) {
  const [showCompleteMessage, setShowCompleteMessage] = useState(false);
  
  const { 
    session, 
    items, 
    stats, 
    isLoading, 
    error 
  } = useDispatchRealtime({ 
    sessionId: sessionId || undefined,
    onComplete: () => {
      setShowCompleteMessage(true);
    }
  });

  // Formatar tempo estimado
  const formatTimeRemaining = (seconds: number | null): string => {
    if (seconds === null) return '---';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}min ${secs}s` : `${mins}min`;
  };

  // Status icon para cada item
  const getItemStatusIcon = (status: DispatchSessionItem['status']) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />;
      case 'skipped':
        return <Ban className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground/50" />;
    }
  };

  // Cor do progresso baseado na taxa de sucesso
  const getProgressColor = () => {
    if (!session || session.processed === 0) return '';
    const successRate = (session.success_count / session.processed) * 100;
    if (successRate >= 80) return 'bg-green-500';
    if (successRate >= 50) return 'bg-amber-500';
    return 'bg-destructive';
  };

  if (!sessionId) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum disparo em andamento</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading && !session) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-8 text-center text-destructive">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!session) return null;

  const isFollowup = session.type === 'followup';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {isFollowup ? (
              <MessageSquare className="h-5 w-5 text-blue-500" />
            ) : (
              <Users className="h-5 w-5 text-green-500" />
            )}
            {isFollowup ? 'Disparo de Follow-ups' : 'Envio de Convites de Grupo'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant={
                session.status === 'running' ? 'default' :
                session.status === 'completed' ? 'secondary' :
                session.status === 'failed' ? 'destructive' : 'outline'
              }
              className="capitalize"
            >
              {session.status === 'running' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {session.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
              {session.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
              {session.status === 'running' ? 'Em Andamento' :
               session.status === 'completed' ? 'Concluído' :
               session.status === 'failed' ? 'Falhou' : session.status}
            </Badge>
            {session.source === 'manual' && (
              <Badge variant="outline" className="text-xs">Manual</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {/* Barra de Progresso Principal */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">
              {session.processed} de {session.total_leads} ({stats.progress}%)
            </span>
          </div>
          <div className="relative">
            <Progress 
              value={stats.progress} 
              className="h-3"
            />
            {stats.isRunning && (
              <div 
                className="absolute top-0 left-0 h-3 bg-primary/30 rounded-full animate-pulse"
                style={{ width: `${stats.progress}%` }}
              />
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{session.success_count}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <CheckCircle className="h-3 w-3" /> Enviados
            </div>
          </div>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-destructive">{session.failed_count}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <XCircle className="h-3 w-3" /> Erros
            </div>
          </div>
          <div className="bg-muted border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{formatTimeRemaining(stats.estimatedTimeRemaining)}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Timer className="h-3 w-3" /> Restante
            </div>
          </div>
        </div>

        {/* Lista de Leads */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-3 py-2 text-sm font-medium border-b flex items-center justify-between">
            <span>Leads</span>
            <span className="text-xs text-muted-foreground">
              {items.filter(i => i.status === 'processing').length > 0 && (
                <span className="text-amber-500 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Processando...
                </span>
              )}
            </span>
          </div>
          <ScrollArea className="h-[200px]">
            {items.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                <Loader2 className="h-5 w-5 mx-auto mb-2 animate-spin" />
                Aguardando leads...
              </div>
            ) : (
              <div className="divide-y">
                {items.map((item) => (
                  <div 
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 text-sm transition-colors",
                      item.status === 'processing' && "bg-amber-500/5",
                      item.status === 'sent' && "bg-green-500/5",
                      item.status === 'failed' && "bg-destructive/5"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {getItemStatusIcon(item.status)}
                      <span className="truncate font-medium">{item.client_name}</span>
                      {item.followup_number && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 flex-shrink-0">
                          #{item.followup_number}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.error_message && (
                        <span 
                          className="text-xs text-destructive truncate max-w-[150px]" 
                          title={item.error_message}
                        >
                          {item.error_message}
                        </span>
                      )}
                      {item.processed_at && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.processed_at).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Mensagem de Conclusão */}
        {showCompleteMessage && session.status === 'completed' && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="font-medium text-green-700">Disparo Concluído!</p>
            <p className="text-sm text-muted-foreground mt-1">
              {session.success_count} de {session.total_leads} enviados com sucesso
              {session.failed_count > 0 && ` (${session.failed_count} falhas)`}
            </p>
          </div>
        )}

        {showCompleteMessage && session.status === 'failed' && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
            <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="font-medium text-destructive">Disparo Falhou</p>
            <p className="text-sm text-muted-foreground mt-1">
              Verifique os logs para mais detalhes
            </p>
          </div>
        )}

        {/* Botão Fechar */}
        {stats.isComplete && onClose && (
          <Button onClick={onClose} variant="outline" className="w-full">
            Fechar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
