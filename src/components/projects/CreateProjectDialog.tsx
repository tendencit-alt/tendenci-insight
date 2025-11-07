import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useWebhookSync } from "@/hooks/useWebhookSync";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateProjectDialog({ open, onOpenChange, onSuccess }: CreateProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [architects, setArchitects] = useState<any[]>([]);
  const { notifyProjectCreated } = useWebhookSync();
  const [formData, setFormData] = useState({
    name: "",
    client_id: "",
    architect_id: "",
    stage: "captado",
    value: "",
    deadline: "",
    notes: ""
  });

  useEffect(() => {
    if (open) {
      fetchLeads();
      fetchArchitects();
    }
  }, [open]);

  const fetchLeads = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name')
      .order('name');
    
    if (!error && data) {
      setLeads(data);
    }
  };

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
    
    if (!formData.name || !formData.client_id) {
      toast.error("Nome do projeto e cliente são obrigatórios");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: formData.name,
          client_id: formData.client_id,
          architect_id: formData.architect_id || null,
          stage: formData.stage,
          value: formData.value ? parseFloat(formData.value) : 0,
          deadline: formData.deadline || null
        })
        .select()
        .single();

      if (error) throw error;

      // Notificar webhook n8n (se configurado)
      if (data) {
        notifyProjectCreated(data);
      }

      toast.success("Projeto criado com sucesso!");
      
      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: "",
        client_id: "",
        architect_id: "",
        stage: "captado",
        value: "",
        deadline: "",
        notes: ""
      });
      
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar projeto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Novo Projeto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">Nome do Projeto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Ex: Mesa Maciça Família Silva"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">Cliente *</Label>
              <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="architect">Arquiteto</Label>
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
              <Label htmlFor="stage">Estágio *</Label>
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
              <Label htmlFor="value">Valor (R$)</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="deadline">Prazo de Entrega</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Anotações sobre o projeto..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
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
