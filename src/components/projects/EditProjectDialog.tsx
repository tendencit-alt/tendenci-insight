import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditProjectDialogProps {
  project: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditProjectDialog({ project, open, onOpenChange, onSuccess }: EditProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [architects, setArchitects] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    architect_id: "",
    stage: "",
    value: "",
    sent_at: ""
  });

  useEffect(() => {
    if (open) {
      fetchArchitects();
    }
  }, [open]);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || "",
        architect_id: project.architect_id || "",
        stage: project.stage || "captado",
        value: project.value?.toString() || "",
        sent_at: project.sent_at ? project.sent_at.split('T')[0] : ""
      });
    }
  }, [project]);

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
      const { error } = await supabase
        .from("projects")
        .update({
          name: formData.name,
          architect_id: formData.architect_id || null,
          stage: formData.stage,
          value: formData.value ? parseFloat(formData.value) : 0,
          sent_at: formData.sent_at || null
        })
        .eq("id", project.id);

      if (error) throw error;

      toast.success("Projeto atualizado com sucesso!");
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
              <Label htmlFor="edit-architect">Arquiteto</Label>
              <Select value={formData.architect_id} onValueChange={(v) => setFormData({ ...formData, architect_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o arquiteto" />
                </SelectTrigger>
                <SelectContent>
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
                  <SelectItem value="captado">Captado</SelectItem>
                  <SelectItem value="orçamento">Em Orçamento</SelectItem>
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
              <Label htmlFor="edit-sent_at">Prazo de Entrega</Label>
              <Input
                id="edit-sent_at"
                type="date"
                value={formData.sent_at}
                onChange={(e) => setFormData({ ...formData, sent_at: e.target.value })}
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
