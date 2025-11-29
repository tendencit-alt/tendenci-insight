import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, QrCode, Trash2, RefreshCw, Plus, Phone, Calendar, PowerOff } from "lucide-react";
import { format } from "date-fns";

interface WhatsAppConnection {
  id: string;
  instance_name: string;
  instance_id: string | null;
  status: 'connecting' | 'connected' | 'disconnected';
  phone_number: string | null;
  qr_code_base64: string | null;
  connected_at: string | null;
  created_at: string;
  webhook_configured: boolean;
}

interface QRCodeDialog {
  id: string;
  instance_name: string;
  qr_code_base64: string | null;
  status: string;
}

export default function WhatsAppConnectionManager() {
  const [newInstanceName, setNewInstanceName] = useState("");
  const [qrCodeDialog, setQrCodeDialog] = useState<QRCodeDialog | null>(null);
  const queryClient = useQueryClient();

  // 1️⃣ Query com polling para conexões
  const { data: connections, isLoading } = useQuery({
    queryKey: ["whatsapp-connections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tendenci_whatsapp_connections")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // 🔍 Auto-check status para conexões em connecting
      const connectingConns = data?.filter(c => c.status === 'connecting') || [];

      if (connectingConns.length > 0) {
        console.log(`🔄 Polling: Verificando ${connectingConns.length} conexões...`);

        // Verificar status de cada uma e atualizar no banco
        for (const conn of connectingConns) {
          try {
            console.log(`🔍 Verificando status de: ${conn.instance_name}`);
            
            const { data: statusData, error: statusError } = await supabase.functions.invoke("whatsapp-evolution", {
              body: { action: "check-status", instanceName: conn.instance_name },
            });

            if (statusError) {
              console.error(`❌ Erro ao verificar ${conn.instance_name}:`, statusError);
              continue;
            }

            console.log(`📊 Status de ${conn.instance_name}:`, statusData);

            // Se está conectado, o edge function já atualizou o banco
            if (statusData?.status === 'connected') {
              console.log(`✅ ${conn.instance_name} CONECTADO! Número: ${statusData.phoneNumber}`);
            }
          } catch (err) {
            console.error(`❌ Erro ao verificar ${conn.instance_name}:`, err);
          }
        }
      }

      return data as WhatsAppConnection[];
    },
    refetchInterval: 3000, // 3 segundos
  });

  // 2️⃣ Realtime - SIMPLIFICADO
  useEffect(() => {
    console.log('🔔 Iniciando listener Realtime para whatsapp connections...');
    
    const channel = supabase
      .channel('whatsapp-connections-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tendenci_whatsapp_connections'
        },
        (payload) => {
          const newData = payload.new as WhatsAppConnection;
          const oldData = payload.old as WhatsAppConnection;

          console.log('🔔 Realtime UPDATE recebido:', {
            instance: newData.instance_name,
            oldStatus: oldData.status,
            newStatus: newData.status,
            phoneNumber: newData.phone_number
          });

          // ✅ Detectar conexão automática
          if (oldData.status === 'connecting' && newData.status === 'connected') {
            console.log(`🎉 CONEXÃO DETECTADA! ${newData.instance_name}`);
            
            toast.success(
              `✅ ${newData.instance_name} conectado!\n📱 ${newData.phone_number || 'Número não disponível'}`,
              { duration: 5000 }
            );

            // Fechar modal se estiver aberto
            if (qrCodeDialog?.id === newData.id) {
              console.log('🚪 Fechando modal do QR Code...');
              setTimeout(() => {
                setQrCodeDialog(null);
                console.log('✅ Modal fechado!');
              }, 1500);
            }
          }

          // Atualizar lista
          console.log('🔄 Invalidando queries para atualizar lista...');
          queryClient.invalidateQueries({ queryKey: ['whatsapp-connections'] });
        }
      )
      .subscribe((status) => {
        console.log('📡 Status do canal Realtime:', status);
      });

    return () => {
      console.log('👋 Removendo canal Realtime...');
      supabase.removeChannel(channel);
    };
  }, [queryClient, qrCodeDialog]);

  // 3️⃣ createMutation - SIMPLIFICADO
  const createMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      console.log('🚀 Creating instance:', instanceName);

      // Obter user_id do usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase.functions.invoke("whatsapp-evolution", {
        body: { 
          action: "create", 
          instanceName,
          user_id: user.id // Enviar user_id para o edge function salvar no banco
        },
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw error;
      }

      console.log('✅ Edge function response:', data);
      return data;
    },

    onSuccess: (data) => {
      console.log('✅ Instance created successfully:', data);

      if (!data.success) {
        toast.error('Erro ao criar instância');
        return;
      }

      // ✅ Mostrar toast de sucesso
      toast.success(`Instância "${data.instanceName}" criada!`);

      // ✅ Limpar input
      setNewInstanceName("");

      // ✅ Recarregar lista
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] });

      // ✅ SE TEM QR CODE, abrir modal IMEDIATAMENTE
      if (data.qrCode) {
        console.log('📱 Opening QR Code modal');
        setQrCodeDialog({
          id: data.databaseId,
          instance_name: data.instanceName,
          qr_code_base64: data.qrCode,
          status: 'connecting'
        });
      } else {
        // ⚠️ Se não tem QR code, buscar do banco após 2s
        console.log('⏳ QR Code not ready, will fetch in 2s...');
        setTimeout(async () => {
          const { data: conn } = await supabase
            .from("tendenci_whatsapp_connections")
            .select("*")
            .eq("id", data.databaseId)
            .single();

          if (conn?.qr_code_base64) {
            console.log('📱 QR Code found in database, opening modal');
            setQrCodeDialog({
              id: conn.id,
              instance_name: conn.instance_name,
              qr_code_base64: conn.qr_code_base64,
              status: conn.status
            });
          } else {
            console.warn('⚠️ QR Code still not available');
            toast.warning('QR Code não disponível. Clique em "Ver QR Code".');
          }
        }, 2000);
      }
    },

    onError: (error: any) => {
      console.error('💥 Create mutation error:', error);
      toast.error(error.message || "Erro ao criar instância");
    },
  });

  // 4️⃣ Outras mutations
  const getQrCodeMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-evolution", {
        body: { action: "qrcode", instanceName },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, instanceName) => {
      const conn = connections?.find(c => c.instance_name === instanceName);
      if (conn && data.qrCode) {
        setQrCodeDialog({
          id: conn.id,
          instance_name: conn.instance_name,
          qr_code_base64: data.qrCode,
          status: 'connecting'
        });
      }
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      console.log('🗑️ Deleting instance:', instanceName);
      
      const { data, error } = await supabase.functions.invoke("whatsapp-evolution", {
        body: { action: "delete", instanceName },
      });
      
      if (error) {
        console.error('❌ Delete error:', error);
        throw error;
      }
      
      console.log('✅ Delete response:', data);
      return data;
    },
    onSuccess: (data, instanceName) => {
      console.log('✅ Instance deleted successfully:', instanceName);
      toast.success("Conexão deletada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] });
    },
    onError: (error: any) => {
      console.error('💥 Delete mutation error:', error);
      toast.error(error.message || "Erro ao deletar conexão");
    },
  });

  const checkStatusMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-evolution", {
        body: { action: "check-status", instanceName },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      console.log('🔌 Disconnecting instance:', instanceName);
      
      const { data, error } = await supabase.functions.invoke("whatsapp-evolution", {
        body: { action: "disconnect", instanceName },
      });
      
      if (error) {
        console.error('❌ Disconnect error:', error);
        throw error;
      }
      
      console.log('✅ Disconnect response:', data);
      return data;
    },
    onSuccess: (data, instanceName) => {
      console.log('✅ Instance disconnected successfully:', instanceName);
      toast.success("WhatsApp desconectado e offline");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] });
    },
    onError: (error: any) => {
      console.error('💥 Disconnect mutation error:', error);
      toast.error(error.message || "Erro ao desconectar");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500">Conectado</Badge>;
      case 'connecting':
        return <Badge variant="secondary">Conectando...</Badge>;
      case 'disconnected':
        return <Badge variant="destructive">Desconectado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Card de criar conexão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nova Conexão WhatsApp
          </CardTitle>
          <CardDescription>
            Conecte uma conta WhatsApp via Evolution API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Nome da instância (ex: vendas)"
              value={newInstanceName}
              onChange={(e) => setNewInstanceName(e.target.value)}
              disabled={createMutation.isPending}
            />
            <Button
              onClick={() => createMutation.mutate(newInstanceName)}
              disabled={!newInstanceName || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Conexão
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de conexões */}
      <Card>
        <CardHeader>
          <CardTitle>Conexões Ativas</CardTitle>
          <CardDescription>
            Gerencie suas conexões WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : connections?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma conexão criada ainda
            </p>
          ) : (
            <div className="space-y-4">
              {connections?.map((conn) => (
                <div key={conn.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{conn.instance_name}</h3>
                        {getStatusBadge(conn.status)}
                      </div>
                      {conn.phone_number && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {conn.phone_number}
                        </div>
                      )}
                      {conn.connected_at && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(conn.connected_at), "dd/MM/yyyy HH:mm")}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => getQrCodeMutation.mutate(conn.instance_name)}
                        disabled={getQrCodeMutation.isPending}
                        title="Gerar novo QR Code"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => checkStatusMutation.mutate(conn.instance_name)}
                        disabled={checkStatusMutation.isPending}
                        title="Verificar status"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      {conn.status === 'connected' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => disconnectMutation.mutate(conn.instance_name)}
                          disabled={disconnectMutation.isPending}
                          title="Desconectar e ficar offline"
                        >
                          <PowerOff className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMutation.mutate(conn.instance_name)}
                        disabled={deleteMutation.isPending}
                        title="Deletar conexão"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal do QR Code */}
      <Dialog open={!!qrCodeDialog} onOpenChange={() => setQrCodeDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Escanear QR Code - {qrCodeDialog?.instance_name}</DialogTitle>
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
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Escaneie o QR Code com o WhatsApp
                  </p>
                  <p className="text-xs text-muted-foreground">
                    A conexão será detectada automaticamente
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Gerando QR Code...
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
