import { useState, useEffect, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput, parseCurrencyToNumber, formatToCurrencyDisplay } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableCombobox, ComboboxOption } from "@/components/ui/searchable-combobox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Mic, Square, Paperclip, Loader2, Plus, Target, X, Trash2 } from "lucide-react";
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
import { useDeleteWithTracking } from "@/hooks/useDeleteWithTracking";
import { Badge } from "@/components/ui/badge";
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
  const [loadingClients, setLoadingClients] = useState(true);
  // Estado para preservar lead_id original do deal (imutável durante edição)
  const [originalLeadId, setOriginalLeadId] = useState<string | null>(null);
  // Estado para preservar owner_id original do deal (imutável durante edição)
  const [originalOwnerId, setOriginalOwnerId] = useState<string | null>(null);
  const [scheduledCall, setScheduledCall] = useState<Date>();
  const [dealFiles, setDealFiles] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [isArchitectDialogOpen, setIsArchitectDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const { logDeletion } = useDeleteWithTracking();
  
  // Estados para indicações
  const [existingIndications, setExistingIndications] = useState<any[]>([]);
  const [pendingIndications, setPendingIndications] = useState<Array<{
    architect_id: string;
    architect_name: string;
    product_type: string;
    value: string;
    notes: string;
  }>>([]);
  const [newIndication, setNewIndication] = useState({
    architect_id: "",
    product_type: "",
    value: "",
    notes: "",
  });
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Referência ao fileInput para upload

  // CORREÇÃO: Desabilitar persistência para este form (enabled = false)
  // O lead_id estava sendo perdido porque o localStorage sobrescrevia o valor correto do deal
  // Em vez de persistir, sempre carregar dados frescos do deal ao abrir
  const [formData, setFormData, clearPersistedData, hasRestoredData] = useFormPersistence(
    `edit-deal-form-${deal?.id || 'new'}`,
    {
      title: "",
      stage_id: "",
      architect_id: "",
      value: "",
      note: "",
      temperature: "frio",
      tipos_produto: [] as string[],
      categoria: "",
      conversation_history: "",
      owner_id: "",
      source_id: "",
      lead_id: "",
    },
    false  // DESABILITADO: Evita restaurar dados antigos que sobrescrevem lead_id
  );

  useEffect(() => {
    if (open && deal) {
      // IMPORTANTE: Salvar lead_id e owner_id originais ANTES de qualquer manipulação
      // Isso garante que temos um fallback seguro caso formData fique vazio
      setOriginalLeadId(deal.lead_id || null);
      setOriginalOwnerId(deal.owner_id || null);
      console.log("🔐 Dialog aberto - originalLeadId salvo:", deal.lead_id, "originalOwnerId salvo:", deal.owner_id);
      
      // Limpar dados persistidos antes de carregar dados frescos do deal
      clearPersistedData();
      
      // Sempre usar os dados do deal, ignorando qualquer valor persistido
      // Converter string "Sofá, Mesa" em array ["Sofá", "Mesa"]
      const tiposProdutoArray = deal.tipo_produto 
        ? deal.tipo_produto.split(",").map((t: string) => t.trim()).filter(Boolean)
        : [];
      
      setFormData({
        title: deal.title || "",
        stage_id: deal.stage_id || "",
        architect_id: deal.architect_id || "",
        value: deal.value != null ? formatToCurrencyDisplay(Number(deal.value)) : "",
        note: deal.note || "",
        temperature: deal.lead?.temperature || "frio",
        tipos_produto: tiposProdutoArray,
        categoria: deal.categoria || "",
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
      fetchExistingIndications();
      // Limpar indicações pendentes ao abrir
      setPendingIndications([]);
      setNewIndication({ architect_id: "", product_type: "", value: "", notes: "" });
    }
  }, [open, deal]);

  // Pré-preencher observações do cliente quando um lead é alterado
  useEffect(() => {
    if (formData.lead_id && clients.length > 0 && formData.lead_id !== deal?.lead_id) {
      const selectedLead = clients.find((l: any) => l.id === formData.lead_id);
      if (selectedLead?.client?.notes && !formData.note) {
        setFormData((prev) => ({
          ...prev,
          note: selectedLead.client.notes,
        }));
      }
    }
  }, [formData.lead_id, clients]);

  const fetchExistingIndications = async () => {
    if (!deal?.id) return;
    
    const { data } = await supabase
      .from("architect_indications")
      .select(`
        id,
        architect_id,
        product_type,
        value,
        notes,
        architect:architects(name)
      `)
      .eq("deal_id", deal.id);
    
    setExistingIndications(data || []);
  };

  const fetchOptions = async () => {
    if (!deal?.pipeline_id) return;

    setLoadingClients(true);

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

    // Fetch clients with notes
    const { data: clientsData } = await supabase
      .from("leads")
      .select(`
        id,
        client:clients(id, name, phone, notes)
      `)
      .order("created_at", { ascending: false });

    // CORREÇÃO: Garantir que o lead atual do deal sempre apareça na lista
    let finalClientsData = clientsData || [];
    if (deal.lead_id) {
      const currentLeadExists = finalClientsData.find((c: any) => c.id === deal.lead_id);
      if (!currentLeadExists) {
        // Buscar o lead atual separadamente
        const { data: currentLead } = await supabase
          .from("leads")
          .select(`
            id,
            client:clients(id, name, phone, notes)
          `)
          .eq("id", deal.lead_id)
          .maybeSingle();
        
        if (currentLead) {
          finalClientsData = [currentLead, ...finalClientsData];
        }
      }
    }

    // Fetch owners (profiles)
    const { data: ownersData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name");

    setStages(stagesData || []);
    setArchitects(architectsData || []);
    setSources(sourcesData || []);
    setClients(finalClientsData);
    setOwners(ownersData || []);
    setLoadingClients(false);
  };

  // Opções memoizadas para os comboboxes com busca
  const clientOptions: ComboboxOption[] = useMemo(() => [
    { value: "none", label: "Nenhum" },
    ...clients.map((lead: any) => ({
      value: lead.id,
      label: lead.client?.name || "Sem nome",
      sublabel: lead.client?.phone || undefined,
    }))
  ], [clients]);

  const architectOptions: ComboboxOption[] = useMemo(() => [
    { value: "none", label: "Nenhum" },
    ...architects.map((arch) => ({
      value: arch.id,
      label: arch.name,
    }))
  ], [architects]);

  const handleArchitectCreated = async (architectId: string) => {
    await fetchOptions();
    setFormData({ ...formData, architect_id: architectId });
    setIsArchitectDialogOpen(false);
    toast({
      title: "Parceiro Profissional criado",
      description: "O novo parceiro profissional foi criado e selecionado.",
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

  const handleDelete = async () => {
    if (!deleteReason.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo da exclusão.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      // Buscar dados completos do deal para log
      const { data: dealData } = await supabase
        .from("crm_deals")
        .select("*")
        .eq("id", deal.id)
        .single();

      if (dealData) {
        // Registrar a exclusão antes de deletar
        await logDeletion({
          table: "crm_deals",
          id: deal.id,
          data: dealData,
          type: "Negócio CRM",
          identifier: `${deal.title} - ${deal.lead?.name || 'Sem cliente'}`,
          reason: deleteReason,
        });
      }

      const { error } = await supabase
        .from("crm_deals")
        .delete()
        .eq("id", deal.id);

      if (error) {
        toast({
          title: "Erro ao excluir",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Negócio excluído",
          description: "O negócio foi excluído com sucesso.",
        });
        setDeleteDialog(false);
        setDeleteReason("");
        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Erro ao excluir negócio:", error);
      toast({
        title: "Erro ao excluir",
        description: "Ocorreu um erro ao excluir o negócio.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(">>> handleSubmit CHAMADO! formData:", JSON.stringify(formData, null, 2));
    
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
      
      // Verificar se lead_id mudou comparando com o valor original do deal
      const originalLeadId = deal.lead_id || "";
      const currentLeadId = formData.lead_id || "";
      const leadIdChanged = originalLeadId !== currentLeadId;
      
      if (leadIdChanged) {
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

      // CORREÇÃO ROBUSTA: Lógica para preservar lead_id
      // 1. Se formData.lead_id tem valor (UUID válido) → usar esse valor
      // 2. Se formData.lead_id está vazio → usar originalLeadId como fallback seguro
      // 3. originalLeadId foi salvo ao abrir o dialog e é imutável
      let leadIdToSave: string | null = null;
      
      if (formData.lead_id && formData.lead_id.length > 10) {
        // Usuário selecionou um cliente válido
        leadIdToSave = formData.lead_id;
      } else if (originalLeadId) {
        // formData.lead_id está vazio mas tínhamos um cliente original - PRESERVAR
        leadIdToSave = originalLeadId;
      }
      
      console.log("🔐 Lead ID Debug:", {
        formDataLeadId: formData.lead_id,
        dealLeadId: deal.lead_id,
        originalLeadId,
        leadIdToSave
      });
      
      // CORREÇÃO ROBUSTA: Lógica para preservar owner_id
      // 1. Se formData.owner_id tem valor (UUID válido) → usar esse valor
      // 2. Se formData.owner_id está vazio → usar originalOwnerId como fallback seguro
      let ownerIdToSave: string | null = null;
      
      if (formData.owner_id && formData.owner_id.length > 10) {
        // Usuário selecionou um vendedor válido
        ownerIdToSave = formData.owner_id;
      } else if (originalOwnerId) {
        // formData.owner_id está vazio mas tínhamos um vendedor original - PRESERVAR
        ownerIdToSave = originalOwnerId;
      }
      
      console.log("🔐 Owner ID Debug:", {
        formDataOwnerId: formData.owner_id,
        dealOwnerId: deal.owner_id,
        originalOwnerId,
        ownerIdToSave
      });

      const updateData: any = {
        title: formData.title,
        architect_id: formData.architect_id || null,
        owner_id: ownerIdToSave,
        value: formData.value ? Number(formData.value) : 0,
        note: formData.note || null,
        tipo_produto: formData.tipos_produto.length > 0 ? formData.tipos_produto.join(", ") : null,
        categoria: formData.categoria || null,
        conversation_history: formData.conversation_history || null,
        scheduled_call: scheduledCall?.toISOString() || null,
        updated_at: new Date().toISOString(),
        lead_id: leadIdToSave,
      };

      // If stage changed, update stage_id and stage_entered_at
      if (formData.stage_id && formData.stage_id !== deal.stage_id) {
        updateData.stage_id = formData.stage_id;
        updateData.stage_entered_at = new Date().toISOString();
      }
      console.log("Dados sendo enviados para update:", JSON.stringify(updateData, null, 2));
      console.log("Deal ID:", deal.id);

      const { data: updatedDeal, error: dealError } = await supabase
        .from("crm_deals")
        .update(updateData)
        .eq("id", deal.id)
        .select()
        .maybeSingle();

      console.log("Resultado do update:", { updatedDeal, dealError });

      if (dealError) {
        setLoading(false);
        toast({
          title: "Erro ao atualizar negócio",
          description: dealError.message,
          variant: "destructive",
        });
        return;
      }

      if (!updatedDeal) {
        setLoading(false);
        toast({
          title: "Atualização bloqueada",
          description: "Você não tem permissão para editar este negócio. Verifique sua especialização ou contate um administrador.",
          variant: "destructive",
        });
        return;
      }

      // Log only changes NOT handled by database trigger (lead_id)
      if (changes.length > 0) {
        await logDealChange(deal.id, changes);
      }

      // SYNC: Se a nota foi alterada, registrar também na crm_timeline
      if (formData.note && formData.note !== deal.note) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("crm_timeline").insert({
          deal_id: deal.id,
          message: formData.note,
          update_type: "Observação",
          author_id: user?.id,
        });
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
      // Salvar novas indicações pendentes
      if (pendingIndications.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        
        const indicationsToInsert = pendingIndications.map(ind => ({
          deal_id: deal.id,
          architect_id: ind.architect_id,
          product_type: ind.product_type,
          value: ind.value ? Number(ind.value) : null,
          notes: ind.notes || null,
          created_by: user?.id,
        }));

        const { error: indicationError } = await supabase
          .from("architect_indications")
          .insert(indicationsToInsert);

        if (indicationError) {
          console.error("Erro ao salvar indicações:", indicationError);
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

  const handleAddIndication = () => {
    if (!newIndication.architect_id) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione o parceiro profissional.",
        variant: "destructive",
      });
      return;
    }

    const architect = architects.find(a => a.id === newIndication.architect_id);
    
    setPendingIndications([
      ...pendingIndications,
      {
        ...newIndication,
        product_type: "Indicação",
        architect_name: architect?.name || "Parceiro Profissional",
      },
    ]);

    setNewIndication({ architect_id: "", product_type: "", value: "", notes: "" });

    toast({
      title: "Indicação adicionada",
      description: "A indicação será salva ao confirmar as alterações.",
    });
  };

  const handleRemovePendingIndication = (index: number) => {
    setPendingIndications(pendingIndications.filter((_, i) => i !== index));
  };

  const handleDeleteExistingIndication = async (indicationId: string) => {
    const { error } = await supabase
      .from("architect_indications")
      .delete()
      .eq("id", indicationId);

    if (error) {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Indicação removida",
        description: "A indicação foi removida com sucesso.",
      });
      fetchExistingIndications();
    }
  };

  if (!deal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

              <div className="space-y-2 col-span-2">
                <Label>Tipo de Produto</Label>
                <div className="grid grid-cols-3 gap-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                  {["Sofá", "Poltrona", "Mesa", "Cadeira", "Aparador", "Banqueta", "Rack", "Cristaleira", "Estante", "Vaso", "Quadro", "Chaise", "Personalizado"].map((tp) => (
                    <div key={tp} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-tp-${tp}`}
                        checked={formData.tipos_produto.includes(tp)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, tipos_produto: [...formData.tipos_produto, tp] });
                          } else {
                            setFormData({ ...formData, tipos_produto: formData.tipos_produto.filter((t: string) => t !== tp) });
                          }
                        }}
                      />
                      <label htmlFor={`edit-tp-${tp}`} className="text-sm cursor-pointer">{tp}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Select
                  value={formData.categoria || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, categoria: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    <SelectItem value="Planejados">Planejados</SelectItem>
                    <SelectItem value="Móveis Soltos">Móveis Soltos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">Valor (R$)</Label>
                <CurrencyInput
                  value={formData.value}
                  onChange={(v) => setFormData({ ...formData, value: v })}
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
                <SearchableCombobox
                  options={clientOptions}
                  value={formData.lead_id || "none"}
                  onValueChange={(value) => {
                    const newLeadId = value === "none" ? "" : value;
                    setFormData({ ...formData, lead_id: newLeadId });
                  }}
                  placeholder={
                    loadingClients && deal?.lead_id 
                      ? "Carregando cliente..." 
                      : "Selecione o cliente"
                  }
                  searchPlaceholder="Buscar por nome ou telefone..."
                  emptyMessage="Nenhum cliente encontrado."
                  disabled={loadingClients && !!deal?.lead_id}
                />
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
                  <Label htmlFor="architect">Parceiro Profissional</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsArchitectDialogOpen(true)}
                    className="h-7 text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Novo Parceiro Profissional
                  </Button>
                </div>
                <SearchableCombobox
                  options={architectOptions}
                  value={formData.architect_id || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, architect_id: value === "none" ? "" : value })
                  }
                  placeholder="Selecione o parceiro profissional"
                  searchPlaceholder="Buscar parceiro profissional..."
                  emptyMessage="Nenhum parceiro profissional encontrado."
                />
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

          {/* Seção: Indicação de Parceiro Profissional */}
          <div className="space-y-4 bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-amber-600" />
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 uppercase">
                Indicação de Parceiro Profissional
              </h3>
              {(existingIndications.length + pendingIndications.length) > 0 && (
                <Badge variant="secondary" className="bg-amber-200 text-amber-800">
                  {existingIndications.length + pendingIndications.length} indicação(ões)
                </Badge>
              )}
            </div>

            {/* Indicações existentes */}
            {existingIndications.length > 0 && (
              <div className="space-y-2">
                <Label className="text-amber-700 dark:text-amber-300">Indicações Salvas</Label>
                <div className="space-y-2">
                  {existingIndications.map((ind) => (
                    <div key={ind.id} className="flex items-center justify-between bg-white dark:bg-background p-2 rounded border">
                      <div className="text-sm">
                        <span className="font-medium">{ind.architect?.name}</span>
                        {ind.value && <span className="text-muted-foreground"> - R$ {Number(ind.value).toLocaleString('pt-BR')}</span>}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteExistingIndication(ind.id)}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Indicações pendentes */}
            {pendingIndications.length > 0 && (
              <div className="space-y-2">
                <Label className="text-amber-700 dark:text-amber-300">Novas Indicações (não salvas)</Label>
                <div className="space-y-2">
                  {pendingIndications.map((ind, index) => (
                    <div key={index} className="flex items-center justify-between bg-white dark:bg-background p-2 rounded border border-dashed border-amber-400">
                      <div className="text-sm">
                        <span className="font-medium">{ind.architect_name}</span>
                        {ind.value && <span className="text-muted-foreground"> - R$ {Number(ind.value).toLocaleString('pt-BR')}</span>}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePendingIndication(index)}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulário para nova indicação */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Parceiro Profissional *</Label>
                <Select
                  value={newIndication.architect_id}
                  onValueChange={(value) => setNewIndication({ ...newIndication, architect_id: value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione" />
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

              <div className="space-y-1">
                <Label className="text-xs">Valor Estimado</Label>
                <CurrencyInput
                  value={newIndication.value}
                  onChange={(v) => setNewIndication({ ...newIndication, value: v })}
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Observações</Label>
                <Input
                  value={newIndication.notes}
                  onChange={(e) => setNewIndication({ ...newIndication, notes: e.target.value })}
                  placeholder="Observações"
                  className="h-9"
                />
              </div>

            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddIndication}
              className="w-full border-amber-400 text-amber-700 hover:bg-amber-100"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Indicação
            </Button>
          </div>

          <div className="flex justify-between items-center gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50"
              onClick={() => setDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
            <div className="flex gap-2">
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

      <AlertDialog open={deleteDialog} onOpenChange={(open) => {
        setDeleteDialog(open);
        if (!open) setDeleteReason("");
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir negócio</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este negócio? Esta ação não pode ser desfeita.
              Por favor, informe o motivo da exclusão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="delete-reason">Motivo da Exclusão *</Label>
            <Textarea
              id="delete-reason"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Informe o motivo da exclusão..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isDeleting || !deleteReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
