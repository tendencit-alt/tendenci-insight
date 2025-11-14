import { useState } from "react";
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

  // Buscar conexões
  const { data: connections, isLoading, refetch } = useQuery({
    queryKey: ["whatsapp-connections"],
    queryFn: async () => {
      // Primeiro busca do banco
      const { data, error } = await supabase
        .from("tendenci_whatsapp_connections")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Depois verifica status real na Evolution API
      try {
        const { data: statusData } = await supabase.functions.invoke("whatsapp-evolution", {
          body: { action: "status" },
        });

        if (statusData?.success && statusData.instances) {
          console.log("📱 Evolution instances:", statusData.instances);
          
          // Atualiza status no banco para cada instância
          for (const conn of data) {
            const evolutionInstance = statusData.instances.find(
              (i: any) => i.name === conn.instance_name
            );

            if (evolutionInstance) {
              // Evolution API retorna connectionStatus diretamente no objeto raiz
              const connectionStatus = evolutionInstance.connectionStatus || "close";
              const phoneNumber = evolutionInstance.ownerJid?.split('@')[0] || conn.phone_number;
              
              let newStatus = "disconnected";
              if (connectionStatus === "open") newStatus = "connected";
              else if (connectionStatus === "connecting") newStatus = "connecting";
              else if (connectionStatus === "close") newStatus = "disconnected";
              
              console.log(`📱 ${conn.instance_name}: ${connectionStatus} -> ${newStatus}, phone: ${phoneNumber}`);
              
              if (conn.status !== newStatus || (phoneNumber && conn.phone_number !== phoneNumber)) {
                const updateData: any = { status: newStatus };
                if (phoneNumber && phoneNumber !== conn.phone_number) {
                  updateData.phone_number = phoneNumber;
                  updateData.connected_at = new Date().toISOString();
                }
                
                await supabase
                  .from("tendenci_whatsapp_connections")
                  .update(updateData)
                  .eq("id", conn.id);
                
                conn.status = newStatus;
                if (phoneNumber) conn.phone_number = phoneNumber;
              }
            }
          }
        }
      } catch (error) {
        console.error("Erro ao verificar status:", error);
      }

      return data as WhatsAppConnection[];
    },
    refetchInterval: 10000, // Refetch a cada 10s
  });

  // Criar nova conexão
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-evolution", {
        body: {
          action: "create",
          instanceName: name,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] });
      setDialogOpen(false);
      setInstanceName("");
      
      if (data.connection) {
        setQrCodeDialog(data.connection);
      }
      toast.success("Instância criada! Escaneie o QR Code.");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar instância");
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] });
      toast.success("Instância removida");
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Escaneie o QR Code</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <QrCode className="h-4 w-4" />
              <AlertDescription>
                Abra o WhatsApp no seu celular e escaneie este código
              </AlertDescription>
            </Alert>

            {qrCodeDialog?.qr_code_base64 ? (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img
                  src={qrCodeDialog.qr_code_base64}
                  alt="QR Code"
                  className="w-64 h-64"
                />
              </div>
            ) : (
              <div className="flex justify-center items-center h-64 bg-muted rounded-lg">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => qrCodeDialog && getQrCodeMutation.mutate(qrCodeDialog)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lista de Conexões */}
      {isLoading ? (
        <div className="text-center py-8">Carregando conexões...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connections?.map((connection) => (
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

                <div className="flex gap-2">
                  {connection.status === 'disconnected' || connection.status === 'connecting' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => getQrCodeMutation.mutate(connection)}
                      disabled={getQrCodeMutation.isPending}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Conectar
                    </Button>
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
          ))}

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
