import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Save,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ManagePipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPipeline: string;
  onSuccess: () => void;
}

interface Pipeline {
  id: string;
  name: string;
}

interface Stage {
  id: string;
  name: string;
  position: number;
  sla_hours: number;
  pipeline_id: string;
}

export function ManagePipelineDialog({
  open,
  onOpenChange,
  selectedPipeline,
  onSuccess,
}: ManagePipelineDialogProps) {
  const { toast } = useToast();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [activePipeline, setActivePipeline] = useState<string>("");
  const [editingPipeline, setEditingPipeline] = useState<string | null>(null);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [pipelineName, setPipelineName] = useState("");
  const [editPipelineName, setEditPipelineName] = useState("");
  const [stageName, setStageName] = useState("");
  const [stageSla, setStageSla] = useState("24");
  const [editStageName, setEditStageName] = useState("");
  const [editStageSla, setEditStageSla] = useState("24");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: "pipeline" | "stage";
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (open) {
      fetchPipelines();
      if (selectedPipeline) {
        setActivePipeline(selectedPipeline);
        fetchStages(selectedPipeline);
      }
    }
  }, [open, selectedPipeline]);

  const fetchPipelines = async () => {
    const { data, error } = await supabase
      .from("crm_pipelines")
      .select("*")
      .order("created_at");

    if (!error && data) {
      setPipelines(data);
      if (!activePipeline && data.length > 0) {
        setActivePipeline(data[0].id);
        fetchStages(data[0].id);
      }
    }
  };

  const fetchStages = async (pipelineId: string) => {
    const { data, error } = await supabase
      .from("crm_stages")
      .select("*")
      .eq("pipeline_id", pipelineId)
      .order("position");

    if (!error && data) {
      setStages(data);
    }
  };

  const handleCreatePipeline = async () => {
    if (!pipelineName.trim()) return;

    const { error } = await supabase
      .from("crm_pipelines")
      .insert({ name: pipelineName });

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Sucesso", description: "Funil criado!" });
    setPipelineName("");
    fetchPipelines();
    onSuccess();
  };

  const handleUpdatePipeline = async (id: string) => {
    if (!editPipelineName.trim()) {
      setEditingPipeline(null);
      return;
    }

    const { error } = await supabase
      .from("crm_pipelines")
      .update({ name: editPipelineName })
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Sucesso", description: "Funil atualizado!" });
    setEditingPipeline(null);
    setEditPipelineName("");
    fetchPipelines();
    onSuccess();
  };

  const handleDeletePipeline = async (id: string) => {
    const { error } = await supabase.from("crm_pipelines").delete().eq("id", id);

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Sucesso", description: "Funil excluído!" });
    setDeleteDialog(null);
    fetchPipelines();
    onSuccess();
  };

  const handleCreateStage = async () => {
    if (!stageName.trim() || !activePipeline) return;

    const maxPosition = Math.max(...stages.map((s) => s.position), -1);

    const { error } = await supabase.from("crm_stages").insert({
      name: stageName,
      pipeline_id: activePipeline,
      position: maxPosition + 1,
      sla_hours: Number(stageSla) || 24,
    });

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Sucesso", description: "Etapa criada!" });
    setStageName("");
    setStageSla("24");
    fetchStages(activePipeline);
  };

  const handleUpdateStage = async (id: string) => {
    if (!editStageName.trim()) {
      setEditingStage(null);
      return;
    }

    const { error } = await supabase
      .from("crm_stages")
      .update({ 
        name: editStageName,
        sla_hours: Number(editStageSla) || 24
      })
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Sucesso", description: "Etapa atualizada!" });
    setEditingStage(null);
    setEditStageName("");
    setEditStageSla("24");
    fetchStages(activePipeline);
  };

  const handleDeleteStage = async (id: string) => {
    const { error } = await supabase.from("crm_stages").delete().eq("id", id);

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Sucesso", description: "Etapa excluída!" });
    setDeleteDialog(null);
    fetchStages(activePipeline);
  };

  const handleMoveStage = async (stageId: string, direction: "up" | "down") => {
    const stageIndex = stages.findIndex((s) => s.id === stageId);
    if (
      (direction === "up" && stageIndex === 0) ||
      (direction === "down" && stageIndex === stages.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? stageIndex - 1 : stageIndex + 1;
    const newStages = [...stages];
    [newStages[stageIndex], newStages[newIndex]] = [
      newStages[newIndex],
      newStages[stageIndex],
    ];

    // Update positions
    for (let i = 0; i < newStages.length; i++) {
      await supabase
        .from("crm_stages")
        .update({ position: i })
        .eq("id", newStages[i].id);
    }

    fetchStages(activePipeline);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Gerenciar Funis e Etapas
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6 py-4">
            {/* Funis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Funis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Create Pipeline */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome do funil"
                    value={pipelineName}
                    onChange={(e) => setPipelineName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreatePipeline();
                    }}
                  />
                  <Button onClick={handleCreatePipeline} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Pipelines List */}
                <div className="space-y-2">
                  {pipelines.map((pipeline) => (
                    <div
                      key={pipeline.id}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        activePipeline === pipeline.id
                          ? "bg-accent border-primary"
                          : "hover:bg-accent/50"
                      }`}
                      onClick={() => {
                        setActivePipeline(pipeline.id);
                        fetchStages(pipeline.id);
                      }}
                    >
                      {editingPipeline === pipeline.id ? (
                        <>
                          <Input
                            value={editPipelineName}
                            onChange={(e) => setEditPipelineName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleUpdatePipeline(pipeline.id);
                              }
                              if (e.key === "Escape") {
                                setEditingPipeline(null);
                                setEditPipelineName("");
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdatePipeline(pipeline.id);
                            }}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPipeline(null);
                              setEditPipelineName("");
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 font-medium">
                            {pipeline.name}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPipeline(pipeline.id);
                              setEditPipelineName(pipeline.name);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteDialog({
                                open: true,
                                type: "pipeline",
                                id: pipeline.id,
                                name: pipeline.name,
                              });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Etapas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Etapas {activePipeline && `do Funil`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activePipeline ? (
                  <>
                    {/* Create Stage */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nome da etapa"
                          value={stageName}
                          onChange={(e) => setStageName(e.target.value)}
                        />
                        <Input
                          type="number"
                          placeholder="SLA (h)"
                          value={stageSla}
                          onChange={(e) => setStageSla(e.target.value)}
                          className="w-24"
                        />
                        <Button onClick={handleCreateStage} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        SLA: tempo máximo em horas nesta etapa
                      </p>
                    </div>

                    {/* Stages List */}
                    <div className="space-y-2">
                      {stages.map((stage, index) => (
                        <div
                          key={stage.id}
                          className="flex items-center gap-2 p-3 rounded-lg border"
                        >
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMoveStage(stage.id, "up")}
                              disabled={index === 0}
                              className="h-4 p-0"
                            >
                              <GripVertical className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMoveStage(stage.id, "down")}
                              disabled={index === stages.length - 1}
                              className="h-4 p-0"
                            >
                              <GripVertical className="h-3 w-3" />
                            </Button>
                          </div>

                          {editingStage === stage.id ? (
                            <>
                              <Input
                                value={editStageName}
                                onChange={(e) => setEditStageName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleUpdateStage(stage.id);
                                  }
                                  if (e.key === "Escape") {
                                    setEditingStage(null);
                                    setEditStageName("");
                                    setEditStageSla("24");
                                  }
                                }}
                                className="flex-1"
                              />
                              <Input
                                type="number"
                                value={editStageSla}
                                onChange={(e) => setEditStageSla(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleUpdateStage(stage.id);
                                  }
                                }}
                                className="w-20"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUpdateStage(stage.id)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingStage(null);
                                  setEditStageName("");
                                  setEditStageSla("24");
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="flex-1">
                                <p className="font-medium">{stage.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  SLA: {stage.sla_hours}h
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingStage(stage.id);
                                  setEditStageName(stage.name);
                                  setEditStageSla(stage.sla_hours.toString());
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setDeleteDialog({
                                    open: true,
                                    type: "stage",
                                    id: stage.id,
                                    name: stage.name,
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground">
                    Selecione um funil para gerenciar suas etapas
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog?.open || false}
        onOpenChange={(open) =>
          !open && setDeleteDialog(null)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir{" "}
              {deleteDialog?.type === "pipeline" ? "o funil" : "a etapa"}{" "}
              <strong>{deleteDialog?.name}</strong>? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDialog?.type === "pipeline") {
                  handleDeletePipeline(deleteDialog.id);
                } else if (deleteDialog?.type === "stage") {
                  handleDeleteStage(deleteDialog.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
