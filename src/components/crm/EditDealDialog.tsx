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

interface EditDealDialogProps {
  deal: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditDealDialog({
  deal,
  open,
  onOpenChange,
  onSuccess,
}: EditDealDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState<any[]>([]);
  const [architects, setArchitects] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    stage_id: "",
    architect_id: "",
    value: "",
    note: "",
    temperature: "frio",
  });

  useEffect(() => {
    if (open && deal) {
      setFormData({
        title: deal.title || "",
        stage_id: deal.stage_id || "",
        architect_id: deal.architect_id || "",
        value: deal.value?.toString() || "",
        note: deal.note || "",
        temperature: deal.lead?.temperature || "frio",
      });
      fetchOptions();
    }
  }, [open, deal]);

  const fetchOptions = async () => {
    if (!deal?.pipeline_id) return;

    // Fetch stages
    const { data: stagesData } = await supabase
      .from("crm_stages")
      .select("*")
      .eq("pipeline_id", deal.pipeline_id)
      .order("position");

    // Fetch architects
    const { data: architectsData } = await supabase
      .from("architects")
      .select("id, name")
      .eq("active", true)
      .order("name");

    setStages(stagesData || []);
    setArchitects(architectsData || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const updateData: any = {
      title: formData.title,
      architect_id: formData.architect_id || null,
      value: formData.value ? Number(formData.value) : 0,
      note: formData.note || null,
    };

    // If stage changed, update stage_id and stage_entered_at
    if (formData.stage_id !== deal.stage_id) {
      updateData.stage_id = formData.stage_id;
      updateData.stage_entered_at = new Date().toISOString();
    }

    const { error: dealError } = await supabase
      .from("crm_deals")
      .update(updateData)
      .eq("id", deal.id);

    if (dealError) {
      setLoading(false);
      toast({
        title: "Erro ao atualizar negócio",
        description: dealError.message,
        variant: "destructive",
      });
      return;
    }

    // Atualizar temperatura do lead se houver lead vinculado
    if (deal.lead_id) {
      const { error: leadError } = await supabase
        .from("leads")
        .update({ temperature: formData.temperature })
        .eq("id", deal.lead_id);

      if (leadError) {
        console.error("Erro ao atualizar temperatura:", leadError);
      }
    }

    setLoading(false);

    toast({
      title: "Sucesso",
      description: "Negócio atualizado com sucesso!",
    });

    onOpenChange(false);
    onSuccess();
  };

  if (!deal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Negócio</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
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
              <Label htmlFor="architect">Arquiteto</Label>
              <Select
                value={formData.architect_id || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, architect_id: value === "none" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o arquiteto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {architects.map((arch) => (
                    <SelectItem key={arch.id} value={arch.id}>
                      {arch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
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
            <Label htmlFor="temperature">Temperatura do Lead</Label>
            <Select
              value={formData.temperature}
              onValueChange={(value) =>
                setFormData({ ...formData, temperature: value })
              }
            >
              <SelectTrigger id="temperature">
                <SelectValue placeholder="Selecione a temperatura" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="frio">❄️ Frio</SelectItem>
                <SelectItem value="quente">🔥 Quente</SelectItem>
              </SelectContent>
            </Select>
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
