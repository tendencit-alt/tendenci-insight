import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateBrInput } from "@/components/ui/date-br-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useWebhookSync } from "@/hooks/useWebhookSync";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { FormSaveIndicator } from "@/components/ui/FormSaveIndicator";

interface EditProjectDialogProps {
  project: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditProjectDialog({ project, open, onOpenChange, onSuccess }: EditProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [architects, setArchitects] = useState<any[]>([]);
  const { notifyStageChanged, notifyDeadlineChanged } = useWebhookSync();
  const [formData, setFormData, clearPersistedData, hasRestoredData] = useFormPersistence(
    `edit-project-form-${project?.id || 'new'}`,
    {
      name: "",
      architect_id: "",
      stage: "",
      value: "",
      deadline: ""
    },
    open
  );

  useEffect(() => {
    if (open) {
      fetchArchitects();
    }
  }, [open]);

  useEffect(() => {
    if (project && open) {
      // Limpar dados persistidos antigos para garantir dados frescos do banco
      clearPersistedData();
      setFormData({
        name: project.name || "",
        architect_id: project.architect_id || "sem-arquiteto",
        stage: project.stage || "recebido",
        value: project.value?.toString() || "",
        deadline: project.deadline ? project.deadline.split('T')[0] : ""
      });
    }
  }, [project, open]);

  const fetchArchitects = async () => {
    const { data, error } = await supabase
      .from('architects')
      .select('id, name')
      .order('name');
    
    if (!error && data) {
      setArchitects(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Capturar valores antigos para webhook
      const oldStage = project.stage;
      const oldDeadline = project.deadline;

      const { error } = await supabase
        .from("projects")
        .update({
          name: formData.name,
          architect_id: formData.architect_id && formData.architect_id !== "sem-arquiteto" ? formData.architect_id : null,
          stage: formData.stage,
          value: formData.value ? parseFloat(formData.value) : 0,
          deadline: formData.deadline ? `${formData.deadline}T00:00:00-03:00` : null
        })
        .eq("id", project.id);

      if (error) throw error;

      // Notificar webhooks n8n (se configurado)
      if (oldStage !== formData.stage) {
        notifyStageChanged(project, oldStage, formData.stage);
      }
      if (oldDeadline !== formData.deadline) {
        notifyDeadlineChanged(project, oldDeadline, formData.deadline || null);
      }

      toast.success("Projeto atualizado com sucesso!");
      clearPersistedData();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar projeto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Editar Projeto</DialogTitle>
        </DialogHeader>

        <FormSaveIndicator hasRestoredData={hasRestoredData} className="mb-4" />

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-name">Nome do Projeto</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-architect">Parceiro Profissional</Label>
              <Select value={formData.architect_id} onValueChange={(v) => setFormData({ ...formData, architect_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o parceiro profissional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem-arquiteto">Cliente sem parceiro profissional</SelectItem>
                  {architects.map((arch) => (
                    <SelectItem key={arch.id} value={arch.id}>
                      {arch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-stage">Estágio</Label>
              <Select value={formData.stage} onValueChange={(v) => setFormData({ ...formData, stage: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estágio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recebido">Recebido</SelectItem>
                  <SelectItem value="em_orcamento">Em Orçamento</SelectItem>
                  <SelectItem value="orcado">Orçado</SelectItem>
                  <SelectItem value="apresentado">Apresentado</SelectItem>
                  <SelectItem value="em_negociacao">Em Negociação</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-value">Valor (R$)</Label>
              <Input
                id="edit-value"
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-deadline">Prazo de Entrega</Label>
              <DateBrInput
                id="edit-deadline"
                value={formData.deadline}
                onChange={(iso) => setFormData({ ...formData, deadline: iso })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
