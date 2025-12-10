import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Bot, Loader2, QrCode, Wifi, WifiOff, RefreshCw, CheckCircle2, ExternalLink, AlertCircle, RotateCcw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const N8N_WEBHOOK_URL = "https://n8n.agendacorretor.online/webhook/receber-mensagens";

type LogEntry = {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
};

export default function IAWhatsAppSetup() {
  const navigate = useNavigate();
  const [instanceName, setInstanceName] = useState("IA-Atendimento");
  const [isCreating, setIsCreating] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [existingConnection, setExistingConnection] = useState<any>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setLogs(prev => [...prev, { time, message, type }]);
  };

  // Buscar conexão existente da IA ao carregar
  useEffect(() => {
    checkExistingConnection();
    
    // Cleanup polling on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const checkExistingConnection = async () => {
    try {
      addLog('Verificando conexão existente...', 'info');
      
      // Buscar instância usando is_ia_instance = true (mais robusto que ilike)
      const { data, error } = await supabase
        .from('tendenci_whatsapp_connections')
        .select('id, instance_name, status, phone_number, qr_code_base64, is_ia_instance')
        .eq('is_ia_instance', true)
        .maybeSingle();

      if (data && !error) {
        setExistingConnection(data);
        setInstanceName(data.instance_name);
        setStatus(data.status as 'disconnected' | 'connecting' | 'connected');
        setPhoneNumber(data.phone_number);
        if (data.qr_code_base64) {
          setQrCode(data.qr_code_base64);
        }
        addLog(`Conexão encontrada: ${data.instance_name} (${data.status})`, 'success');
        
        // Se está conectando, iniciar polling
        if (data.status === 'connecting') {
          startStatusPolling();
        }
      } else {
        addLog('Nenhuma conexão de IA encontrada', 'info');
      }
    } catch (err) {
      addLog('Erro ao verificar conexão existente', 'error');
    }
  };

  const handleCreateIA = async () => {
    if (!instanceName.trim()) {
      toast.error("Digite um nome para a instância");
      return;
    }

    setIsCreating(true);
    setQrCode(null);
    setStatus('connecting');
    setLogs([]);

    try {
      addLog('🚀 Iniciando criação da instância...', 'info');
      addLog(`📝 Nome: ${instanceName}`, 'info');
      addLog(`🔗 Webhook: ${N8N_WEBHOOK_URL}`, 'info');
      
      const { data, error } = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'create-ia',
          instanceName: instanceName.trim(),
          webhookUrl: N8N_WEBHOOK_URL
        }
      });

      if (error) {
        addLog(`❌ Erro: ${error.message}`, 'error');
        throw error;
      }

      addLog('✅ Instância criada na Evolution API', 'success');

      if (data?.qrCode) {
        setQrCode(data.qrCode);
        addLog('📱 QR Code gerado com sucesso!', 'success');
        toast.success("QR Code gerado! Escaneie com o WhatsApp da IA.");
        
        // Iniciar polling de status
        startStatusPolling();
      } else {
        addLog('⏳ Aguardando QR Code...', 'warning');
        toast.warning("Instância criada, aguardando QR Code...");
        // Tentar buscar QR Code após delay
        setTimeout(() => refreshQRCode(), 3000);
      }

      await checkExistingConnection();
    } catch (err: any) {
      console.error('Erro ao criar IA:', err);
      addLog(`❌ Falha na criação: ${err.message || 'Erro desconhecido'}`, 'error');
      toast.error(err.message || "Erro ao criar instância da IA");
      setStatus('disconnected');
    } finally {
      setIsCreating(false);
    }
  };

  const handleReconnect = async () => {
    if (!existingConnection) return;
    
    setIsCheckingStatus(true);
    addLog('🔄 Tentando reconectar...', 'info');
    
    try {
      // Primeiro tenta só gerar novo QR code
      const { data, error } = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'qrcode',
          instanceName: existingConnection.instance_name
        }
      });

      if (data?.qrCode) {
        setQrCode(data.qrCode);
        setStatus('connecting');
        addLog('📱 Novo QR Code gerado!', 'success');
        toast.success("Novo QR Code gerado! Escaneie novamente.");
        startStatusPolling();
      } else {
        addLog('⚠️ Não foi possível gerar QR Code', 'warning');
        // Se falhou, recreate a instância
        addLog('🔄 Recriando instância...', 'info');
        await handleCreateIA();
      }
    } catch (err: any) {
      addLog(`❌ Erro ao reconectar: ${err.message}`, 'error');
      toast.error("Erro ao reconectar. Tente criar novamente.");
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const refreshQRCode = async () => {
    setIsCheckingStatus(true);
    addLog('🔄 Atualizando QR Code...', 'info');
    
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'qrcode',
          instanceName
        }
      });

      if (error) {
        addLog(`❌ Erro: ${error.message}`, 'error');
        throw error;
      }

      if (data?.qrCode) {
        setQrCode(data.qrCode);
        addLog('✅ Novo QR Code gerado!', 'success');
        toast.success("Novo QR Code gerado!");
      } else {
        addLog('⚠️ QR Code não retornado', 'warning');
      }
    } catch (err: any) {
      console.error('Erro ao atualizar QR Code:', err);
      addLog(`❌ Falha ao atualizar QR Code`, 'error');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const checkStatus = async () => {
    setIsCheckingStatus(true);
    addLog('🔍 Verificando status...', 'info');
    
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-evolution', {
        body: {
          action: 'check-status',
          instanceName
        }
      });

      if (error) {
        addLog(`❌ Erro: ${error.message}`, 'error');
        throw error;
      }

      if (data) {
        addLog(`📊 Status: ${data.status || data.isConnected ? 'conectado' : 'aguardando'}`, 'info');
        
        if (data.isConnected) {
          setStatus('connected');
          setPhoneNumber(data.phoneNumber);
          setQrCode(null);
          addLog('✅ IA conectada com sucesso!', 'success');
          toast.success("✅ IA conectada com sucesso!");
          
          // Parar polling
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        } else {
          setStatus('connecting');
          addLog('⏳ Aguardando conexão...', 'warning');
        }
      }
    } catch (err: any) {
      console.error('Erro ao verificar status:', err);
      addLog(`❌ Erro ao verificar status`, 'error');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const startStatusPolling = () => {
    // Limpar polling anterior se existir
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    addLog('⏱️ Polling iniciado (10 min)', 'info');
    
    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke('whatsapp-evolution', {
          body: { action: 'check-status', instanceName }
        });

        if (data?.isConnected) {
          setStatus('connected');
          setPhoneNumber(data.phoneNumber);
          setQrCode(null);
          
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          
          addLog('✅ IA conectada com sucesso!', 'success');
          toast.success("✅ IA conectada com sucesso!");
        }
      } catch (err) {
        // Continua polling
      }
    }, 5000);

    // Parar após 10 minutos (extendido de 5)
    setTimeout(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        addLog('⏱️ Polling expirado (10 min)', 'warning');
      }
    }, 600000); // 10 minutos
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500 text-white"><Wifi className="h-3 w-3 mr-1" /> Conectado</Badge>;
      case 'connecting':
        return <Badge variant="secondary" className="bg-yellow-500 text-white"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Aguardando</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground"><WifiOff className="h-3 w-3 mr-1" /> Desconectado</Badge>;
    }
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'error': return <AlertCircle className="h-3 w-3 text-red-500" />;
      case 'warning': return <AlertCircle className="h-3 w-3 text-yellow-500" />;
      default: return <Bot className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bot className="h-7 w-7 text-primary" />
              Conexão da IA de Atendimento
            </h1>
            <p className="text-muted-foreground">Configure o WhatsApp da IA em um clique</p>
          </div>
        </div>

        {/* Card de Configuração */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Configuração da Instância</span>
              {getStatusBadge()}
            </CardTitle>
            <CardDescription>
              A IA será conectada automaticamente ao seu fluxo n8n
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instanceName">Nome da Instância</Label>
              <Input
                id="instanceName"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder="IA-Atendimento"
                disabled={status === 'connected'}
              />
            </div>

            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 text-sm">
                <ExternalLink className="h-4 w-4 text-primary" />
                <span className="font-medium">Webhook N8N:</span>
              </div>
              <code className="text-xs text-muted-foreground break-all mt-1 block">
                {N8N_WEBHOOK_URL}
              </code>
              <Badge variant="outline" className="mt-2 text-green-600 border-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Configurado automaticamente
              </Badge>
            </div>

            <div className="flex gap-2">
              {status !== 'connected' && (
                <Button
                  onClick={handleCreateIA}
                  disabled={isCreating || !instanceName.trim()}
                  className="flex-1"
                  size="lg"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando instância...
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4 mr-2" />
                      🚀 Conectar IA
                    </>
                  )}
                </Button>
              )}
              
              {existingConnection && status !== 'connected' && (
                <Button
                  onClick={handleReconnect}
                  disabled={isCheckingStatus || isCreating}
                  variant="outline"
                  size="lg"
                >
                  <RotateCcw className={`h-4 w-4 mr-2 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                  Reconectar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card do QR Code */}
        {(qrCode || status === 'connecting') && status !== 'connected' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                QR Code
              </CardTitle>
              <CardDescription>
                Escaneie o código abaixo com o WhatsApp que será usado pela IA
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              {qrCode ? (
                <div className="p-4 bg-white rounded-lg shadow-inner">
                  <img
                    src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                    alt="QR Code WhatsApp"
                    className="w-64 h-64"
                  />
                </div>
              ) : (
                <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={refreshQRCode} disabled={isCheckingStatus}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                  Novo QR Code
                </Button>
                <Button variant="outline" onClick={checkStatus} disabled={isCheckingStatus}>
                  <Wifi className="h-4 w-4 mr-2" />
                  Verificar Status
                </Button>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Abra o WhatsApp no celular da IA → Configurações → Dispositivos conectados → Conectar dispositivo
              </p>
            </CardContent>
          </Card>
        )}

        {/* Card de Status Conectado */}
        {status === 'connected' && (
          <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                IA Conectada com Sucesso!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Instância:</span>
                  <p className="font-medium">{instanceName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Número:</span>
                  <p className="font-medium">{phoneNumber || 'Detectando...'}</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-background border">
                <p className="text-sm text-muted-foreground">
                  ✅ Todas as mensagens recebidas serão enviadas para o seu fluxo n8n automaticamente.
                </p>
              </div>

              <Button variant="outline" onClick={checkStatus} disabled={isCheckingStatus} className="w-full">
                <RefreshCw className={`h-4 w-4 mr-2 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                Atualizar Status
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Log Visual do Processo */}
        {logs.length > 0 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Log de Conexão
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-40 px-4 pb-4">
                <div className="space-y-1.5">
                  {logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-muted-foreground font-mono shrink-0">{log.time}</span>
                      {getLogIcon(log.type)}
                      <span className={
                        log.type === 'error' ? 'text-red-600' :
                        log.type === 'success' ? 'text-green-600' :
                        log.type === 'warning' ? 'text-yellow-600' :
                        'text-muted-foreground'
                      }>{log.message}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Informações Técnicas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Informações Técnicas</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2 text-muted-foreground">
            <p><strong>Instância:</strong> {instanceName}</p>
            <p><strong>Webhook:</strong> {N8N_WEBHOOK_URL}</p>
            <p><strong>Eventos:</strong> MESSAGES_UPSERT, CONNECTION_UPDATE</p>
            <p><strong>Status:</strong> {status}</p>
            <p><strong>Polling:</strong> {pollingRef.current ? 'Ativo (10 min)' : 'Inativo'}</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
