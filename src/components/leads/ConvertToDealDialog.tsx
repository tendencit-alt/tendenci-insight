import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput, parseCurrencyToNumber } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConvertToDealDialogProps {
  lead: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ConvertToDealDialog({ lead, open, onOpenChange, onSuccess }: ConvertToDealDialogProps) {
  const [loading, setLoading] = useState(false);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    pipeline_id: "",
    amount: "",
    notes: ""
  });

  useEffect(() => {
    fetchPipelines();
  }, []);

  const fetchPipelines = async () => {
    const { data } = await supabase
      .from("pipelines")
      .select("id, name")
      .order("name");
    
    if (data) setPipelines(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create deal
      const { error: dealError } = await supabase
        .from("deals")
        .insert({
          lead_id: lead.id,
          pipeline_id: formData.pipeline_id,
          amount: parseCurrencyToNumber(formData.amount),
          title: `Negócio - ${lead.client?.name}`,
          status: "aberto"
        });

      if (dealError) throw dealError;

      // Update lead status
      const { error: leadError } = await supabase
        .from("leads")
        .update({ status: "fechado" })
        .eq("id", lead.id);

      if (leadError) throw leadError;

      toast.success("Lead convertido em negócio com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao converter lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Converter Lead em Negócio</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="pipeline">Pipeline *</Label>
            <Select value={formData.pipeline_id} onValueChange={(v) => setFormData({ ...formData, pipeline_id: v })} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o pipeline" />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((pipeline) => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor Estimado (R$) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Descrição / Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Adicione observações sobre este negócio..."
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Convertendo..." : "Converter"}
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
