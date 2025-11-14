import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Megaphone, Play, Pause, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CampanhaExecutor } from "./CampanhaExecutor";

interface Campaign {
  id: string;
  nome: string;
  descricao: string;
  segmento_id: string;
  sequencia_id: string;
  vendedor_id: string;
  status: string;
  data_inicio: string;
  data_fim: string;
  created_at: string;
}

export function CampanhasManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [executorOpen, setExecutorOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    segmento_id: "",
    sequencia_id: "",
    vendedor_id: "",
    whatsapp_connection_id: "",
    status: "rascunho",
    data_inicio: "",
    data_fim: "",
    webhook_n8n: "",
    agendar_automatico: false,
    dias_semana: [] as number[],
    horarios: { inicio: "09:00", fim: "18:00" },
    intervalo_minimo_minutos: 30,
    criterio_interesse: { palavras_chave: ["interessado", "sim", "quero"], resposta_obrigatoria: true },
  });
  const queryClient = useQueryClient();

  // Buscar campanhas
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["prospec-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tendenci_prospec_arq_campaigns")
        .select(`
          *,
          segmento:tendenci_prospec_arq_segments(nome),
          sequencia:tendenci_prospec_arq_sequences(nome),
          vendedor:profiles!tendenci_prospec_arq_campaigns_vendedor_id_fkey(full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Buscar segmentos para select
  const { data: segments } = useQuery({
    queryKey: ["prospec-segments-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tendenci_prospec_arq_segments")
        .select("id, nome")
        .order("nome");

      if (error) throw error;
      return data;
    },
  });

  // Buscar sequências para select
  const { data: sequences } = useQuery({
    queryKey: ["prospec-sequences-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tendenci_prospec_arq_sequences")
        .select("id, nome")
        .eq("ativa", true)
        .order("nome");

      if (error) throw error;
      return data;
    },
  });

  // Buscar vendedores para select
  const { data: vendedores } = useQuery({
    queryKey: ["vendedores-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("role", ["admin", "vendedor"])
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });

  // Buscar conexões WhatsApp para select
  const { data: whatsappConnections } = useQuery({
    queryKey: ["whatsapp-connections-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tendenci_whatsapp_connections")
        .select("id, instance_name, phone_number, status")
        .order("instance_name");

      if (error) throw error;
      
      // Retorna todas as conexões, mas marca as conectadas
      return data?.filter(conn => 
        conn.status === "connected" || 
        conn.status === "open" || 
        conn.phone_number !== null
      ) || [];
    },
    refetchInterval: 5000, // Atualiza a cada 5s
  });

  // Criar/atualizar campanha
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: formData.nome,
        descricao: formData.descricao,
        segmento_id: formData.segmento_id || null,
        sequencia_id: formData.sequencia_id || null,
        vendedor_id: formData.vendedor_id || null,
        whatsapp_connection_id: formData.whatsapp_connection_id || null,
        status: formData.status,
        data_inicio: formData.data_inicio || null,
        data_fim: formData.data_fim || null,
        webhook_n8n: formData.webhook_n8n || null,
        agendar_automatico: formData.agendar_automatico,
        dias_semana: formData.dias_semana.length > 0 ? formData.dias_semana : null,
        horarios: formData.agendar_automatico ? formData.horarios : null,
        intervalo_minimo_minutos: formData.agendar_automatico ? formData.intervalo_minimo_minutos : null,
        criterio_interesse: formData.criterio_interesse,
      };

      if (editingCampaign) {
        const { error } = await supabase
          .from("tendenci_prospec_arq_campaigns")
          .update(payload)
          .eq("id", editingCampaign.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tendenci_prospec_arq_campaigns")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospec-campaigns"] });
      setDialogOpen(false);
      resetForm();
      toast.success(editingCampaign ? "Campanha atualizada!" : "Campanha criada!");
    },
    onError: () => {
      toast.error("Erro ao salvar campanha");
    },
  });

  // Deletar campanha
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tendenci_prospec_arq_campaigns")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospec-campaigns"] });
      toast.success("Campanha removida!");
    },
    onError: () => {
      toast.error("Erro ao remover campanha");
    },
  });

  // Alterar status da campanha
  const changeStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { error } = await supabase
        .from("tendenci_prospec_arq_campaigns")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospec-campaigns"] });
      toast.success("Status atualizado!");
    },
    onError: () => {
      toast.error("Erro ao alterar status");
    },
  });

  // Iniciar campanha e disparar webhook n8n
  const startCampaignMutation = useMutation({
    mutationFn: async (campaign: any) => {
      // Atualizar status para "ativa"
      const { error: updateError } = await supabase
        .from("tendenci_prospec_arq_campaigns")
        .update({ status: "ativa", data_inicio: new Date().toISOString() })
        .eq("id", campaign.id);
      
      if (updateError) throw updateError;

      // Disparar webhook n8n se configurado
      if (campaign.webhook_n8n) {
        try {
          const response = await fetch(campaign.webhook_n8n, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campaign_id: campaign.id,
              campaign_name: campaign.nome,
              status: "ativa",
              timestamp: new Date().toISOString(),
            }),
          });

          if (!response.ok) {
            console.error("Erro ao disparar webhook n8n:", response.statusText);
          }
        } catch (error) {
          console.error("Erro ao disparar webhook n8n:", error);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospec-campaigns"] });
      toast.success("Campanha iniciada! Webhook n8n disparado.");
    },
    onError: () => {
      toast.error("Erro ao iniciar campanha");
    },
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      segmento_id: "",
      sequencia_id: "",
      vendedor_id: "",
      whatsapp_connection_id: "",
      status: "rascunho",
      data_inicio: "",
      data_fim: "",
      webhook_n8n: "",
      agendar_automatico: false,
      dias_semana: [],
      horarios: { inicio: "09:00", fim: "18:00" },
      intervalo_minimo_minutos: 30,
      criterio_interesse: { palavras_chave: ["interessado", "sim", "quero"], resposta_obrigatoria: true },
    });
    setEditingCampaign(null);
  };

  const handleEdit = (campaign: any) => {
    setEditingCampaign(campaign);
    setFormData({
      nome: campaign.nome,
      descricao: campaign.descricao || "",
      segmento_id: campaign.segmento_id || "",
      sequencia_id: campaign.sequencia_id || "",
      vendedor_id: campaign.vendedor_id || "",
      whatsapp_connection_id: campaign.whatsapp_connection_id || "",
      status: campaign.status,
      data_inicio: campaign.data_inicio ? campaign.data_inicio.split("T")[0] : "",
      data_fim: campaign.data_fim ? campaign.data_fim.split("T")[0] : "",
      webhook_n8n: campaign.webhook_n8n || "",
      agendar_automatico: campaign.agendar_automatico || false,
      dias_semana: campaign.dias_semana || [],
      horarios: campaign.horarios || { inicio: "09:00", fim: "18:00" },
      intervalo_minimo_minutos: campaign.intervalo_minimo_minutos || 30,
      criterio_interesse: campaign.criterio_interesse || { palavras_chave: ["interessado", "sim", "quero"], resposta_obrigatoria: true },
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string, nome: string) => {
    if (confirm(`Tem certeza que deseja remover a campanha "${nome}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: any }> = {
      rascunho: { label: "Rascunho", variant: "secondary" },
      ativa: { label: "Ativa", variant: "default" },
      pausada: { label: "Pausada", variant: "outline" },
      concluida: { label: "Concluída", variant: "secondary" },
    };
    return variants[status] || variants.rascunho;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Campanhas de Prospecção</h2>
          <p className="text-muted-foreground">Crie e gerencie campanhas automáticas</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Campanha
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCampaign ? "Editar Campanha" : "Nova Campanha"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Campanha *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Campanha de Ativação Q1 2024"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva o objetivo da campanha..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="segmento">Segmento</Label>
                  <Select
                    value={formData.segmento_id}
                    onValueChange={(value) => setFormData({ ...formData, segmento_id: value })}
                  >
                    <SelectTrigger id="segmento">
                      <SelectValue placeholder="Selecione um segmento" />
                    </SelectTrigger>
                    <SelectContent>
                      {segments?.map((seg) => (
                        <SelectItem key={seg.id} value={seg.id}>
                          {seg.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sequencia">Sequência de IA</Label>
                  <Select
                    value={formData.sequencia_id}
                    onValueChange={(value) => setFormData({ ...formData, sequencia_id: value })}
                  >
                    <SelectTrigger id="sequencia">
                      <SelectValue placeholder="Selecione uma sequência" />
                    </SelectTrigger>
                    <SelectContent>
                      {sequences?.map((seq) => (
                        <SelectItem key={seq.id} value={seq.id}>
                          {seq.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendedor">Vendedor Responsável</Label>
                <Select
                  value={formData.vendedor_id}
                  onValueChange={(value) => setFormData({ ...formData, vendedor_id: value })}
                >
                  <SelectTrigger id="vendedor">
                    <SelectValue placeholder="Selecione um vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendedores?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.full_name || v.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">Conexão WhatsApp *</Label>
                <Select
                  value={formData.whatsapp_connection_id}
                  onValueChange={(value) => setFormData({ ...formData, whatsapp_connection_id: value })}
                >
                  <SelectTrigger id="whatsapp">
                    <SelectValue placeholder="Selecione uma conexão" />
                  </SelectTrigger>
                  <SelectContent>
                    {whatsappConnections && whatsappConnections.length > 0 ? (
                      whatsappConnections.map((conn) => (
                        <SelectItem key={conn.id} value={conn.id}>
                          {conn.instance_name} 
                          {conn.phone_number ? ` (${conn.phone_number})` : ""} 
                          {conn.status === "connected" ? " ✓" : ""}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        Nenhuma conexão disponível
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {(!whatsappConnections || whatsappConnections.length === 0) && (
                  <p className="text-xs text-muted-foreground">
                    Configure uma conexão WhatsApp na aba "WhatsApp" primeiro
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_inicio">Data de Início</Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_fim">Data de Término</Label>
                  <Input
                    id="data_fim"
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                  />
                </div>
              </div>

              {/* Webhook n8n */}
              <div className="space-y-2">
                <Label htmlFor="webhook_n8n">Webhook n8n (Opcional)</Label>
                <Input
                  id="webhook_n8n"
                  type="url"
                  value={formData.webhook_n8n}
                  onChange={(e) => setFormData({ ...formData, webhook_n8n: e.target.value })}
                  placeholder="https://seu-n8n.com/webhook/..."
                />
                <p className="text-xs text-muted-foreground">
                  URL do webhook n8n para envio automático de mensagens
                </p>
              </div>

              {/* Agendamento Automático */}
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Agendamento Automático</Label>
                    <p className="text-xs text-muted-foreground">
                      Criar agendamentos automaticamente quando houver interesse
                    </p>
                  </div>
                  <Switch
                    checked={formData.agendar_automatico}
                    onCheckedChange={(checked) => setFormData({ ...formData, agendar_automatico: checked })}
                  />
                </div>

                {formData.agendar_automatico && (
                  <>
                    <div className="space-y-2">
                      <Label>Dias da Semana</Label>
                      <div className="flex flex-wrap gap-2">
                        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((dia, index) => (
                          <Button
                            key={index}
                            type="button"
                            variant={formData.dias_semana.includes(index) ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              const newDias = formData.dias_semana.includes(index)
                                ? formData.dias_semana.filter(d => d !== index)
                                : [...formData.dias_semana, index].sort();
                              setFormData({ ...formData, dias_semana: newDias });
                            }}
                          >
                            {dia}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="horario_inicio">Horário Início</Label>
                        <Input
                          id="horario_inicio"
                          type="time"
                          value={formData.horarios.inicio}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            horarios: { ...formData.horarios, inicio: e.target.value }
                          })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="horario_fim">Horário Fim</Label>
                        <Input
                          id="horario_fim"
                          type="time"
                          value={formData.horarios.fim}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            horarios: { ...formData.horarios, fim: e.target.value }
                          })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="intervalo">Intervalo Mínimo (minutos)</Label>
                      <Input
                        id="intervalo"
                        type="number"
                        min="15"
                        step="15"
                        value={formData.intervalo_minimo_minutos}
                        onChange={(e) => setFormData({ ...formData, intervalo_minimo_minutos: parseInt(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Espaçamento mínimo entre agendamentos
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={!formData.nome.trim() || saveMutation.isPending}
                >
                  {editingCampaign ? "Atualizar" : "Criar"} Campanha
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Campanhas */}
      {isLoading ? (
        <div className="text-center py-8">Carregando campanhas...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns?.map((campaign: any) => {
            const statusInfo = getStatusBadge(campaign.status);
            return (
              <Card key={campaign.id} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">{campaign.nome}</h3>
                    </div>
                    <div className="flex gap-1">
                      {campaign.status === "rascunho" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => startCampaignMutation.mutate(campaign)}
                          disabled={startCampaignMutation.isPending}
                          className="gap-1"
                        >
                          <Rocket className="h-4 w-4" />
                          <span className="text-xs">Iniciar</span>
                        </Button>
                      )}
                      {campaign.status === "ativa" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => changeStatusMutation.mutate({ id: campaign.id, newStatus: "pausada" })}
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      )}
                      {campaign.status === "pausada" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => changeStatusMutation.mutate({ id: campaign.id, newStatus: "ativa" })}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setExecutorOpen(true);
                        }}
                        title="Executar Campanha Manualmente"
                      >
                        <Rocket className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(campaign)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(campaign.id, campaign.nome)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {campaign.descricao && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{campaign.descricao}</p>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Segmento:</span>
                      <span className="font-medium">{campaign.segmento?.nome || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Sequência:</span>
                      <span className="font-medium">{campaign.sequencia?.nome || "-"}</span>
                    </div>
                    {campaign.vendedor && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Vendedor:</span>
                        <span className="font-medium">{campaign.vendedor.full_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    {campaign.data_inicio && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(campaign.data_inicio), "dd/MM/yyyy")}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {campaigns?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Nenhuma campanha criada ainda. Crie sua primeira campanha!
            </div>
          )}
        </div>
      )}

      {/* Dialog Executor */}
      <Dialog open={executorOpen} onOpenChange={setExecutorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Executar Campanha</DialogTitle>
          </DialogHeader>
          {selectedCampaign && (
            <CampanhaExecutor
              campaignId={selectedCampaign.id}
              campaignName={selectedCampaign.nome}
              onComplete={() => {
                setExecutorOpen(false);
                setSelectedCampaign(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
