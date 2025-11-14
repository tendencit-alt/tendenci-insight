import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Zap, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface Sequence {
  id: string;
  nome: string;
  descricao: string;
  mensagens: Array<{
    ordem: number;
    canal: string;
    template: string;
    intervalo_horas: number;
  }>;
  ativa: boolean;
  created_at: string;
}

export function SequenciasManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSequence, setEditingSequence] = useState<Sequence | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    ativa: true,
    mensagens: [{ ordem: 1, canal: "whatsapp", template: "", intervalo_horas: 24 }],
  });
  const queryClient = useQueryClient();

  // Buscar sequências
  const { data: sequences, isLoading } = useQuery({
    queryKey: ["prospec-sequences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tendenci_prospec_arq_sequences")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(seq => ({
        ...seq,
        mensagens: Array.isArray(seq.mensagens) ? seq.mensagens : [],
      })) as unknown as Sequence[];
    },
  });

  // Criar/atualizar sequência
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: formData.nome,
        descricao: formData.descricao,
        mensagens: formData.mensagens,
        ativa: formData.ativa,
      };

      if (editingSequence) {
        const { error } = await supabase
          .from("tendenci_prospec_arq_sequences")
          .update(payload)
          .eq("id", editingSequence.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tendenci_prospec_arq_sequences")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospec-sequences"] });
      setDialogOpen(false);
      resetForm();
      toast.success(editingSequence ? "Sequência atualizada!" : "Sequência criada!");
    },
    onError: () => {
      toast.error("Erro ao salvar sequência");
    },
  });

  // Deletar sequência
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tendenci_prospec_arq_sequences")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospec-sequences"] });
      toast.success("Sequência removida!");
    },
    onError: () => {
      toast.error("Erro ao remover sequência");
    },
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      ativa: true,
      mensagens: [{ ordem: 1, canal: "whatsapp", template: "", intervalo_horas: 24 }],
    });
    setEditingSequence(null);
  };

  const handleEdit = (sequence: Sequence) => {
    setEditingSequence(sequence);
    setFormData({
      nome: sequence.nome,
      descricao: sequence.descricao || "",
      ativa: sequence.ativa,
      mensagens: sequence.mensagens || [{ ordem: 1, canal: "whatsapp", template: "", intervalo_horas: 24 }],
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string, nome: string) => {
    if (confirm(`Tem certeza que deseja remover a sequência "${nome}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const addMensagem = () => {
    setFormData({
      ...formData,
      mensagens: [
        ...formData.mensagens,
        { ordem: formData.mensagens.length + 1, canal: "whatsapp", template: "", intervalo_horas: 24 },
      ],
    });
  };

  const removeMensagem = (index: number) => {
    const newMensagens = formData.mensagens.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      mensagens: newMensagens.map((m, i) => ({ ...m, ordem: i + 1 })),
    });
  };

  const updateMensagem = (index: number, field: string, value: any) => {
    const newMensagens = [...formData.mensagens];
    newMensagens[index] = { ...newMensagens[index], [field]: value };
    setFormData({ ...formData, mensagens: newMensagens });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sequências de IA</h2>
          <p className="text-muted-foreground">Configure sequências automáticas de mensagens</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Sequência
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSequence ? "Editar Sequência" : "Nova Sequência"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Sequência *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Sequência de Ativação"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ativa">Status</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Switch
                      id="ativa"
                      checked={formData.ativa}
                      onCheckedChange={(checked) => setFormData({ ...formData, ativa: checked })}
                    />
                    <span className="text-sm">{formData.ativa ? "Ativa" : "Inativa"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva o objetivo desta sequência..."
                  rows={2}
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Mensagens da Sequência</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addMensagem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Mensagem
                  </Button>
                </div>

                <div className="space-y-3">
                  {formData.mensagens.map((msg, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <Badge>Mensagem {msg.ordem}</Badge>
                          </div>
                          {formData.mensagens.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMensagem(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Canal</Label>
                            <Input value="WhatsApp" disabled className="text-sm" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Intervalo (horas)</Label>
                            <Input
                              type="number"
                              value={msg.intervalo_horas}
                              onChange={(e) =>
                                updateMensagem(index, "intervalo_horas", parseInt(e.target.value) || 0)
                              }
                              className="text-sm"
                              min={0}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Template da Mensagem</Label>
                          <Textarea
                            value={msg.template}
                            onChange={(e) => updateMensagem(index, "template", e.target.value)}
                            placeholder="Ex: Olá {{nome}}, tudo bem? Estou entrando em contato para..."
                            rows={3}
                            className="text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            Use {'{{nome}}'}, {'{{empresa}}'}, {'{{cidade}}'} para personalizar
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
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
                  {editingSequence ? "Atualizar" : "Criar"} Sequência
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Sequências */}
      {isLoading ? (
        <div className="text-center py-8">Carregando sequências...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sequences?.map((sequence) => (
            <Card key={sequence.id} className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">{sequence.nome}</h3>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(sequence)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(sequence.id, sequence.nome)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {sequence.descricao && (
                  <p className="text-sm text-muted-foreground">{sequence.descricao}</p>
                )}

                <div className="flex items-center justify-between">
                  <Badge variant={sequence.ativa ? "default" : "secondary"}>
                    {sequence.ativa ? "Ativa" : "Inativa"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {sequence.mensagens?.length || 0} mensagens
                  </span>
                </div>
              </div>
            </Card>
          ))}

          {sequences?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Nenhuma sequência criada ainda. Crie sua primeira sequência!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
