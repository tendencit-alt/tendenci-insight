import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GripVertical, Pencil, Trash2, Plus, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { usePermissions } from "@/hooks/usePermissions";

interface ManageStagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLORS = [
  { name: "Cinza", value: "bg-gray-500" },
  { name: "Azul", value: "bg-blue-500" },
  { name: "Ciano", value: "bg-cyan-500" },
  { name: "Laranja", value: "bg-orange-500" },
  { name: "Roxo", value: "bg-purple-500" },
  { name: "Verde", value: "bg-green-500" },
  { name: "Vermelho", value: "bg-red-500" },
  { name: "Amarelo", value: "bg-yellow-500" },
  { name: "Rosa", value: "bg-pink-500" },
  { name: "Índigo", value: "bg-indigo-500" },
];

export function ManageStagesDialog({ open, onOpenChange }: ManageStagesDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("bg-blue-500");
  const queryClient = useQueryClient();
  const { isMaster } = usePermissions();

  // Buscar etapas
  const { data: stages, isLoading } = useQuery({
    queryKey: ["prospec-stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tendenci_prospec_arq_stages")
        .select("*")
        .eq("ativa", true)
        .order("position");

      if (error) throw error;
      return data;
    },
  });

  // Criar nova etapa
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!newStageName.trim()) {
        throw new Error("Nome é obrigatório");
      }

      const maxPosition = Math.max(...(stages?.map(s => s.position) || [0]));
      const slug = newStageName.toLowerCase().replace(/\s+/g, "_").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      const { error } = await supabase
        .from("tendenci_prospec_arq_stages")
        .insert({
          nome: newStageName,
          slug: slug,
          position: maxPosition + 1,
          cor: newStageColor,
          editavel: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospec-stages"] });
      setNewStageName("");
      setNewStageColor("bg-blue-500");
      toast.success("Etapa criada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar etapa");
    },
  });

  // Atualizar etapa
  const updateMutation = useMutation({
    mutationFn: async ({ id, nome, cor }: { id: string; nome: string; cor: string }) => {
      const { error } = await supabase
        .from("tendenci_prospec_arq_stages")
        .update({ nome, cor })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospec-stages"] });
      setEditingId(null);
      toast.success("Etapa atualizada!");
    },
    onError: () => {
      toast.error("Erro ao atualizar etapa");
    },
  });

  // Deletar etapa
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tendenci_prospec_arq_stages")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospec-stages"] });
      toast.success("Etapa removida!");
    },
    onError: () => {
      toast.error("Erro ao remover etapa");
    },
  });

  // Reordenar etapas
  const reorderMutation = useMutation({
    mutationFn: async (reorderedStages: any[]) => {
      const updates = reorderedStages.map((stage, index) => 
        supabase
          .from("tendenci_prospec_arq_stages")
          .update({ position: index })
          .eq("id", stage.id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospec-stages"] });
      toast.success("Ordem atualizada!");
    },
  });

  const handleEdit = (stage: any) => {
    setEditingId(stage.id);
    setEditName(stage.nome);
    setEditColor(stage.cor);
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      updateMutation.mutate({ id: editingId, nome: editName, cor: editColor });
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0 || !stages) return;
    const newStages = [...stages];
    [newStages[index], newStages[index - 1]] = [newStages[index - 1], newStages[index]];
    reorderMutation.mutate(newStages);
  };

  const handleMoveDown = (index: number) => {
    if (!stages || index === stages.length - 1) return;
    const newStages = [...stages];
    [newStages[index], newStages[index + 1]] = [newStages[index + 1], newStages[index]];
    reorderMutation.mutate(newStages);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Etapas do Funil</DialogTitle>
        </DialogHeader>

        {!isMaster ? (
          <div className="p-6 text-center">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Apenas usuários Master podem gerenciar as etapas do funil.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Adicionar Nova Etapa */}
            <Card className="p-4 bg-muted/50">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Nova Etapa
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-stage-name">Nome da Etapa</Label>
                    <Input
                      id="new-stage-name"
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      placeholder="Ex: Proposta Enviada"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-stage-color">Cor</Label>
                    <select
                      id="new-stage-color"
                      value={newStageColor}
                      onChange={(e) => setNewStageColor(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    >
                      {COLORS.map((color) => (
                        <option key={color.value} value={color.value}>
                          {color.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <Button 
                  onClick={() => createMutation.mutate()} 
                  disabled={createMutation.isPending || !newStageName.trim()}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Etapa
                </Button>
              </div>
            </Card>

          {/* Lista de Etapas */}
          <div className="space-y-2">
            <h3 className="font-semibold">Etapas Atuais</h3>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-4">Carregando...</p>
            ) : (
              <div className="space-y-2">
                {stages?.map((stage, index) => (
                  <Card key={stage.id} className="p-4">
                    {editingId === stage.id ? (
                      // Modo edição
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Nome</Label>
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Cor</Label>
                            <select
                              value={editColor}
                              onChange={(e) => setEditColor(e.target.value)}
                              className="w-full h-10 px-3 rounded-md border border-input bg-background"
                            >
                              {COLORS.map((color) => (
                                <option key={color.value} value={color.value}>
                                  {color.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveEdit}>Salvar</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Modo visualização
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMoveUp(index)}
                              disabled={index === 0}
                              className="h-4 w-6 p-0"
                            >
                              ▲
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMoveDown(index)}
                              disabled={index === stages.length - 1}
                              className="h-4 w-6 p-0"
                            >
                              ▼
                            </Button>
                          </div>
                          <GripVertical className="h-5 w-5 text-muted-foreground" />
                          <Badge className={stage.cor}>{stage.nome}</Badge>
                          {!stage.editavel && (
                            <Badge variant="outline" className="gap-1">
                              <Lock className="h-3 w-3" />
                              Sistema
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(stage)}
                            title="Editar nome e cor"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {stage.editavel && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Remover etapa "${stage.nome}"?`)) {
                                  deleteMutation.mutate(stage.id);
                                }
                              }}
                              title="Deletar etapa"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
