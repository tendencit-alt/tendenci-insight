import { useState, useEffect, useRef, useMemo } from "react";
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
import { SearchableCombobox, ComboboxOption } from "@/components/ui/searchable-combobox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Calendar as CalendarIcon, Clock, Trash2, Mic, Square, Paperclip, Loader2, Target } from "lucide-react";
import { validateFileType, validateFileSize, MAX_FILE_SIZE_MB, ALLOWED_FILE_TYPES_ACCEPT } from "@/lib/utils";
import { CreateClientDialog } from "./CreateClientDialog";
import { CreateArchitectDialog } from "../architects/CreateArchitectDialog";
import { CreateProjectDialog } from "../projects/CreateProjectDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { FormSaveIndicator } from "@/components/ui/FormSaveIndicator";
import { formatBrasil } from "@/utils/taskTimezone";
import { useCostCenters } from "@/hooks/useCostCenters";
import { validateAndShowErrors, formatDatabaseError, ValidationRule } from "@/lib/formValidation";
import { toast as sonnerToast } from "sonner";

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
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const { costCenters: CENTROS_CUSTO } = useCostCenters();
  const [stages, setStages] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [architects, setArchitects] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isArchitectDialogOpen, setIsArchitectDialogOpen] = useState(false);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);

  const [tasks, setTasks] = useState<Array<{ title: string; due_at: string; note: string }>>([]);
  const [newTask, setNewTask] = useState({ title: "", due_at: "", note: "" });
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingAudios, setPendingAudios] = useState<Blob[]>([]);
  
  // Estado para indicações pendentes
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
    notes: ""
  });
  const [showIndicationForm, setShowIndicationForm] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData, clearPersistedData, hasRestoredData] = useFormPersistence(
    `create-deal-form-${pipelineId}`,
    {
      stage_id: "",
      lead_id: "",
      architect_id: "",
      project_id: "",
      value: "",
      note: "",
      temperature: "frio",
      categorias: [] as string[],
      centros_custo: [] as string[],
      tipos_produto: [] as string[],
      observations: "",
      conversation_history: "",
      owner_id: "",
      source_id: "",
    },
    open
  );

  useEffect(() => {
    if (open && pipelineId) {
      fetchOptions();
    }
  }, [open, pipelineId]);

  // Pré-preencher observações do cliente quando um lead é selecionado
  useEffect(() => {
    if (formData.lead_id && leads.length > 0) {
      const selectedLead = leads.find((l: any) => l.id === formData.lead_id);
      if (selectedLead?.client?.notes && !formData.observations) {
        setFormData((prev) => ({
          ...prev,
          observations: selectedLead.client.notes,
        }));
      }
    }
  }, [formData.lead_id, leads]);

  const fetchOptions = async () => {
    // Fetch stages
    const { data: stagesData } = await supabase
      .from("crm_stages")
      .select("*")
      .eq("pipeline_id", pipelineId)
      .order("position");

    // Fetch leads with client info including notes
    const { data: leadsData } = await supabase
      .from("leads")
      .select("id, client:clients(id, name, phone, email, notes)")
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

    // Fetch projects
    const { data: projectsData } = await supabase
      .from("projects")
      .select("id, name, client:clients(name)")
      .is("deal_id", null)
      .order("created_at", { ascending: false })
      .limit(50);

    setStages(stagesData || []);
    setLeads(leadsData || []);
    setArchitects(architectsData || []);
    setSources(sourcesData || []);
    setOwners(ownersData || []);
    setProjects(projectsData || []);

    if (stagesData && stagesData.length > 0) {
      setFormData((prev) => ({ ...prev, stage_id: stagesData[0].id }));
    }
  };

  // Opções memoizadas para os comboboxes com busca
  const leadOptions: ComboboxOption[] = useMemo(() => 
    leads.map((lead) => ({
      value: lead.id,
      label: lead.client?.name || "Sem nome",
      sublabel: lead.client?.phone || undefined,
    })), [leads]);

  const architectOptions: ComboboxOption[] = useMemo(() => [
    { value: "sem-arquiteto", label: "Cliente sem profissional parceiro" },
    ...architects.map((arch) => ({
      value: arch.id,
      label: arch.name,
    }))
  ], [architects]);

  const projectOptions: ComboboxOption[] = useMemo(() => [
    { value: "sem-projeto", label: "Sem projeto vinculado" },
    ...projects.map((project) => ({
      value: project.id,
      label: project.name,
      sublabel: project.client?.name || undefined,
    }))
  ], [projects]);

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
      .maybeSingle();

    if (!error && leadData) {
      await fetchOptions();
      setFormData((prev) => ({ ...prev, lead_id: leadData.id }));
      toast({
        title: "Sucesso",
        description: "Cliente e lead criados!",
      });
    }
  };

  const handleArchitectCreated = async (architectId?: string) => {
    await fetchOptions();
    if (architectId) {
      setFormData((prev) => ({ ...prev, architect_id: architectId }));
    }
    toast({
      title: "Sucesso",
      description: "Profissional Parceiro criado e selecionado!",
    });
  };

  const handleProjectCreated = async () => {
    await fetchOptions();
    // Buscar o último projeto criado sem deal_id vinculado
    const { data } = await supabase
      .from("projects")
      .select("id")
      .is("deal_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setFormData((prev) => ({ ...prev, project_id: data.id }));
    }
    
    toast({
      title: "Sucesso",
      description: "Projeto criado e vinculado!",
    });
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

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setPendingAudios(prev => [...prev, audioBlob]);
        stream.getTracks().forEach((track) => track.stop());
        toast({
          title: "Áudio gravado",
          description: "O áudio será salvo quando você criar o negócio.",
        });
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files).filter(file => {
      // Usar validação do utils (100MB)
      if (!validateFileSize(file.size)) {
        toast({
          title: "Arquivo muito grande",
          description: `${file.name} excede o limite de ${MAX_FILE_SIZE_MB}MB`,
          variant: "destructive",
        });
        return false;
      }
      
      // Validar tipo
      if (!validateFileType(file.name)) {
        toast({
          title: "Tipo de arquivo não permitido",
          description: `${file.name} não é um formato aceito`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });

    setPendingFiles(prev => [...prev, ...newFiles]);
    toast({
      title: "Arquivos adicionados",
      description: `${newFiles.length} arquivo(s) serão salvos quando você criar o negócio.`,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadPendingFiles = async (dealId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let successCount = 0;
    let totalFiles = pendingAudios.length + pendingFiles.length;

    // Upload audios com retry
    for (let i = 0; i < pendingAudios.length; i++) {
      const audioBlob = pendingAudios[i];
      const fileName = `audio_${Date.now()}_${i}.webm`;
      const filePath = `${dealId}/${fileName}`;

      // Retry até 3 vezes
      let uploaded = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { error: uploadError } = await supabase.storage
          .from("crm-files")
          .upload(filePath, audioBlob);

        if (!uploadError) {
          await supabase.from("crm_deal_files").insert({
            deal_id: dealId,
            file_name: fileName,
            file_path: filePath,
            file_type: "audio/webm",
            file_size: audioBlob.size,
            uploaded_by: user.id,
          });
          uploaded = true;
          successCount++;
          break;
        }
        
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    // Upload files com retry
    for (const file of pendingFiles) {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${dealId}/${fileName}`;

      // Retry até 3 vezes
      let uploaded = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { error: uploadError } = await supabase.storage
          .from("crm-files")
          .upload(filePath, file);

        if (!uploadError) {
          await supabase.from("crm_deal_files").insert({
            deal_id: dealId,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: user.id,
          });
          uploaded = true;
          successCount++;
          break;
        }
        
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    if (successCount < totalFiles) {
      toast({
        title: "Alguns arquivos falharam",
        description: `${successCount} de ${totalFiles} arquivo(s) enviado(s)`,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação com mensagens detalhadas
    const validationRules: ValidationRule[] = [
      { field: "stage_id", label: "Etapa", required: true },
      { field: "lead_id", label: "Cliente/Lead", required: true },
    ];

    // Validação adicional se etapa requer valor
    const selectedStage = stages.find(s => s.id === formData.stage_id);
    if (selectedStage) {
      const stageName = selectedStage.name.toLowerCase();
      if (stageName.includes("negociação") && (!formData.value || Number(formData.value) <= 0)) {
        sonnerToast.error("Valor obrigatório", {
          description: `Para a etapa "${selectedStage.name}", é obrigatório informar o valor (R$) do negócio.`,
        });
        return;
      }
    }

    if (!validateAndShowErrors(formData, validationRules)) {
      return;
    }

    setLoading(true);

    try {
      let dealStatus = "aberto";
      
      if (selectedStage) {
        const stageName = selectedStage.name.toLowerCase();
        if (stageName.includes("ganho") || stageName.includes("won") || stageName.startsWith("✅")) {
          dealStatus = "won";
        } else if (stageName.includes("perdido") || stageName.includes("lost") || stageName.startsWith("❌")) {
          dealStatus = "lost";
        }
      }

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

      // Gerar título automaticamente baseado em categorias e tipos de produto
      const categoriasTxt = formData.categorias.join(", ") || "Sem categoria";
      const produtosTxt = formData.tipos_produto.join(", ") || "Sem produto";
      const autoTitle = `${categoriasTxt} - ${produtosTxt}`;

      // Insert deal - owner_id é automaticamente o usuário logado
      const { data: dealData, error } = await supabase.from("crm_deals").insert({
        pipeline_id: pipelineId,
        title: autoTitle,
        stage_id: formData.stage_id,
        lead_id: formData.lead_id || null,
        architect_id: formData.architect_id && formData.architect_id !== "sem-arquiteto" ? formData.architect_id : null,
        owner_id: user?.id || null,
        value: formData.value ? Number(formData.value) : null,
        note: `${formData.observations ? formData.observations + '\n\n' : ''}${formData.note || ''}`.trim() || null,
        categoria: formData.categorias.join(", ") || null,
        centro_custo: formData.centros_custo.join(", ") || null,
        tipo_produto: formData.tipos_produto.join(", ") || null,
        conversation_history: formData.conversation_history || null,
        status: dealStatus,
      }).select().maybeSingle();

      if (error) {
        setLoading(false);
        const errorMsg = formatDatabaseError(error);
        sonnerToast.error("Erro ao criar negócio", {
          description: errorMsg,
        });
        return;
      }

      // Se um projeto foi selecionado, vincular ao deal
      if (formData.project_id && dealData) {
        await supabase
          .from("projects")
          .update({ deal_id: dealData.id })
          .eq("id", formData.project_id);
      }

      // Criar tarefas vinculadas ao deal
      if (tasks.length > 0 && dealData) {
        const tasksToInsert = tasks.map(task => ({
          deal_id: dealData.id,
          title: task.title,
          due_at: task.due_at,
          note: task.note || null,
          status: "open",
          created_by: user?.id || null,
        }));

        await supabase.from("crm_tasks").insert(tasksToInsert);
      }

      // Upload arquivos e áudios pendentes
      if ((pendingFiles.length > 0 || pendingAudios.length > 0) && dealData) {
        await uploadPendingFiles(dealData.id);
      }

      // SYNC: Se houver observações, salvar também na crm_timeline
      if (dealData && (formData.observations?.trim() || formData.note?.trim())) {
        const fullNote = `${formData.observations ? formData.observations + '\n\n' : ''}${formData.note || ''}`.trim();
        if (fullNote) {
          await supabase.from("crm_timeline").insert({
            deal_id: dealData.id,
            message: fullNote,
            update_type: "Observação",
            author_id: user?.id,
          });
        }
      }

      // Salvar indicações pendentes
      if (pendingIndications.length > 0 && dealData) {
        const indicationsToInsert = pendingIndications.map(ind => ({
          deal_id: dealData.id,
          architect_id: ind.architect_id,
          product_type: ind.product_type,
          value: ind.value ? Number(ind.value) : null,
          notes: ind.notes || null,
          created_by: user?.id || null,
        }));

        const { error: indError } = await supabase
          .from("architect_indications")
          .insert(indicationsToInsert);

        if (indError) {
          console.error("Erro ao salvar indicações:", indError);
        }
      }

      setLoading(false);

      toast({
        title: "Sucesso",
        description: "Negócio criado com sucesso!",
      });

      clearPersistedData();
      setFormData({
        stage_id: "",
        lead_id: "",
        architect_id: "",
        project_id: "",
        value: "",
        note: "",
        temperature: "frio",
        categorias: [],
        centros_custo: [],
        tipos_produto: [],
        observations: "",
        conversation_history: "",
        owner_id: "",
        source_id: "",
      });
      setTasks([]);
      setNewTask({ title: "", due_at: "", note: "" });
      setIsAddingTask(false);
      setPendingFiles([]);
      setPendingAudios([]);
      setPendingIndications([]);
      setNewIndication({ architect_id: "", product_type: "", value: "", notes: "" });
      setShowIndicationForm(false);
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

        <FormSaveIndicator hasRestoredData={hasRestoredData} className="mb-4" />

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seção: Lead e Profissional Parceiro */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Lead e Profissional Parceiro</h3>
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
                <SearchableCombobox
                  options={leadOptions}
                  value={formData.lead_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, lead_id: value })
                  }
                  placeholder="Selecione o lead"
                  searchPlaceholder="Buscar por nome ou telefone..."
                  emptyMessage="Nenhum lead encontrado."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperature">Temperatura do Lead</Label>
                <Select
                  value={formData.temperature}
                  onValueChange={(value) =>
                    setFormData({ ...formData, temperature: value })
                  }
                  required
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="source">Origem do Lead *</Label>
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
                  <Label htmlFor="architect">Profissional Parceiro *</Label>
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
                <SearchableCombobox
                  options={architectOptions}
                  value={formData.architect_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, architect_id: value })
                  }
                  placeholder="Selecione o profissional parceiro"
                  searchPlaceholder="Buscar profissional parceiro..."
                  emptyMessage="Nenhum profissional parceiro encontrado."
                />
              </div>
            </div>
          </div>

          {/* Seção: Projeto */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Projeto (Opcional)</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="project">Projeto Existente</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsProjectDialogOpen(true)}
                  className="h-7 text-xs"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Criar Projeto
                </Button>
              </div>
              <SearchableCombobox
                options={projectOptions}
                value={formData.project_id || "sem-projeto"}
                onValueChange={(value) =>
                  setFormData({ ...formData, project_id: value === "sem-projeto" ? "" : value })
                }
                placeholder="Selecione um projeto"
                searchPlaceholder="Buscar projeto..."
                emptyMessage="Nenhum projeto encontrado."
              />
            </div>
          </div>

          {/* Seção: Indicação de Profissional Parceiro */}
          <div className="space-y-4 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 uppercase">
                  Indicação de Arquiteto
                </h3>
                {pendingIndications.length > 0 && (
                  <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {pendingIndications.length}
                  </span>
                )}
              </div>
              {!showIndicationForm && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowIndicationForm(true)}
                  className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Adicionar Indicação
                </Button>
              )}
            </div>

            {/* Lista de indicações pendentes */}
            {pendingIndications.length > 0 && (
              <div className="space-y-2">
                {pendingIndications.map((ind, index) => (
                  <div key={index} className="flex items-center justify-between bg-white dark:bg-background p-2 rounded border">
                    <div className="text-sm">
                      <span className="font-medium">{ind.architect_name}</span>
                      <span className="text-muted-foreground"> - {ind.product_type}</span>
                      {ind.value && <span className="text-muted-foreground"> (R$ {ind.value})</span>}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingIndications(prev => prev.filter((_, i) => i !== index))}
                      className="h-6 w-6 p-0 text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Formulário de nova indicação */}
            {showIndicationForm && (
              <div className="space-y-3 p-3 bg-white dark:bg-background rounded border">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Profissional Parceiro *</Label>
                    <Select
                      value={newIndication.architect_id}
                      onValueChange={(value) => setNewIndication(prev => ({ ...prev, architect_id: value }))}
                    >
                      <SelectTrigger className="h-8 text-sm">
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
                    <Label className="text-xs">Tipo de Produto *</Label>
                    <Select
                      value={newIndication.product_type}
                      onValueChange={(value) => setNewIndication(prev => ({ ...prev, product_type: value }))}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Sofá", "Poltrona", "Mesa", "Cadeira", "Aparador", "Banqueta", "Rack", "Cristaleira", "Estante", "Vaso", "Quadro", "Chaise", "Personalizado"].map((tp) => (
                          <SelectItem key={tp} value={tp}>{tp}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Valor Estimado (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newIndication.value}
                      onChange={(e) => setNewIndication(prev => ({ ...prev, value: e.target.value }))}
                      placeholder="0.00"
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Observações</Label>
                    <Input
                      value={newIndication.notes}
                      onChange={(e) => setNewIndication(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Observações"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowIndicationForm(false);
                      setNewIndication({ architect_id: "", product_type: "", value: "", notes: "" });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600"
                    onClick={() => {
                      if (!newIndication.architect_id || !newIndication.product_type) {
                        toast({
                          title: "Campos obrigatórios",
                          description: "Selecione o profissional parceiro e o tipo de produto.",
                          variant: "destructive",
                        });
                        return;
                      }
                      const arch = architects.find(a => a.id === newIndication.architect_id);
                      setPendingIndications(prev => [...prev, {
                        ...newIndication,
                        architect_name: arch?.name || "Profissional Parceiro"
                      }]);
                      setNewIndication({ architect_id: "", product_type: "", value: "", notes: "" });
                      setShowIndicationForm(false);
                    }}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Seção: Detalhes do Negócio */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Detalhes do Negócio</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <div className="space-y-2 border rounded-md p-3">
                  {["Planejados", "Móveis Soltos"].map((cat) => (
                    <div key={cat} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cat-${cat}`}
                        checked={formData.categorias.includes(cat)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, categorias: [...formData.categorias, cat] });
                          } else {
                            setFormData({ ...formData, categorias: formData.categorias.filter(c => c !== cat) });
                          }
                        }}
                      />
                      <label htmlFor={`cat-${cat}`} className="text-sm cursor-pointer">{cat}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Centro de Custo *</Label>
                <div className="space-y-2 border rounded-md p-3 max-h-40 overflow-y-auto">
                  {CENTROS_CUSTO.map((cc) => (
                    <div key={cc.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cc-${cc.value}`}
                        checked={formData.centros_custo.includes(cc.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, centros_custo: [...formData.centros_custo, cc.value] });
                          } else {
                            setFormData({ ...formData, centros_custo: formData.centros_custo.filter(c => c !== cc.value) });
                          }
                        }}
                      />
                      <label htmlFor={`cc-${cc.value}`} className="text-sm cursor-pointer">{cc.label}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Tipo de Produto *</Label>
                <div className="grid grid-cols-3 gap-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                  {["Sofá", "Poltrona", "Mesa", "Cadeira", "Aparador", "Banqueta", "Rack", "Cristaleira", "Estante", "Vaso", "Quadro", "Chaise", "Personalizado"].map((tp) => (
                    <div key={tp} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tp-${tp}`}
                        checked={formData.tipos_produto.includes(tp)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, tipos_produto: [...formData.tipos_produto, tp] });
                          } else {
                            setFormData({ ...formData, tipos_produto: formData.tipos_produto.filter(t => t !== tp) });
                          }
                        }}
                      />
                      <label htmlFor={`tp-${tp}`} className="text-sm cursor-pointer">{tp}</label>
                    </div>
                  ))}
                </div>
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

              <div className="space-y-2">
                <Label htmlFor="stage">Etapa *</Label>
                <Select
                  value={formData.stage_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, stage_id: value })
                  }
                  required
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
            </div>
          </div>


          {/* Seção: Observações */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Observações</h3>
            <div className="space-y-2">
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
                  <Paperclip className="h-4 w-4 mr-2" />
                  Anexar Arquivo
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  onChange={handleFileSelect}
                  accept={ALLOWED_FILE_TYPES_ACCEPT}
                />
              </div>

              {(pendingAudios.length > 0 || pendingFiles.length > 0) && (
                <div className="text-sm text-muted-foreground bg-secondary p-3 rounded-md">
                  {pendingAudios.length > 0 && (
                    <div>🎤 {pendingAudios.length} áudio(s) gravado(s)</div>
                  )}
                  {pendingFiles.length > 0 && (
                    <div>📎 {pendingFiles.length} arquivo(s) anexado(s)</div>
                  )}
                  <div className="text-xs mt-1">Serão salvos quando criar o negócio</div>
                </div>
              )}
              
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) =>
                  setFormData({ ...formData, observations: e.target.value })
                }
                placeholder="Adicione observações sobre este negócio..."
                rows={3}
              />
            </div>
          </div>

          {/* Seção: Comunicação */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Comunicação (Opcional)</h3>
            <div className="space-y-4">
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
            </div>
          </div>

          {/* Seção: Tarefas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                <span className="text-xl">✅</span>
                Tarefas ({tasks.length})
              </h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsAddingTask(!isAddingTask)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Nova Tarefa
              </Button>
            </div>

            {/* Formulário de nova tarefa */}
            {isAddingTask && (
              <div className="p-4 border rounded-md bg-muted/30 space-y-3">
                <div>
                  <Label htmlFor="task-title">Título da Tarefa *</Label>
                  <Input
                    id="task-title"
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({ ...newTask, title: e.target.value })
                    }
                    placeholder="Ex: Enviar proposta por email"
                  />
                </div>

                <div>
                  <Label htmlFor="task-due">Data e Hora *</Label>
                  <Input
                    id="task-due"
                    type="datetime-local"
                    value={newTask.due_at}
                    onChange={(e) =>
                      setNewTask({ ...newTask, due_at: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="task-note">Observações</Label>
                  <Textarea
                    id="task-note"
                    value={newTask.note}
                    onChange={(e) =>
                      setNewTask({ ...newTask, note: e.target.value })
                    }
                    placeholder="Detalhes adicionais sobre a tarefa..."
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="button"
                    onClick={() => {
                      if (!newTask.title || !newTask.due_at) {
                        toast({
                          title: "Campos obrigatórios",
                          description: "Preencha o título e a data/hora da tarefa.",
                          variant: "destructive",
                        });
                        return;
                      }
                      setTasks([...tasks, newTask]);
                      setNewTask({ title: "", due_at: "", note: "" });
                      setIsAddingTask(false);
                      toast({
                        title: "Tarefa adicionada",
                        description: "A tarefa será criada junto com o negócio.",
                      });
                    }} 
                    size="sm"
                  >
                    Salvar Tarefa
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setIsAddingTask(false)}
                    size="sm"
                    variant="ghost"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Lista de tarefas */}
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-md">
                <p className="text-sm">Nenhuma tarefa cadastrada.</p>
                <p className="text-xs mt-2">
                  Crie tarefas para organizar follow-ups e ações
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 border rounded-md bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{task.title}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        📅 {formatBrasil(task.due_at)}
                      </div>
                      {task.note && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.note}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setTasks(tasks.filter((_, i) => i !== index));
                        toast({
                          title: "Tarefa removida",
                          description: "A tarefa foi removida da lista.",
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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

      <CreateArchitectDialog
        open={isArchitectDialogOpen}
        onOpenChange={setIsArchitectDialogOpen}
        onSuccess={handleArchitectCreated}
      />

      <CreateProjectDialog
        open={isProjectDialogOpen}
        onOpenChange={setIsProjectDialogOpen}
        onSuccess={() => {
          setIsProjectDialogOpen(false);
          handleProjectCreated();
        }}
      />
    </Dialog>
  );
}
