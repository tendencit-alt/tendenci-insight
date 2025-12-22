import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Play, 
  FileText,
  AlertTriangle,
  Zap,
  Info
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AutomacaoCardProps {
  nome: string;
  descricao: string;
  ativo: boolean;
  ultimaExecucao?: string | null;
  sucessos?: number;
  falhas?: number;
  endpoint?: string;
  triggerType?: 'scheduled' | 'webhook' | 'event' | 'manual';
  onViewLogs?: () => void;
  onTest?: () => void;
  onShowDetails?: () => void;
}

export function AutomacaoCard({
  nome,
  descricao,
  ativo,
  ultimaExecucao,
  sucessos = 0,
  falhas = 0,
  endpoint,
  triggerType = 'manual',
  onViewLogs,
  onTest,
  onShowDetails
}: AutomacaoCardProps) {
  const total = sucessos + falhas;
  const taxaSucesso = total > 0 ? Math.round((sucessos / total) * 100) : 0;

  const getTriggerIcon = () => {
    switch (triggerType) {
      case 'scheduled': return <Clock className="h-3 w-3" />;
      case 'webhook': return <Zap className="h-3 w-3" />;
      case 'event': return <Play className="h-3 w-3" />;
      default: return <Play className="h-3 w-3" />;
    }
  };

  const getTriggerLabel = () => {
    switch (triggerType) {
      case 'scheduled': return 'Agendado';
      case 'webhook': return 'Webhook';
      case 'event': return 'Evento';
      default: return 'Manual';
    }
  };

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onShowDetails}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-medium">{nome}</CardTitle>
              <Info className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm text-muted-foreground">{descricao}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {getTriggerIcon()}
              <span className="ml-1">{getTriggerLabel()}</span>
            </Badge>
            <Badge variant={ativo ? "default" : "secondary"}>
              {ativo ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Ativo
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Inativo
                </>
              )}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Última Execução</p>
            <p className="font-medium">
              {ultimaExecucao 
                ? format(new Date(ultimaExecucao), "dd/MM HH:mm", { locale: ptBR })
                : "Nunca"
              }
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Execuções</p>
            <p className="font-medium">
              <span className="text-green-600">{sucessos}</span>
              {" / "}
              <span className="text-red-600">{falhas}</span>
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Taxa Sucesso</p>
            <p className={`font-medium ${taxaSucesso >= 80 ? 'text-green-600' : taxaSucesso >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {taxaSucesso}%
            </p>
          </div>
        </div>

        {endpoint && (
          <div className="text-xs bg-muted/50 p-2 rounded font-mono truncate">
            {endpoint}
          </div>
        )}

        {falhas > 0 && (
          <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded">
            <AlertTriangle className="h-4 w-4" />
            <span>{falhas} falha(s) registrada(s)</span>
          </div>
        )}

        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          {onViewLogs && (
            <Button variant="outline" size="sm" onClick={onViewLogs}>
              <FileText className="h-4 w-4 mr-1" />
              Ver Logs
            </Button>
          )}
          {onTest && (
            <Button variant="outline" size="sm" onClick={onTest}>
              <Play className="h-4 w-4 mr-1" />
              Testar
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onShowDetails}>
            <Info className="h-4 w-4 mr-1" />
            Saiba mais
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
