import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wifi, WifiOff, QrCode, RefreshCw, Check, AlertTriangle, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConnectionData {
  id: string;
  instance_name: string;
  status: string;
  phone_number: string | null;
  qr_code_base64: string | null;
  is_ia_instance: boolean;
  webhook_url: string | null;
}

export function IAWhatsAppConnection() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionData | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [needsWebhookFix, setNeedsWebhookFix] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';

  const loadConnection = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tendenci_whatsapp_connections')
        .select('id, instance_name, status, phone_number, qr_code_base64, is_ia_instance, webhook_url')
        .eq('is_ia_instance', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConnection(data);
        if (data.qr_code_base64) {
          setQrCode(data.qr_code_base64);
        }
        
        // Verificar se webhook precisa ser reconfigurado
        if (!data.webhook_url || !data.webhook_url.includes(supabaseUrl)) {
          setNeedsWebhookFix(true);
        } else {
          setNeedsWebhookFix(false);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar conexão:", error);
    } finally {
      setLoading(false);
    }
  }, [supabaseUrl]);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  // Polling para status quando conectando
  useEffect(() => {
    if (!connection || connection.status !== 'connecting') return;

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('whatsapp-evolution', {
          body: { action: 'check-status', instanceName: connection.instance_name }
        });

        if (!error && data?.status === 'connected') {
          toast.success("WhatsApp conectado com sucesso!");
          loadConnection();
        }
      } catch (err) {
        console.error("Erro no polling:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [connection, loadConnection]);

  const handleCreateIA = async () => {
    setActionLoading('create');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('whatsapp-evolution', {
        body: { 
          action: 'create-ia', 
          instanceName: 'IA-Atendimento',
          user_id: user?.id 
        }
      });

      if (error) throw error;

      if (data?.qrCode) {
        setQrCode(data.qrCode);
        toast.success("Instância criada! Escaneie o QR Code.");
      }
      
      await loadConnection();
    } catch (error) {
      console.error("Erro ao criar instância:", error);
      toast.error("Erro ao criar instância IA");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReconnect = async () => {
    if (!connection) return;
    
    setActionLoading('reconnect');
    try {
      // Gerar novo QR Code
      const { data, error } = await supabase.functions.invoke('whatsapp-evolution', {
        body: { action: 'qrcode', instanceName: connection.instance_name }
      });

      if (error) throw error;

      if (data?.qrCode) {
        setQrCode(data.qrCode);
        toast.success("Novo QR Code gerado! Escaneie para reconectar.");
      }

      // Auto-reconfigurar webhook após gerar QR
      await handleReconfigureWebhook(true);
      
      await loadConnection();
    } catch (error) {
      console.error("Erro ao reconectar:", error);
      toast.error("Erro ao gerar QR Code");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReconfigureWebhook = async (silent = false) => {
    if (!connection) return;
    
    if (!silent) setActionLoading('webhook');
    
    try {
      const { error } = await supabase.functions.invoke('whatsapp-evolution', {
        body: { action: 'reconfigure-webhook', instanceName: connection.instance_name }
      });

      if (error) throw error;

      if (!silent) {
        toast.success("Webhook reconfigurado para Supabase!");
      }
      setNeedsWebhookFix(false);
      await loadConnection();
    } catch (error) {
      console.error("Erro ao reconfigurar webhook:", error);
      if (!silent) {
        toast.error("Erro ao reconfigurar webhook");
      }
    } finally {
      if (!silent) setActionLoading(null);
    }
  };

  const handleCheckStatus = async () => {
    if (!connection) return;
    
    setActionLoading('status');
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-evolution', {
        body: { action: 'check-status', instanceName: connection.instance_name }
      });

      if (error) throw error;

      toast.success(`Status: ${data?.status || 'Desconhecido'}`);
      await loadConnection();
    } catch (error) {
      console.error("Erro ao verificar status:", error);
      toast.error("Erro ao verificar status");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Sem conexão - mostrar botão de criar
  if (!connection) {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <WifiOff className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Nenhuma conexão WhatsApp configurada</p>
          <p className="text-sm text-muted-foreground">
            Configure uma conexão para ativar o atendimento por IA
          </p>
        </div>
        <Button 
          onClick={handleCreateIA} 
          disabled={actionLoading === 'create'}
          className="gap-2"
        >
          {actionLoading === 'create' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wifi className="h-4 w-4" />
          )}
          Conectar WhatsApp da IA
        </Button>
      </div>
    );
  }

  const isConnected = connection.status === 'connected';
  const isConnecting = connection.status === 'connecting';

  return (
    <div className="space-y-4">
      {/* Status e Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isConnected ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
            {isConnected ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-yellow-500" />
            )}
          </div>
          <div>
            <p className="font-medium">{connection.instance_name}</p>
            <p className="text-sm text-muted-foreground">
              {connection.phone_number || 'Aguardando conexão...'}
            </p>
          </div>
        </div>
        <Badge variant={isConnected ? "default" : "secondary"} className={isConnected ? "bg-green-500" : ""}>
          {isConnected ? "Conectado" : isConnecting ? "Conectando..." : connection.status}
        </Badge>
      </div>

      {/* Alerta de Webhook */}
      {needsWebhookFix && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Webhook não configurado para Supabase
            </p>
            <p className="text-xs text-muted-foreground">
              O atendimento por IA pode não funcionar. Clique em "Reconfigurar" para corrigir.
            </p>
          </div>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleReconfigureWebhook(false)}
            disabled={actionLoading === 'webhook'}
            className="gap-1"
          >
            {actionLoading === 'webhook' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Settings className="h-3 w-3" />
            )}
            Reconfigurar
          </Button>
        </div>
      )}

      {/* QR Code */}
      {(isConnecting || qrCode) && qrCode && (
        <div className="flex flex-col items-center py-4 space-y-3">
          <p className="text-sm text-muted-foreground">Escaneie o QR Code com o WhatsApp</p>
          <div className="p-4 bg-white rounded-lg">
            <img 
              src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
              alt="QR Code" 
              className="w-48 h-48"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Abra o WhatsApp → Menu → Dispositivos conectados → Conectar dispositivo
          </p>
        </div>
      )}

      {/* Sucesso */}
      {isConnected && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <Check className="h-5 w-5 text-green-500" />
          <p className="text-sm text-green-700 dark:text-green-300">
            WhatsApp conectado e pronto para atender!
          </p>
        </div>
      )}

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleCheckStatus}
          disabled={!!actionLoading}
          className="gap-1"
        >
          {actionLoading === 'status' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Verificar Status
        </Button>
        
        {!isConnected && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleReconnect}
            disabled={!!actionLoading}
            className="gap-1"
          >
            {actionLoading === 'reconnect' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <QrCode className="h-3 w-3" />
            )}
            Gerar Novo QR Code
          </Button>
        )}

        {!needsWebhookFix && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleReconfigureWebhook(false)}
            disabled={!!actionLoading}
            className="gap-1 text-muted-foreground"
          >
            <Settings className="h-3 w-3" />
            Reconfigurar Webhook
          </Button>
        )}
      </div>
    </div>
  );
}
