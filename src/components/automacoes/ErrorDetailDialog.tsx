import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  XCircle,
  Clock,
  Copy,
  CheckCircle2,
  Code,
  FileText,
  Server,
  Calendar,
  Hash
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface SystemError {
  id: string;
  title: string;
  description: string | null;
  module: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'ignored';
  source: string | null;
  error_code: string | null;
  stack_trace: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string | null;
  occurrence_count: number;
  last_occurrence_at: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
}

interface ErrorDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  error: SystemError | null;
  onStatusChange?: () => void;
}

const severityConfig = {
  low: { 
    label: 'Baixa', 
    icon: Info, 
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
  },
  medium: { 
    label: 'Média', 
    icon: AlertCircle, 
    className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' 
  },
  high: { 
    label: 'Alta', 
    icon: AlertTriangle, 
    className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' 
  },
  critical: { 
    label: 'Crítica', 
    icon: XCircle, 
    className: 'bg-red-500/10 text-red-500 border-red-500/20' 
  }
};

const statusConfig = {
  open: { label: 'Aberto', className: 'bg-red-500/10 text-red-500' },
  investigating: { label: 'Investigando', className: 'bg-yellow-500/10 text-yellow-500' },
  resolved: { label: 'Resolvido', className: 'bg-green-500/10 text-green-500' },
  ignored: { label: 'Ignorado', className: 'bg-muted text-muted-foreground' }
};

export function ErrorDetailDialog({ 
  open, 
  onOpenChange, 
  error,
  onStatusChange
}: ErrorDetailDialogProps) {
  if (!error) return null;

  const severity = severityConfig[error.severity] || severityConfig.medium;
  const status = statusConfig[error.status] || statusConfig.open;
  const SeverityIcon = severity.icon;

  const handleCopyError = () => {
    const errorText = `
Erro: ${error.title}
Módulo: ${error.module}
Severidade: ${severity.label}
Descrição: ${error.description || 'N/A'}
Source: ${error.source || 'N/A'}
Error Code: ${error.error_code || 'N/A'}
Stack Trace: ${error.stack_trace || 'N/A'}
Metadata: ${JSON.stringify(error.metadata, null, 2)}
    `.trim();
    
    navigator.clipboard.writeText(errorText);
    toast.success("Erro copiado para a área de transferência");
  };

  const handleMarkResolved = async () => {
    try {
      const { error: updateError } = await supabase
        .from('system_errors')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', error.id);

      if (updateError) throw updateError;
      
      toast.success("Erro marcado como resolvido");
      onStatusChange?.();
      onOpenChange(false);
    } catch (err) {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleMarkIgnored = async () => {
    try {
      const { error: updateError } = await supabase
        .from('system_errors')
        .update({ status: 'ignored' })
        .eq('id', error.id);

      if (updateError) throw updateError;
      
      toast.success("Erro marcado como ignorado");
      onStatusChange?.();
      onOpenChange(false);
    } catch (err) {
      toast.error("Erro ao atualizar status");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${severity.className}`}>
                <SeverityIcon className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  {error.title}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={severity.className}>
                    {severity.label}
                  </Badge>
                  <Badge variant="outline" className={status.className}>
                    {status.label}
                  </Badge>
                  <Badge variant="outline">
                    {error.module}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Descrição */}
            {error.description && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Descrição
                </h4>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  {error.description}
                </p>
              </div>
            )}

            {/* Onde aconteceu */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  Source
                </h4>
                <p className="text-sm bg-muted/50 p-2 rounded-lg font-mono">
                  {error.source || 'N/A'}
                </p>
              </div>
              
              {error.error_code && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Code className="h-4 w-4 text-muted-foreground" />
                    Código do Erro
                  </h4>
                  <p className="text-sm bg-muted/50 p-2 rounded-lg font-mono">
                    {error.error_code}
                  </p>
                </div>
              )}
            </div>

            {/* Ocorrências */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  Ocorrências
                </h4>
                <p className="text-sm bg-muted/50 p-2 rounded-lg">
                  <span className="font-semibold text-destructive">{error.occurrence_count}x</span>
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Primeira Ocorrência
                </h4>
                <p className="text-sm bg-muted/50 p-2 rounded-lg">
                  {format(new Date(error.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>

            {error.last_occurrence_at && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Última Ocorrência
                </h4>
                <p className="text-sm bg-muted/50 p-2 rounded-lg">
                  {format(new Date(error.last_occurrence_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            )}

            {/* Stack Trace */}
            {error.stack_trace && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Code className="h-4 w-4 text-muted-foreground" />
                  Stack Trace
                </h4>
                <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-x-auto font-mono whitespace-pre-wrap break-all">
                  {error.stack_trace}
                </pre>
              </div>
            )}

            {/* Metadata */}
            {error.metadata && Object.keys(error.metadata).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Metadata</h4>
                <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-x-auto font-mono">
                  {JSON.stringify(error.metadata, null, 2)}
                </pre>
              </div>
            )}

            {/* Resolution Notes */}
            {error.resolution_notes && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Notas de Resolução</h4>
                <p className="text-sm bg-green-500/10 text-green-700 p-3 rounded-lg">
                  {error.resolution_notes}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyError}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar Erro
          </Button>
          
          <div className="flex gap-2">
            {error.status !== 'ignored' && (
              <Button variant="outline" size="sm" onClick={handleMarkIgnored}>
                Ignorar
              </Button>
            )}
            {error.status !== 'resolved' && (
              <Button size="sm" onClick={handleMarkResolved}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Marcar Resolvido
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
