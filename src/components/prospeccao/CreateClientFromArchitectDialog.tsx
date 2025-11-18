import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CreateClientFromArchitectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  architectId: string;
  architectName: string;
  onSuccess?: () => void;
}

export function CreateClientFromArchitectDialog({
  open,
  onOpenChange,
  architectId,
  architectName,
  onSuccess,
}: CreateClientFromArchitectDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    state: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Criar cliente
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          city: formData.city,
          state: formData.state,
          notes: formData.notes,
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // 2. Criar lead vinculado ao cliente e arquiteto
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .insert({
          client_id: client.id,
          architect_id: architectId,
          status: "novo",
          temperature: "frio",
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // 3. Buscar o primeiro pipeline e sua primeira stage
      const { data: pipelines } = await supabase
        .from("crm_pipelines")
        .select("id, crm_stages(id, position)")
        .order("created_at")
        .limit(1)
        .single();

      if (pipelines && pipelines.crm_stages && pipelines.crm_stages.length > 0) {
        const firstStage = pipelines.crm_stages.sort((a: any, b: any) => a.position - b.position)[0];

        // 4. Criar deal no CRM
        const { data: user } = await supabase.auth.getUser();
        
        const { error: dealError } = await supabase
          .from("crm_deals")
          .insert({
            title: `${formData.name} - ${architectName}`,
            lead_id: lead.id,
            architect_id: architectId,
            pipeline_id: pipelines.id,
            stage_id: firstStage.id,
            owner_id: user.user?.id,
            value: 0,
            status: "aberto",
            note: formData.notes,
          });

        if (dealError) throw dealError;
      }

      // 5. Registrar no histórico do arquiteto
      await supabase.from("architect_history").insert({
        architect_id: architectId,
        event_type: "cliente_cadastrado",
        description: `Cliente ${formData.name} cadastrado e vinculado ao arquiteto`,
      });

      toast({
        title: "Sucesso!",
        description: "Cliente cadastrado, lead criado e oportunidade adicionada ao CRM",
      });

      setFormData({
        name: "",
        phone: "",
        email: "",
        city: "",
        state: "",
        notes: "",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Erro ao cadastrar cliente:", error);
      toast({
        title: "Erro ao cadastrar cliente",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Cliente para {architectName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Cliente *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cadastrar Cliente
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
