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
              // Evolution API retorna connectionStatus e ownerJid
              const connectionStatus = evolutionInstance.connectionStatus || "close";
              const ownerJid = evolutionInstance.ownerJid;
              const phoneNumber = ownerJid?.split('@')[0] || null;
              
              // Considera conectado SOMENTE se status é "open" E tem ownerJid válido
              let newStatus = "disconnected";
              if (connectionStatus === "open" && ownerJid && phoneNumber) {
                newStatus = "connected";
              } else if (connectionStatus === "connecting" || connectionStatus === "open") {
                newStatus = "connecting";
              } else {
                newStatus = "disconnected";
              }
              
              console.log(`📱 ${conn.instance_name}: status=${connectionStatus}, ownerJid=${ownerJid}, newStatus=${newStatus}`);
              
              // Atualiza SOMENTE se mudou o status OU se ficou realmente conectado
              const shouldUpdate = conn.status !== newStatus || 
                                 (newStatus === "connected" && phoneNumber && conn.phone_number !== phoneNumber);
              
              if (shouldUpdate) {
                const updateData: any = { status: newStatus };
                
                // Se conectou de verdade, salva phone e data de conexão
                if (newStatus === "connected" && phoneNumber) {
                  updateData.phone_number = phoneNumber;
                  updateData.connected_at = new Date().toISOString();
                  console.log(`✅ Instância ${conn.instance_name} conectada! Phone: ${phoneNumber}`);
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
      console.error("Erro ao criar instância:", error);
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
                Abra o WhatsApp no seu celular, vá em <strong>Dispositivos Conectados</strong> e escaneie este código. 
                O QR Code expira a cada 60 segundos.
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