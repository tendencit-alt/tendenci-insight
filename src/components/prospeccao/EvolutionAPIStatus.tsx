import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { WifiOff, Wifi, RefreshCw, AlertTriangle } from "lucide-react";

interface HealthStatus {
  online: boolean;
  error?: string;
  is_network_error?: boolean;
  checked_at: string;
}

export function EvolutionAPIStatus() {
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkHealth = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-evolution-health');
      
      if (error) {
        setStatus({
          online: false,
          error: error.message,
          checked_at: new Date().toISOString()
        });
      } else {
        setStatus(data as HealthStatus);
      }
      setLastCheck(new Date());
    } catch (err) {
      setStatus({
        online: false,
        error: err instanceof Error ? err.message : 'Erro ao verificar',
        checked_at: new Date().toISOString()
      });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    // Check on mount
    checkHealth();

    // Check every 2 minutes
    const interval = setInterval(checkHealth, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Don't show anything while loading initial check
  if (status === null && checking) {
    return null;
  }

  // Don't show alert if online
  if (status?.online) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
        <Wifi className="h-3 w-3 text-green-500" />
        <span>Servidor WhatsApp online</span>
        {lastCheck && (
          <span className="text-muted-foreground/60">
            • verificado {formatTimeAgo(lastCheck)}
          </span>
        )}
      </div>
    );
  }

  // Show alert if offline
  return (
    <Alert variant="destructive" className="mb-4 border-destructive/50 bg-destructive/10">
      <WifiOff className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        Servidor WhatsApp Offline
        <Badge variant="destructive" className="text-xs">Crítico</Badge>
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-2">
          O servidor Evolution API está inacessível. 
          <strong> Campanhas não poderão ser disparadas</strong> até que o servidor volte.
        </p>
        {status?.error && (
          <p className="text-xs text-muted-foreground mb-2">
            Erro: {status.error}
          </p>
        )}
        <div className="flex items-center gap-4 mt-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkHealth}
            disabled={checking}
            className="gap-2"
          >
            <RefreshCw className={`h-3 w-3 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Verificando...' : 'Verificar Novamente'}
          </Button>
          {lastCheck && (
            <span className="text-xs text-muted-foreground">
              Última verificação: {formatTimeAgo(lastCheck)}
            </span>
          )}
        </div>
        <div className="mt-3 p-2 bg-muted/50 rounded text-xs">
          <AlertTriangle className="h-3 w-3 inline mr-1" />
          <strong>Ação necessária:</strong> Verifique o servidor Evolution API no EasyPanel 
          e reinicie se necessário.
        </div>
      </AlertDescription>
    </Alert>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'agora';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min atrás`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
