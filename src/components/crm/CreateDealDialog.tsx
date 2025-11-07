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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  onSuccess: () => void;
}

export function CreateDealDialog({
  open,
  onOpenChange,
  pipelineId,
  onSuccess,
}: CreateDealDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [architects, setArchitects] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    stage_id: "",
    lead_id: "",
    architect_id: "",
    value: "",
    note: "",
  });

  useEffect(() => {
    if (open && pipelineId) {
      fetchOptions();
    }
  }, [open, pipelineId]);

  const fetchOptions = async () => {
    // Fetch stages
    const { data: stagesData } = await supabase
      .from("crm_stages")
      .select("*")
      .eq("pipeline_id", pipelineId)
      .order("position");

    // Fetch leads with client info
    const { data: leadsData } = await supabase
      .from("leads")
      .select("id, client:clients(name)")
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch architects
    const { data: architectsData } = await supabase
      .from("architects")
      .select("id, name")
      .eq("active", true)
      .order("name");

    setStages(stagesData || []);
    setLeads(leadsData || []);
    setArchitects(architectsData || []);

    if (stagesData && stagesData.length > 0) {
      setFormData((prev) => ({ ...prev, stage_id: stagesData[0].id }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("crm_deals").insert({
      pipeline_id: pipelineId,
      title: formData.title,
      stage_id: formData.stage_id,
      lead_id: formData.lead_id || null,
      architect_id: formData.architect_id || null,
      value: formData.value ? Number(formData.value) : 0,
      note: formData.note || null,
      status: "aberto",
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Erro ao criar negócio",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Negócio criado com sucesso!",
    });

    setFormData({
      title: "",
      stage_id: "",
      lead_id: "",
      architect_id: "",
      value: "",
      note: "",
    });
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Negócio</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Ex: Mesa maciça 6 lugares"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stage">Etapa *</Label>
              <Select
                value={formData.stage_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, stage_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a etapa" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead">Lead</Label>
              <Select
                value={formData.lead_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, lead_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.client?.name || "Sem nome"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="architect">Arquiteto</Label>
              <Select
                value={formData.architect_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, architect_id: value })
                }
              >
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
              <Label htmlFor="value">Valor (R$)</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) =>
                  setFormData({ ...formData, value: e.target.value })
                }
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Observações</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) =>
                setFormData({ ...formData, note: e.target.value })
              }
              placeholder="Observações sobre o negócio..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
