import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Smartphone, Plus, QrCode, Trash2, AlertCircle, CheckCircle2, Clock, RefreshCw } from "lucide-react";

interface WhatsAppConnection {
  id: string;
  instance_name: string;
  instance_id: string | null;
  phone_number: string | null;
  status: 'connected' | 'connecting' | 'disconnected';
  qr_code: string | null;
  qr_code_base64: string | null;
  connected_at: string | null;
  created_at: string;
  last_sync: string | null;
}

interface QRCodeDialog {
  id: string;
  instance_name: string;
  qr_code_base64: string | null;
  status: string;
}

export default function WhatsAppConnectionManager() {
  const queryClient = useQueryClient();
  const [newInstanceName, setNewInstanceName] = useState("");
  const [qrCodeDialog, setQrCodeDialog] = useState<QRCodeDialog | null>(null);

  // Buscar conexões
  const { data: connections, isLoading } = useQuery({
    queryKey: ["whatsapp-connections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tendenci_whatsapp_connections")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as WhatsAppConnection[];
    },
    refetchInterval: 3000, // Polling a cada 3s
  });

  // Realtime para updates instantâneos
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tendenci_whatsapp_connections'
        },
        (payload) => {
          console.log('🔔 Realtime update:', payload);
          
          // Se mudou de connecting para connected
          if (payload.eventType === 'UPDATE') {
            const newData = payload.new as any;
            const oldData = payload.old as any;
            
            if (oldData?.status === 'connecting' && newData?.status === 'connected') {
              toast.success(
                `✅ ${newData.instance_name} conectado!\n📱 ${newData.phone_number}`,
                { duration: 5000 }
              );
              
              // Fechar modal se estiver aberto
              if (qrCodeDialog && qrCodeDialog.id === newData.id) {
                setTimeout(() => setQrCodeDialog(null), 1500);
              }
            }
          }
          
          queryClient.invalidateQueries({ queryKey: ['whatsapp-connections'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, qrCodeDialog]);

  // Criar instância
  const createMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-evolution", {
        body: { action: "create", instanceName },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Instância criada! Aguarde o QR Code...");
      setNewInstanceName("");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] });
      
      // Aguardar 2s e buscar conexão
      setTimeout(async () => {
        const { data: conns } = await supabase
          .from("tendenci_whatsapp_connections")
          .select("*")
          .eq("instance_name", data.instanceName || newInstanceName)
          .single();
        
        if (conns && conns.qr_code_base64) {
          setQrCodeDialog({
            id: conns.id,
            instance_name: conns.instance_name,
            qr_code_base64: conns.qr_code_base64,
            status: conns.status
          });
        }
      }, 2000);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar instância");
    },
  });

  // Gerar novo QR Code
  const getQrCodeMutation = useMutation({
    mutationFn: async (connection: WhatsAppConnection) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-evolution", {
        body: { action: "qrcode", instanceName: connection.instance_name },
      });
      if (error) throw error;
      return { ...data, connectionId: connection.id, instanceName: connection.instance_name };
    },
    onSuccess: (data) => {
      toast.success("Novo QR Code gerado!");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] });
      
      if (data.qrCode) {
        setQrCodeDialog({
          id: data.connectionId,
          instance_name: data.instanceName,
          qr_code_base64: data.qrCode,
          status: 'connecting'
        });
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao gerar QR Code");
    },
  });

  // Deletar
  const deleteMutation = useMutation({
    mutationFn: async (connection: WhatsAppConnection) => {
      const { error } = await supabase.functions.invoke("whatsapp-evolution", {
        body: { action: "delete", instanceName: connection.instance_name },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Instância excluída!");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao excluir");
    },
  });

  // Verificar status manualmente
  const checkStatusMutation = useMutation({
    mutationFn: async (connection: WhatsAppConnection) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-evolution", {
        body: { action: "check-status", instanceName: connection.instance_name },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.updated) {
        toast.success(`Status atualizado: ${data.status}`);
      } else {
        toast.info(`Status atual: ${data.status}`);
      }
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao verificar status");
    },
  });

  const getStatusBadge = (status: string) => {
    if (status === 'connected') {
      return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Conectado</Badge>;
    }
    if (status === 'connecting') {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-500"><Clock className="h-3 w-3 mr-1" />Conectando</Badge>;
    }
    return <Badge variant="destructive">Desconectado</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp API - Evolution</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Criar Nova Conexão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            WhatsApp API - Evolution
          </CardTitle>
          <CardDescription>
            Gerencie suas conexões WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="instanceName">Nome da Instância</Label>
              <Input
                id="instanceName"
                placeholder="Ex: vendas, suporte, marketing..."
                value={newInstanceName}
                onChange={(e) => setNewInstanceName(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => createMutation.mutate(newInstanceName)}
                disabled={!newInstanceName || createMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Conexão
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Conexões */}
      {connections && connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conexões Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {connections.map((connection) => (
                <div key={connection.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold">{connection.instance_name}</h4>
                        {getStatusBadge(connection.status)}
                      </div>
                      {connection.phone_number && (
                        <p className="text-sm text-muted-foreground">
                          📱 {connection.phone_number}
                        </p>
                      )}
                      {connection.connected_at && (
                        <p className="text-xs text-muted-foreground">
                          Conectado em: {new Date(connection.connected_at).toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {connection.status === 'connecting' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (connection.qr_code_base64) {
                              setQrCodeDialog({
                                id: connection.id,
                                instance_name: connection.instance_name,
                                qr_code_base64: connection.qr_code_base64,
                                status: connection.status
                              });
                            } else {
                              getQrCodeMutation.mutate(connection);
                            }
                          }}
                        >
                          <QrCode className="h-4 w-4 mr-1" />
                          Ver QR Code
                        </Button>
                      )}
                      
                      {connection.status === 'connected' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => getQrCodeMutation.mutate(connection)}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Gerar Novo QR
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => checkStatusMutation.mutate(connection)}
                        disabled={checkStatusMutation.isPending}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm(`Excluir ${connection.instance_name}?`)) {
                            deleteMutation.mutate(connection);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal QR Code */}
      <Dialog open={!!qrCodeDialog} onOpenChange={(open) => !open && setQrCodeDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>
              {qrCodeDialog?.instance_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {qrCodeDialog?.qr_code_base64 ? (
              <>
                <div className="flex justify-center bg-white p-4 rounded-lg">
                  <img
                    src={qrCodeDialog.qr_code_base64}
                    alt="QR Code"
                    className="w-64 h-64"
                  />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-2">📱 Como conectar:</p>
                    <ol className="text-sm space-y-1 list-decimal list-inside">
                      <li>Abra o WhatsApp no celular</li>
                      <li>Vá em Configurações → Aparelhos Conectados</li>
                      <li>Toque em "Conectar Aparelho"</li>
                      <li>Escaneie o QR Code acima</li>
                    </ol>
                    <p className="text-xs mt-2 text-muted-foreground">
                      ⏱️ O sistema detectará automaticamente quando você escanear
                    </p>
                  </AlertDescription>
                </Alert>

                {qrCodeDialog.status === 'connecting' && (
                  <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center justify-center gap-2 text-yellow-800 dark:text-yellow-200">
                      <div className="animate-pulse">📱</div>
                      <p className="text-sm font-medium">Aguardando você escanear...</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-center text-muted-foreground">Gerando QR Code...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
