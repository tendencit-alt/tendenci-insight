import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { QrCode, Smartphone, Power, Trash2, RefreshCw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WhatsAppConnection {
  id: string;
  instance_name: string;
  instance_id: string | null;
  phone_number: string | null;
  status: string;
  qr_code: string | null;
  qr_code_base64: string | null;
  created_at: string;
  connected_at: string | null;
  metadata: any;
}

export function WhatsAppConnectionManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [qrCodeDialog, setQrCodeDialog] = useState<WhatsAppConnection | null>(null);
  const queryClient = useQueryClient();

  // ✅ FASE 5: Buscar conexões SEM polling manual - confiar no Realtime
  const { data: connections, isLoading, refetch } = useQuery({
    queryKey: ["whatsapp-connections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tendenci_whatsapp_connections")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WhatsAppConnection[];
    },
  });

  // ✅ Supabase Realtime para updates instantâneos
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-connections-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tendenci_whatsapp_connections'
        },
        (payload) => {
          console.log('🔔 Realtime WhatsApp update:', payload);
          queryClient.invalidateQueries({ queryKey: ['whatsapp-connections'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // ✅ FASE 1: Auto-close modal quando conectar
  useEffect(() => {
    if (!qrCodeDialog) return;

    const currentConnection = connections?.find(c => c.id === qrCodeDialog.id);
    
    if (currentConnection?.status === 'connected' && currentConnection.phone_number) {
      // 🎉 CONECTOU COM SUCESSO!
      console.log('✅ WhatsApp connected successfully:', currentConnection.phone_number);
      
      // 1. Toast animado de sucesso
      toast.success(
        `✅ WhatsApp conectado com sucesso!\n📱 ${currentConnection.phone_number}`,
        {
          duration: 5000,
          style: {
            background: '#10b981',
            color: 'white',
            fontSize: '16px',
            fontWeight: 'bold'
          }
        }
      );
      
      // 2. Fechar modal após 1.5s (tempo para usuário ver animação)
      setTimeout(() => {
        setQrCodeDialog(null);
      }, 1500);
      
      // 3. Invalidar queries
      queryClient.invalidateQueries({ queryKey: ['whatsapp-connections'] });
    }
  }, [connections, qrCodeDialog, queryClient]);

  // ✅ FASE 4: Detectar timeout de conexões travadas (> 2 minutos)
  useEffect(() => {
    if (!connections) return;
    
    const stuckConnections = connections.filter(conn => {
      if (conn.status !== 'connecting') return false;
      
      const lastUpdate = new Date(conn.created_at).getTime();
      const minutesSinceUpdate = (Date.now() - lastUpdate) / 1000 / 60;
      
      return minutesSinceUpdate > 2;
    });
    
    stuckConnections.forEach(conn => {
      console.warn('⚠️ Connection stuck:', conn.instance_name);
      toast.error(
        `⚠️ Conexão "${conn.instance_name}" travada há mais de 2 minutos.\nClique em "Gerar Novo QR Code" ou delete e recrie.`,
        {
          duration: 10000,
          action: {
            label: 'Gerar QR Code',
            onClick: () => getQrCodeMutation.mutate(conn)
          }
        }
      );
    });
  }, [connections]);

  // Criar nova conexão
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      // Limpar nome da instância (remover espaços)
      const cleanName = name.trim().replace(/\s+/g, '-');
      
      const { data, error } = await supabase.functions.invoke("whatsapp-evolution", {
        body: {
          action: "create",
          instanceName: cleanName,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao criar instância");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] });
      setDialogOpen(false);
      setInstanceName("");
      
      if (data.connection) {
        // Esperar 2 segundos antes de buscar QR code para garantir que foi gerado
        setTimeout(() => {
          setQrCodeDialog(data.connection);
        }, 2000);
      }
      toast.success("Instância criada! Aguarde o QR Code...");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar instância. Verifique se o Evolution API está configurado.");
    },
  });

  // Obter QR Code
  const getQrCodeMutation = useMutation({
    mutationFn: async (connection: WhatsAppConnection) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-evolution", {
        body: {
          action: "qrcode",
          instanceName: connection.instance_name,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return { ...connection, qr_code_base64: data.qrCode };
    },
    onSuccess: (connection) => {
      setQrCodeDialog(connection);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] });
      toast.success("QR Code atualizado!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao obter QR Code");
    },
  });

  // Desconectar
  const disconnectMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-evolution", {
        body: {
          action: "disconnect",
          instanceName,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] });
      toast.success("Desconectado com sucesso");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao desconectar");
    },
  });

  // Deletar
  const deleteMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-evolution", {
        body: {
          action: "delete",
          instanceName,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] });
      toast.success(data.message || "Instância removida");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao deletar");
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: any }> = {
      connected: { label: "Conectado", variant: "default" },
      connecting: { label: "Conectando...", variant: "secondary" },
      disconnected: { label: "Desconectado", variant: "outline" },
      error: { label: "Erro", variant: "destructive" },
    };
    const config = variants[status] || variants.disconnected;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Instruções de Uso */}
      <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
        <QrCode className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <div className="space-y-2">
            <p className="font-semibold">Como conectar sua instância WhatsApp:</p>
            <ol className="list-decimal list-inside text-sm space-y-1 ml-2">
              <li>Clique em "Nova Conexão" e escolha um nome único</li>
              <li>Aguarde o QR Code aparecer (pode levar até 10 segundos)</li>
              <li>No seu celular, abra WhatsApp → Menu (⋮) → Dispositivos conectados</li>
              <li>Toque em "Conectar um dispositivo" e escaneie o QR Code</li>
              <li><strong>Aguarde o status mudar para "Conectado" (verde) com seu número de telefone</strong></li>
              <li><strong>Somente instâncias "Conectadas" podem ser usadas em campanhas</strong></li>
            </ol>
            <p className="text-sm font-medium mt-2 text-yellow-700 dark:text-yellow-400">⚠️ O QR Code expira em 60 segundos. Se expirar, clique em "Gerar Novo QR Code".</p>
            <p className="text-sm font-semibold mt-2 text-red-600 dark:text-red-400">🔴 Se ficar muito tempo em "Conectando..." sem mostrar número, delete a instância e crie uma nova.</p>
          </div>
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Conexões WhatsApp</h2>
          <p className="text-muted-foreground">Gerencie conexões via Evolution API</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sincronizar Status
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Smartphone className="h-4 w-4" />
                Nova Conexão
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Conexão WhatsApp</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instance">Nome da Instância *</Label>
                <Input
                  id="instance"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder="Ex: vendas-whatsapp"
                />
                <p className="text-xs text-muted-foreground">
                  Use apenas letras, números e hífens
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Após criar, você precisará escanear um QR Code com seu WhatsApp
                </AlertDescription>
              </Alert>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => createMutation.mutate(instanceName)}
                  disabled={!instanceName || createMutation.isPending}
                >
                  Criar Conexão
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={!!qrCodeDialog} onOpenChange={(open) => !open && setQrCodeDialog(null)}>
        <DialogContent 
          className="max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Escaneie o QR Code</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <QrCode className="h-4 w-4" />
              <AlertDescription>
                {connections?.find(c => c.id === qrCodeDialog?.id)?.status === 'connected' 
                  ? "✅ WhatsApp conectado com sucesso! Fechando em instantes..."
                  : "Abra o WhatsApp no seu celular, vá em Dispositivos Conectados e escaneie este código. Aguardando conexão..."
                }
              </AlertDescription>
            </Alert>

            {qrCodeDialog?.qr_code_base64 ? (
              <div className="relative">
                {/* QR Code */}
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img
                    src={qrCodeDialog.qr_code_base64}
                    alt="QR Code"
                    className="w-64 h-64"
                  />
                </div>

                {/* ✅ FASE 2: Overlay "Verificando conexão..." */}
                {connections?.find(c => c.id === qrCodeDialog.id)?.status === 'connecting' && 
                 connections?.find(c => c.id === qrCodeDialog.id)?.connected_at && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <div className="text-center text-white">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="font-semibold">Verificando conexão...</p>
                    </div>
                  </div>
                )}

                {/* ✅ FASE 2: Overlay de SUCESSO com animação */}
                {connections?.find(c => c.id === qrCodeDialog.id)?.status === 'connected' && (
                  <div className="absolute inset-0 bg-green-500 flex items-center justify-center rounded-lg animate-in fade-in zoom-in duration-500">
                    <div className="text-center text-white">
                      <div className="text-6xl mb-4 animate-bounce">🎉</div>
                      <p className="text-2xl font-bold">Conectado!</p>
                      <p className="text-sm mt-2">
                        {connections?.find(c => c.id === qrCodeDialog.id)?.phone_number}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center h-64 bg-muted rounded-lg gap-2">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
              </div>
            )}

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => qrCodeDialog && getQrCodeMutation.mutate(qrCodeDialog)}
                disabled={getQrCodeMutation.isPending}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {getQrCodeMutation.isPending ? "Atualizando..." : "Gerar Novo QR Code"}
              </Button>
              
              <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  Se o QR Code não aparecer ou expirar, clique em "Gerar Novo QR Code"
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lista de Conexões */}
      {isLoading ? (
        <div className="text-center py-8">Carregando conexões...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connections?.map((connection) => {
            // Verificar se está preso em connecting por muito tempo (> 5 minutos)
            const createdAt = new Date(connection.created_at);
            const minutesSinceCreation = (Date.now() - createdAt.getTime()) / 1000 / 60;
            const isStuckConnecting = connection.status === 'connecting' && minutesSinceCreation > 5;

            return (
              <Card key={connection.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">{connection.instance_name}</h3>
                      </div>
                      {connection.phone_number && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {connection.phone_number}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(connection.status)}
                  </div>

                  {/* Alerta de QR Code expirado */}
                  {isStuckConnecting && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        QR Code expirado ou conexão travada. Clique em "Gerar Novo QR Code" abaixo.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Alerta de instância não utilizável em campanhas */}
                  {connection.status === 'connecting' && !connection.phone_number && (
                    <Alert className="py-2 bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
                      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <AlertDescription className="text-xs text-yellow-800 dark:text-yellow-200">
                        Esta instância não pode ser usada em campanhas até estar "Conectada" com número de telefone.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    {connection.status === 'disconnected' || connection.status === 'connecting' ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => getQrCodeMutation.mutate(connection)}
                          disabled={getQrCodeMutation.isPending}
                        >
                          <QrCode className="h-4 w-4 mr-2" />
                          {isStuckConnecting ? "Gerar Novo QR Code" : "Conectar"}
                        </Button>
                        
                        {isStuckConnecting && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              toast.info("Regenerando QR Code...");
                              getQrCodeMutation.mutate(connection);
                            }}
                            disabled={getQrCodeMutation.isPending}
                          >
                            🔄 Forçar Reconexão
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => disconnectMutation.mutate(connection.instance_name)}
                        disabled={disconnectMutation.isPending}
                      >
                        <Power className="h-4 w-4 mr-2" />
                        Desconectar
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Tem certeza que deseja remover "${connection.instance_name}"?`)) {
                          deleteMutation.mutate(connection.instance_name);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}

          {connections?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma conexão WhatsApp configurada</p>
              <p className="text-sm">Clique em "Nova Conexão" para começar</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}