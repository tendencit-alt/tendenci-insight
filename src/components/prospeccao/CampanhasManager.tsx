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
import { toast } from "sonner";
import { Plus, Edit, Trash2, Megaphone, Play, Pause } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

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
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    segmento_id: "",
    sequencia_id: "",
    vendedor_id: "",
    status: "rascunho",
    data_inicio: "",
    data_fim: "",
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
          vendedor:profiles(full_name, email)
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

  // Criar/atualizar campanha
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: formData.nome,
        descricao: formData.descricao,
        segmento_id: formData.segmento_id || null,
        sequencia_id: formData.sequencia_id || null,
        vendedor_id: formData.vendedor_id || null,
        status: formData.status,
        data_inicio: formData.data_inicio || null,
        data_fim: formData.data_fim || null,
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

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      segmento_id: "",
      sequencia_id: "",
      vendedor_id: "",
      status: "rascunho",
      data_inicio: "",
      data_fim: "",
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
      status: campaign.status,
      data_inicio: campaign.data_inicio ? campaign.data_inicio.split("T")[0] : "",
      data_fim: campaign.data_fim ? campaign.data_fim.split("T")[0] : "",
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
    </div>
  );
}
