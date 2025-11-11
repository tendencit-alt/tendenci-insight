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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { CreateClientDialog } from "./CreateClientDialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  const [sources, setSources] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [scheduledCall, setScheduledCall] = useState<Date>();

  const [formData, setFormData] = useState({
    title: "",
    stage_id: "",
    lead_id: "",
    architect_id: "",
    value: "",
    note: "",
    temperature: "frio",
    product_type: "",
    conversation_history: "",
    owner_id: "",
    source_id: "",
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
      .select("id, client:clients(name, phone, email)")
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch architects
    const { data: architectsData } = await supabase
      .from("architects")
      .select("id, name")
      .eq("active", true)
      .order("name");

    // Fetch lead sources
    const { data: sourcesData } = await supabase
      .from("lead_sources")
      .select("id, name")
      .order("name");

    // Fetch owners (profiles)
    const { data: ownersData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name");

    setStages(stagesData || []);
    setLeads(leadsData || []);
    setArchitects(architectsData || []);
    setSources(sourcesData || []);
    setOwners(ownersData || []);

    if (stagesData && stagesData.length > 0) {
      setFormData((prev) => ({ ...prev, stage_id: stagesData[0].id }));
    }
  };

  const handleClientCreated = async (clientId: string) => {
    // Create a lead for the new client with temperature
    const { data: leadData, error } = await supabase
      .from("leads")
      .insert({ 
        client_id: clientId, 
        status: "novo",
        temperature: formData.temperature,
        source_id: formData.source_id ? Number(formData.source_id) : null
      })
      .select()
      .single();

    if (!error && leadData) {
      await fetchOptions();
      setFormData((prev) => ({ ...prev, lead_id: leadData.id }));
      toast({
        title: "Sucesso",
        description: "Cliente e lead criados!",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update lead temperature if lead is selected
      if (formData.lead_id) {
        await supabase
          .from("leads")
          .update({ 
            temperature: formData.temperature,
            source_id: formData.source_id ? Number(formData.source_id) : null
          })
          .eq("id", formData.lead_id);
      }

      // Insert deal
      const { error } = await supabase.from("crm_deals").insert({
        pipeline_id: pipelineId,
        title: formData.title,
        stage_id: formData.stage_id,
        lead_id: formData.lead_id || null,
        architect_id: formData.architect_id || null,
        owner_id: formData.owner_id || null,
        value: formData.value ? Number(formData.value) : 0,
        note: formData.note || null,
        product_type: formData.product_type || null,
        conversation_history: formData.conversation_history || null,
        scheduled_call: scheduledCall?.toISOString() || null,
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
        temperature: "frio",
        product_type: "",
        conversation_history: "",
        owner_id: "",
        source_id: "",
      });
      setScheduledCall(undefined);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      setLoading(false);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Negócio</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seção: Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Informações Básicas</h3>
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
                <Label htmlFor="product_type">Tipo de Produto *</Label>
                <Select
                  value={formData.product_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, product_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Planejado">Planejado</SelectItem>
                    <SelectItem value="Móvel">Móvel</SelectItem>
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
          </div>

          {/* Seção: Lead e Cliente */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Lead e Cliente</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="lead">Lead</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsClientDialogOpen(true)}
                    className="h-7 text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Novo Cliente
                  </Button>
                </div>
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
                        {lead.client?.phone && ` - ${lead.client.phone}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperature">Temperatura do Lead</Label>
                <Select
                  value={formData.temperature}
                  onValueChange={(value) =>
                    setFormData({ ...formData, temperature: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a temperatura" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frio">❄️ Frio</SelectItem>
                    <SelectItem value="morno">☀️ Morno</SelectItem>
                    <SelectItem value="quente">🔥 Quente</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Será atualizado automaticamente pela IA
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="source">Origem do Lead</Label>
                <Select
                  value={formData.source_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, source_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((source) => (
                      <SelectItem key={source.id} value={source.id.toString()}>
                        {source.name}
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
                <Label htmlFor="owner">Responsável Principal</Label>
                <Select
                  value={formData.owner_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, owner_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {owners.map((owner) => (
                      <SelectItem key={owner.id} value={owner.id}>
                        {owner.full_name || owner.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Seção: Comunicação */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Comunicação</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="note">Observações</Label>
                <Textarea
                  id="note"
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                  placeholder="Anotações gerais ou informações relevantes sobre o lead..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conversation_history">Histórico de Mensagens (IA / WhatsApp)</Label>
                <Textarea
                  id="conversation_history"
                  value={formData.conversation_history}
                  onChange={(e) =>
                    setFormData({ ...formData, conversation_history: e.target.value })
                  }
                  placeholder="Campo automatizado — recebe logs de conversas via integração com IA e WhatsApp"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  💬 Integração futura com WhatsApp para preencher automaticamente
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduled_call">Agendar Ligação</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !scheduledCall && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledCall ? (
                        format(scheduledCall, "dd/MM/yyyy")
                      ) : (
                        <span>Defina data e hora para follow-up</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledCall}
                      onSelect={setScheduledCall}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
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

      <CreateClientDialog
        open={isClientDialogOpen}
        onOpenChange={setIsClientDialogOpen}
        onSuccess={handleClientCreated}
      />
    </Dialog>
  );
}
