import { useState, useEffect, useRef } from "react";
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
import { Calendar as CalendarIcon, Mic, Square, Paperclip, Loader2, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DealFileUpload } from "./DealFileUpload";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { logDealChange, logStageChange, getDisplayValue } from "@/utils/dealHistory";
import { CreateLeadDialog } from "@/components/leads/CreateLeadDialog";
import { CreateArchitectDialog } from "@/components/architects/CreateArchitectDialog";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { FormSaveIndicator } from "@/components/ui/FormSaveIndicator";

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
  const [sources, setSources] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [scheduledCall, setScheduledCall] = useState<Date>();
  const [dealFiles, setDealFiles] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [isArchitectDialogOpen, setIsArchitectDialogOpen] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData, clearPersistedData, hasRestoredData] = useFormPersistence(
    `edit-deal-form-${deal?.id || 'new'}`,
    {
      title: "",
      stage_id: "",
      architect_id: "",
      value: "",
      note: "",
      temperature: "frio",
      product_type: "",
      conversation_history: "",
      owner_id: "",
      source_id: "",
      lead_id: "",
    },
    open
  );

  useEffect(() => {
    if (open && deal) {
      setFormData({
        title: deal.title || "",
        stage_id: deal.stage_id || "",
        architect_id: deal.architect_id || "",
        value: deal.value?.toString() || "",
        note: deal.note || "",
        temperature: deal.lead?.temperature || "frio",
        product_type: deal.product_type || "",
        conversation_history: deal.conversation_history || "",
        owner_id: deal.owner_id || "",
        source_id: deal.lead?.source_id?.toString() || "",
        lead_id: deal.lead_id || "",
      });
      
      if (deal.scheduled_call) {
        setScheduledCall(new Date(deal.scheduled_call));
      } else {
        setScheduledCall(undefined);
      }
      
      fetchOptions();
      fetchDealFiles();
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

    // Fetch lead sources
    const { data: sourcesData } = await supabase
      .from("lead_sources")
      .select("id, name")
      .order("name");

    // Fetch clients
    const { data: clientsData } = await supabase
      .from("leads")
      .select(`
        id,
        client:clients(id, name, phone)
      `)
      .order("created_at", { ascending: false });

    // Fetch owners (profiles)
    const { data: ownersData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name");

    setStages(stagesData || []);
    setArchitects(architectsData || []);
    setSources(sourcesData || []);
    setClients(clientsData || []);
    setOwners(ownersData || []);
  };

  const handleArchitectCreated = async (architectId: string) => {
    await fetchOptions();
    setFormData({ ...formData, architect_id: architectId });
    setIsArchitectDialogOpen(false);
    toast({
      title: "Arquiteto criado",
      description: "O novo arquiteto foi criado e selecionado.",
    });
  };

  const fetchDealFiles = async () => {
    if (!deal?.id) return;

    const { data, error } = await supabase
      .from("crm_deal_files")
      .select("*")
      .eq("deal_id", deal.id)
      .order("uploaded_at", { ascending: false });

    if (!error && data) {
      setDealFiles(data);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await saveAudioFile(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Erro ao iniciar gravação",
        description: "Verifique as permissões do microfone.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const saveAudioFile = async (audioBlob: Blob) => {
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const fileName = `audio_${Date.now()}.webm`;
      const filePath = `${deal.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("crm-files")
        .upload(filePath, audioBlob);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("crm_deal_files").insert({
        deal_id: deal.id,
        file_name: fileName,
        file_path: filePath,
        file_type: "audio/webm",
        file_size: audioBlob.size,
        uploaded_by: user.id,
      });

      if (dbError) throw dbError;

      toast({
        title: "Áudio gravado",
        description: "O áudio foi salvo com sucesso.",
      });

      fetchDealFiles();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar áudio",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      for (const file of Array.from(files)) {
        if (file.size > 100 * 1024 * 1024) {
          toast({
            title: "Arquivo muito grande",
            description: `${file.name} excede o limite de 100MB`,
            variant: "destructive",
          });
          continue;
        }

        const fileName = `${Date.now()}_${file.name}`;
        const filePath = `${deal.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("crm-files")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase.from("crm_deal_files").insert({
          deal_id: deal.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
        });

        if (dbError) throw dbError;
      }

      toast({
        title: "Arquivos enviados",
        description: "Os arquivos foram enviados com sucesso.",
      });

      fetchDealFiles();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      toast({
        title: "Erro ao enviar arquivos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title) {
      toast({
        title: "Campo obrigatório",
        description: "O título do negócio é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Track only changes NOT logged by database trigger
      const changes: Array<{field_name: string, old_value: string, new_value: string}> = [];
      
      // lead_id is NOT logged by trigger, so we manually log it
      if (formData.lead_id !== deal.lead_id) {
        const oldValue = await getDisplayValue('lead_id', deal.lead_id);
        const newValue = await getDisplayValue('lead_id', formData.lead_id);
        changes.push({
          field_name: 'lead_id',
          old_value: oldValue,
          new_value: newValue,
        });
      }
      
      // Validação: Verificar se a nova etapa é "Qualificação" ou "Em Negociação" e se há valor
      if (formData.stage_id && formData.stage_id !== deal.stage_id) {
        const selectedStage = stages.find(s => s.id === formData.stage_id);
        if (selectedStage) {
          const stageName = selectedStage.name.toLowerCase();
          const requiresValue = stageName.includes("negociação");
          
          if (requiresValue && (!formData.value || Number(formData.value) <= 0)) {
            setLoading(false);
            toast({
              title: "Valor obrigatório",
              description: "Para a etapa 'Negociação', é obrigatório informar o valor (R$) do negócio.",
              variant: "destructive",
            });
            return;
          }
        }
      }

      const updateData: any = {
        title: formData.title,
        architect_id: formData.architect_id || null,
        owner_id: formData.owner_id || null,
        lead_id: formData.lead_id || null,
        value: formData.value ? Number(formData.value) : 0,
        note: formData.note || null,
        product_type: formData.product_type || null,
        conversation_history: formData.conversation_history || null,
        scheduled_call: scheduledCall?.toISOString() || null,
        updated_at: new Date().toISOString(),
      };

      // If stage changed, update stage_id and stage_entered_at
      if (formData.stage_id && formData.stage_id !== deal.stage_id) {
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

      // Log only changes NOT handled by database trigger (lead_id)
      if (changes.length > 0) {
        await logDealChange(deal.id, changes);
      }

      // Atualizar temperatura e origem do lead se houver lead vinculado
      if (formData.lead_id) {
        const { error: leadError } = await supabase
          .from("leads")
          .update({ 
            temperature: formData.temperature,
            source_id: formData.source_id ? Number(formData.source_id) : null
          })
          .eq("id", formData.lead_id);

        if (leadError) {
          // Silenciar erro de atualização de lead
        }
      }
      toast({
        title: "Sucesso",
        description: "Negócio atualizado com sucesso!",
      });

      clearPersistedData();
      setLoading(false);
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

  if (!deal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          // Permite interação com selects, popovers e calendários
          if (e.target instanceof Element && (
            e.target.closest('[role="dialog"]') || 
            e.target.closest('[role="listbox"]') ||
            e.target.closest('.react-day-picker')
          )) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Editar Negócio</DialogTitle>
        </DialogHeader>

        <FormSaveIndicator hasRestoredData={hasRestoredData} className="mb-4" />

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
                <Label htmlFor="product_type">Tipo de Produto</Label>
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

          {/* Seção: Lead e Responsáveis */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Lead e Responsáveis</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="lead_id">Cliente (Lead)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateLead(true)}
                    className="h-7 text-xs"
                  >
                    + Novo Cliente
                  </Button>
                </div>
                <Select
                  value={formData.lead_id || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, lead_id: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {clients.map((lead: any) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.client?.name || "Sem nome"} {lead.client?.phone && `- ${lead.client.phone}`}
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
                  <SelectTrigger id="temperature">
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="architect">Arquiteto</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsArchitectDialogOpen(true)}
                    className="h-7 text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Novo Arquiteto
                  </Button>
                </div>
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

              <div className="space-y-2">
                <Label htmlFor="owner">Vendedor</Label>
                <Select
                  value={formData.owner_id || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, owner_id: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
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
                
                <div className="flex gap-2 mb-2">
                  <Button
                    type="button"
                    variant={isRecording ? "destructive" : "outline"}
                    size="sm"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isUploading}
                  >
                    {isRecording ? (
                      <>
                        <Square className="h-4 w-4 mr-2" />
                        Parar Gravação
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-2" />
                        Gravar Áudio
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Paperclip className="h-4 w-4 mr-2" />
                        Anexar Arquivo
                      </>
                    )}
                  </Button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.txt,.jpg,.jpeg,.png,.webp"
                  />
                </div>

                {isUploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando arquivo...
                  </div>
                )}
                
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

              <DealFileUpload
                dealId={deal?.id || ""}
                files={dealFiles}
                onFilesChange={fetchDealFiles}
              />

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

      <CreateLeadDialog
        open={showCreateLead}
        onOpenChange={setShowCreateLead}
        onSuccess={(newLead) => {
          setFormData({ ...formData, lead_id: newLead.id });
          fetchOptions();
          setShowCreateLead(false);
        }}
      />

      <CreateArchitectDialog
        open={isArchitectDialogOpen}
        onOpenChange={setIsArchitectDialogOpen}
        onSuccess={handleArchitectCreated}
      />
    </Dialog>
  );
}
