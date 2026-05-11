import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { Plus, Send, Save, Trash2, Image, FileAudio, MessageSquare, Loader2, CheckCircle, XCircle, Upload, Mic, X, BookOpen, Eye, AlertTriangle, ShieldAlert, Calendar, Clock } from "lucide-react";
import { ScheduleSelector, ScheduleConfig, defaultScheduleConfig } from "./ScheduleSelector";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AudioRecorder } from "./AudioRecorder";
import { CampanhaRelatorio } from "./CampanhaRelatorio";
import { CampaignProgressMonitor } from "./CampaignProgressMonitor";

interface Campanha {
  id: string;
  nome: string;
  tipo_envio: 'texto' | 'imagem' | 'audio' | null;
  conteudo_texto: string | null;
  conteudo_imagem_url: string | null;
  conteudo_audio_url: string | null;
  arquitetos_selecionados: string[] | null;
  status: string;
  webhook_n8n: string | null;
  whatsapp_connection_id: string | null;
  created_at: string;
  // Campos de agendamento
  agendar_automatico: boolean | null;
  tipo_agendamento: string | null;
  data_hora_unica: string | null;
  dias_semana: number[] | null;
  data_inicio: string | null;
  data_fim: string | null;
  horario_inicio: string | null;
  horario_fim: string | null;
}

interface WhatsAppConnection {
  id: string;
  instance_name: string;
  status: string;
  phone_number: string | null;
}

interface Arquiteto {
  id: string;
  name: string;
  phone: string | null;
  tier: string | null;
  tag_prospeccao: string | null;
}

interface DispatchStatus {
  architect_id: string;
  architect_name: string;
  status: 'pendente' | 'enviando' | 'sucesso' | 'erro';
  mensagem_erro?: string;
}

interface ArquitetoSemTarefa {
  id: string;
  name: string;
  status: string;
  company: string | null;
}

interface KanbanStage {
  id: string;
  nome: string;
  slug: string;
}

export function CampanhasManager() {
  const { toast } = useToast();
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [arquitetosDisponiveis, setArquitetosDisponiveis] = useState<Arquiteto[]>([]);
  const [whatsappConnections, setWhatsappConnections] = useState<WhatsAppConnection[]>([]);
  const [kanbanStages, setKanbanStages] = useState<KanbanStage[]>([]);
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchProgress, setDispatchProgress] = useState(0);
  const [dispatchStatuses, setDispatchStatuses] = useState<DispatchStatus[]>([]);
  const [isWaiting, setIsWaiting] = useState(false);
  const [waitingSeconds, setWaitingSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  
  // Estado para trava de disparo
  const [canDispatch, setCanDispatch] = useState(true);
  const [arquitetosSemTarefa, setArquitetosSemTarefa] = useState<ArquitetoSemTarefa[]>([]);
  const [checkingDispatchStatus, setCheckingDispatchStatus] = useState(false);
  const [showBlockingDialog, setShowBlockingDialog] = useState(false);
  
  // Filtro de etapa do kanban
  const [filtroEtapa, setFiltroEtapa] = useState<string>("novo_arquiteto");
  
  // Form state - NOT persisted, stays static when switching tabs
  const [formData, setFormData] = useState({
    nome: "",
    tipoEnvio: 'texto' as 'texto' | 'imagem' | 'audio',
    conteudoTexto: "",
    conteudoImagemUrl: "",
    conteudoAudioUrl: "",
    arquitetosSelecionados: [] as string[],
    webhookN8n: "",
    whatsappConnectionId: "",
  });
  
  // Estado de agendamento
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>(defaultScheduleConfig);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const [editingCampanha, setEditingCampanha] = useState<Campanha | null>(null);
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [viewingCampanha, setViewingCampanha] = useState<Campanha | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // ✅ Webhook N8N padrão (pode ser sobrescrito)
  const DEFAULT_N8N_WEBHOOK = "https://n8n.tendenci.com.br/webhook/whatsapp-campaign";

  // Verificar se disparo é permitido
  const checkDispatchAllowed = async () => {
    setCheckingDispatchStatus(true);
    try {
      const { data, error } = await supabase.rpc('check_campaign_dispatch_allowed');
      if (!error && data) {
        // RPC retorna jsonb diretamente, não array
        const result = data as unknown as { can_dispatch: boolean; total_sem_tarefa: number; arquitetos_sem_tarefa: ArquitetoSemTarefa[] };
        setCanDispatch(result.can_dispatch);
        setArquitetosSemTarefa(result.arquitetos_sem_tarefa || []);
        
        // Abrir popup automaticamente se bloqueado
        if (!result.can_dispatch && result.arquitetos_sem_tarefa?.length > 0) {
          setShowBlockingDialog(true);
        }
      }
    } catch (err) {
      console.error('Erro ao verificar permissão de disparo:', err);
    } finally {
      setCheckingDispatchStatus(false);
    }
  };

  const fetchKanbanStages = async () => {
    const { data, error } = await supabase
      .from('tendenci_prospec_arq_stages')
      .select('id, nome, slug')
      .eq('ativa', true)
      .order('position');

    if (!error && data) {
      setKanbanStages(data);
    }
  };

  useEffect(() => {
    fetchCampanhas();
    fetchArquitetosDisponiveis(undefined, filtroEtapa);
    fetchWhatsAppConnections();
    fetchKanbanStages();
    checkDispatchAllowed();
  }, []);
  
  // Recarregar profissionais parceiros quando etapa mudar
  useEffect(() => {
    if (isDialogOpen) {
      fetchArquitetosDisponiveis(editingCampanha?.id, filtroEtapa);
      // Limpar seleção quando mudar etapa
      setFormData(prev => ({ ...prev, arquitetosSelecionados: [] }));
    }
  }, [filtroEtapa]);

  const fetchCampanhas = async () => {
    const { data, error } = await supabase
      .from('tendenci_prospec_arq_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCampanhas(data as Campanha[]);
    }
  };

  const fetchWhatsAppConnections = async () => {
    const { data, error } = await supabase
      .from('tendenci_whatsapp_connections')
      .select('*')
      .eq('status', 'connected')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setWhatsappConnections(data as WhatsAppConnection[]);
    }
  };

  const [arquitetosEmOutrasCampanhas, setArquitetosEmOutrasCampanhas] = useState(0);
  const [arquitetosComErroTelefone, setArquitetosComErroTelefone] = useState(0);

  const fetchArquitetosDisponiveis = async (editingCampaignId?: string, statusFunil?: string) => {
    // 1. Buscar TODOS os IDs de profissionais parceiros que estão RESERVADOS ou JÁ ENVIADOS (pendente, enviando, enviado)
    // Isso impede que um profissional parceiro seja selecionado para múltiplas campanhas
    const { data: jaEmCampanhas } = await supabase
      .from('tendenci_prospec_arq_campaign_architects')
      .select('architect_id, status')
      .in('status', ['pendente', 'enviando', 'enviado']); // ✅ CRÍTICO: Incluir 'pendente' e 'enviando'

    // 2. Se estiver editando, não excluir profissionais parceiros da PRÓPRIA campanha
    let idsJaEmCampanhas = [...new Set(jaEmCampanhas?.map(d => d.architect_id) || [])];
    
    if (editingCampaignId) {
      // Buscar profissionais parceiros da campanha sendo editada para NÃO excluí-los
      const { data: arquitetosDaCampanha } = await supabase
        .from('tendenci_prospec_arq_campaign_architects')
        .select('architect_id')
        .eq('campanha_id', editingCampaignId);
      
      const idsDaCampanhaEditando = arquitetosDaCampanha?.map(d => d.architect_id) || [];
      idsJaEmCampanhas = idsJaEmCampanhas.filter(id => !idsDaCampanhaEditando.includes(id));
    }

    // 3. Buscar IDs de profissionais parceiros com ERROS de telefone
    const { data: arquitetosComErros } = await supabase
      .from('tendenci_prospec_arq_logs')
      .select('architect_id')
      .in('tipo', ['numero_inexistente', 'erro_formatacao', 'erro_envio'])
      .not('architect_id', 'is', null);

    const idsComErroTelefone = [...new Set(arquitetosComErros?.map(d => d.architect_id).filter(Boolean) || [])];
    setArquitetosComErroTelefone(idsComErroTelefone.length);

    // 4. Combinar listas de exclusão
    const todosIdsParaExcluir = [...new Set([...idsJaEmCampanhas, ...idsComErroTelefone])];

    console.log(`🚫 Profissionais Parceiros reservados/enviados em campanhas: ${idsJaEmCampanhas.length}`);
    console.log(`📵 Profissionais Parceiros com erro de telefone: ${idsComErroTelefone.length}`);
    setArquitetosEmOutrasCampanhas(idsJaEmCampanhas.length);

    // 5. Buscar profissionais parceiros filtrados pela etapa do kanban selecionada
    const etapaFiltro = statusFunil || filtroEtapa || 'novo_arquiteto';
    
    let query = supabase
      .from('architects')
      .select('id, name, phone, tier, tag_prospeccao')
      .eq('status_funil', etapaFiltro)
      .eq('active', true);

    if (todosIdsParaExcluir.length > 0) {
      query = query.not('id', 'in', `(${todosIdsParaExcluir.join(',')})`);
    }

    const { data, error } = await query.order('name');

    if (!error && data) {
      console.log(`✅ Profissionais Parceiros disponíveis para campanha (etapa: ${etapaFiltro}): ${data.length}`);
      setArquitetosDisponiveis(data);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      tipoEnvio: 'texto',
      conteudoTexto: "",
      conteudoImagemUrl: "",
      conteudoAudioUrl: "",
      arquitetosSelecionados: [],
      webhookN8n: DEFAULT_N8N_WEBHOOK,
      whatsappConnectionId: "",
    });
    setScheduleConfig(defaultScheduleConfig);
    setImagemFile(null);
    setAudioFile(null);
    setEditingCampanha(null);
  };

  const handleOpenDialog = (campanha?: Campanha) => {
    if (campanha) {
      setEditingCampanha(campanha);
      setFormData({
        nome: campanha.nome,
        tipoEnvio: campanha.tipo_envio || 'texto',
        conteudoTexto: campanha.conteudo_texto || "",
        conteudoImagemUrl: campanha.conteudo_imagem_url || "",
        conteudoAudioUrl: campanha.conteudo_audio_url || "",
        arquitetosSelecionados: campanha.arquitetos_selecionados || [],
        webhookN8n: campanha.webhook_n8n || "",
        whatsappConnectionId: campanha.whatsapp_connection_id || "",
      });
      // Restaurar configuração de agendamento
      setScheduleConfig({
        enabled: campanha.agendar_automatico || false,
        type: (campanha.tipo_agendamento as 'unico' | 'recorrente') || 'unico',
        dataHoraUnica: campanha.data_hora_unica ? new Date(campanha.data_hora_unica) : null,
        diasSemana: campanha.dias_semana || [1, 2, 3, 4, 5],
        horarioInicio: campanha.horario_inicio || '09:00',
        horarioFim: campanha.horario_fim || '18:00',
        dataInicio: campanha.data_inicio ? new Date(campanha.data_inicio) : null,
        dataFim: campanha.data_fim ? new Date(campanha.data_fim) : null,
      });
      // Recarregar profissionais parceiros disponíveis considerando esta campanha em edição
      fetchArquitetosDisponiveis(campanha.id, filtroEtapa);
    } else {
      resetForm();
      setFiltroEtapa("novo_arquiteto"); // Reset para etapa padrão
      fetchArquitetosDisponiveis(undefined, "novo_arquiteto");
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const uploadImageToStorage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `campanhas/imagens/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('campaign_media')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('campaign_media')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const uploadAudioToStorage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop() || 'webm';
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `campanhas/audios/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('campaign_media')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('campaign_media')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Apenas JPG, JPEG e PNG são aceitos",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);
    try {
      const url = await uploadImageToStorage(file);
      setFormData({ ...formData, conteudoImagemUrl: url });
      setImagemFile(file);
      toast({
        title: "Imagem enviada com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro ao enviar imagem",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Apenas MP3 e WAV são aceitos",
        variant: "destructive",
      });
      return;
    }

    setUploadingAudio(true);
    try {
      const url = await uploadAudioToStorage(file);
      setFormData({ ...formData, conteudoAudioUrl: url });
      setAudioFile(file);
      toast({
        title: "Áudio enviado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro ao enviar áudio",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleSaveRecording = async (audioBlob: Blob) => {
    setUploadingAudio(true);
    try {
      const file = new File([audioBlob], `gravacao_${Date.now()}.webm`, { type: 'audio/webm' });
      const url = await uploadAudioToStorage(file);
      setFormData({ ...formData, conteudoAudioUrl: url });
      setAudioFile(file);
      toast({
        title: "Gravação salva com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar gravação",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      throw error;
    } finally {
      setUploadingAudio(false);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, conteudoImagemUrl: "" });
    setImagemFile(null);
  };

  const removeAudio = () => {
    setFormData({ ...formData, conteudoAudioUrl: "" });
    setAudioFile(null);
  };

  const handleSaveCampanha = async () => {
    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "Nome da campanha é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!formData.whatsappConnectionId) {
      toast({
        title: "Erro",
        description: "Selecione uma instância WhatsApp conectada",
        variant: "destructive",
      });
      return;
    }

    if (formData.arquitetosSelecionados.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um profissional parceiro",
        variant: "destructive",
      });
      return;
    }

    if (formData.tipoEnvio === 'texto' && !formData.conteudoTexto.trim()) {
      toast({
        title: "Erro",
        description: "Conteúdo de texto é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (formData.tipoEnvio === 'imagem' && !formData.conteudoImagemUrl.trim()) {
      toast({
        title: "Erro",
        description: "Imagem é obrigatória",
        variant: "destructive",
      });
      return;
    }

    if (formData.tipoEnvio === 'audio' && !formData.conteudoAudioUrl.trim()) {
      toast({
        title: "Erro",
        description: "Áudio é obrigatório",
        variant: "destructive",
      });
      return;
    }

    // Validação de agendamento
    if (scheduleConfig.enabled) {
      if (scheduleConfig.type === 'unico' && !scheduleConfig.dataHoraUnica) {
        toast({
          title: "Erro",
          description: "Selecione a data e hora do disparo agendado",
          variant: "destructive",
        });
        return;
      }
      if (scheduleConfig.type === 'recorrente') {
        if (scheduleConfig.diasSemana.length === 0) {
          toast({
            title: "Erro",
            description: "Selecione pelo menos um dia da semana",
            variant: "destructive",
          });
          return;
        }
        if (!scheduleConfig.dataInicio) {
          toast({
            title: "Erro",
            description: "Selecione a data de início do período",
            variant: "destructive",
          });
          return;
        }
      }
    }

    setLoading(true);

    // Determinar status com base no agendamento
    const status = scheduleConfig.enabled ? 'agendado' : 'rascunho';

    const campanhaData = {
      nome: formData.nome,
      tipo_envio: formData.tipoEnvio,
      conteudo_texto: formData.tipoEnvio === 'texto' ? formData.conteudoTexto : null,
      conteudo_imagem_url: formData.tipoEnvio === 'imagem' ? formData.conteudoImagemUrl : null,
      conteudo_audio_url: formData.tipoEnvio === 'audio' ? formData.conteudoAudioUrl : null,
      arquitetos_selecionados: formData.arquitetosSelecionados,
      webhook_n8n: formData.webhookN8n.trim() || DEFAULT_N8N_WEBHOOK,
      whatsapp_connection_id: formData.whatsappConnectionId,
      status,
      updated_at: new Date().toISOString(),
      // Campos de agendamento
      agendar_automatico: scheduleConfig.enabled,
      tipo_agendamento: scheduleConfig.type,
      data_hora_unica: scheduleConfig.type === 'unico' && scheduleConfig.dataHoraUnica 
        ? scheduleConfig.dataHoraUnica.toISOString() 
        : null,
      dias_semana: scheduleConfig.type === 'recorrente' ? scheduleConfig.diasSemana : null,
      data_inicio: scheduleConfig.dataInicio?.toISOString() || null,
      data_fim: scheduleConfig.dataFim?.toISOString() || null,
      horario_inicio: scheduleConfig.horarioInicio,
      horario_fim: scheduleConfig.horarioFim,
    };

    if (editingCampanha) {
      const { error } = await supabase
        .from('tendenci_prospec_arq_campaigns')
        .update(campanhaData)
        .eq('id', editingCampanha.id);

      if (error) {
        toast({
          title: "Erro ao atualizar campanha",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // ✅ NOVO: Atualizar profissionais parceiros reservados (remover os que foram desmarcados, adicionar novos)
      // Primeiro, buscar profissionais parceiros já existentes na campanha
      const { data: arquitetosExistentes } = await supabase
        .from('tendenci_prospec_arq_campaign_architects')
        .select('architect_id')
        .eq('campanha_id', editingCampanha.id);

      const idsExistentes = arquitetosExistentes?.map(a => a.architect_id) || [];
      const idsNovos = formData.arquitetosSelecionados;

      // Profissionais Parceiros a remover (estavam na campanha mas foram desmarcados)
      const idsParaRemover = idsExistentes.filter(id => !idsNovos.includes(id));
      
      // Profissionais Parceiros a adicionar (novos selecionados que não estavam na campanha)
      const idsParaAdicionar = idsNovos.filter(id => !idsExistentes.includes(id));

      if (idsParaRemover.length > 0) {
        await supabase
          .from('tendenci_prospec_arq_campaign_architects')
          .delete()
          .eq('campanha_id', editingCampanha.id)
          .in('architect_id', idsParaRemover)
          .neq('status', 'enviado'); // Não remover quem já foi enviado
      }

      if (idsParaAdicionar.length > 0) {
        const registros = idsParaAdicionar.map(archId => ({
          campanha_id: editingCampanha.id,
          architect_id: archId,
          status: 'pendente',
          created_at: new Date().toISOString()
        }));
        
        await supabase
          .from('tendenci_prospec_arq_campaign_architects')
          .upsert(registros, { onConflict: 'campanha_id,architect_id', ignoreDuplicates: true });
      }

      toast({
        title: scheduleConfig.enabled ? "Campanha agendada!" : "Campanha atualizada!",
        description: scheduleConfig.enabled 
          ? `Disparo programado para ${scheduleConfig.type === 'unico' && scheduleConfig.dataHoraUnica 
              ? format(scheduleConfig.dataHoraUnica, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) 
              : 'período configurado'}`
          : undefined,
      });
    } else {
      // Criar nova campanha
      const { data: novaCampanha, error } = await supabase
        .from('tendenci_prospec_arq_campaigns')
        .insert({ ...campanhaData, created_at: new Date().toISOString() })
        .select('id')
        .single();

      if (error || !novaCampanha) {
        toast({
          title: "Erro ao criar campanha",
          description: error?.message || 'Erro desconhecido',
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // ✅ NOVO: Registrar TODOS os profissionais parceiros como "pendente" IMEDIATAMENTE
      // Isso "reserva" os profissionais parceiros e impede que outra campanha os selecione
      if (formData.arquitetosSelecionados.length > 0) {
        const registros = formData.arquitetosSelecionados.map(archId => ({
          campanha_id: novaCampanha.id,
          architect_id: archId,
          status: 'pendente',
          created_at: new Date().toISOString()
        }));
        
        const { error: reserveError } = await supabase
          .from('tendenci_prospec_arq_campaign_architects')
          .insert(registros);

        if (reserveError) {
          console.error('Erro ao reservar profissionais parceiros:', reserveError);
          // Não bloquear por isso, mas logar o erro
          toast({
            title: "Aviso",
            description: "Campanha criada, mas alguns profissionais parceiros podem não ter sido reservados. Verifique antes de disparar.",
            variant: "destructive",
          });
        } else {
          console.log(`✅ ${registros.length} profissionais parceiros reservados para campanha ${novaCampanha.id}`);
        }
      }

      toast({
        title: scheduleConfig.enabled ? "Campanha agendada!" : "Campanha criada!",
        description: scheduleConfig.enabled 
          ? `Disparo programado para ${scheduleConfig.type === 'unico' && scheduleConfig.dataHoraUnica 
              ? format(scheduleConfig.dataHoraUnica, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) 
              : 'período configurado'}`
          : `${formData.arquitetosSelecionados.length} profissionais parceiros reservados`,
      });
    }

    await fetchCampanhas();
    await fetchArquitetosDisponiveis(undefined, filtroEtapa); // Recarregar lista de profissionais parceiros disponíveis
    handleCloseDialog();
    setLoading(false);
  };

  // ✅ Função sincronizada com backend (dispatch-campaign/index.ts)
  const formatBrazilianPhone = (phone: string | null): string | null => {
    if (!phone) return null;
    
    let cleaned = phone.replace(/\D/g, '');
    
    // Remove prefixo 55 duplicado do início
    while (cleaned.startsWith('55') && cleaned.length > 11) {
      cleaned = cleaned.substring(2);
    }
    
    // Número muito curto (falta DDD)
    if (cleaned.length < 10) {
      return null;
    }
    
    // Se tem 10 dígitos (DDD + 8 dígitos formato antigo), adiciona o 9
    if (cleaned.length === 10) {
      cleaned = cleaned.slice(0, 2) + '9' + cleaned.slice(2);
    }
    
    // Se tem 12 dígitos (55 + DDD + 8), adiciona o 9
    if (cleaned.length === 12 && cleaned.startsWith('55')) {
      cleaned = cleaned.slice(0, 4) + '9' + cleaned.slice(4);
    }
    
    // Garante que começa com 55
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }
    
    // Validação final: deve ter 13 dígitos (55 + DDD + 9 + 8)
    if (cleaned.length !== 13) {
      return null;
    }
    
    return cleaned;
  };

  const validateBrazilianPhone = (phone: string | null): { valid: boolean; formatted: string | null } => {
    const formatted = formatBrazilianPhone(phone);
    return {
      valid: formatted !== null,
      formatted,
    };
  };

  const handleDispatchCampanha = async (campanha: Campanha) => {
    // 🔌 VERIFICAR CONECTIVIDADE DA EVOLUTION API ANTES DE INICIAR
    toast({
      title: "Verificando servidor WhatsApp...",
      description: "Aguarde a verificação de conectividade",
    });

    try {
      const { data: healthCheck, error: healthError } = await supabase.functions.invoke('check-evolution-health');
      
      if (healthError || !healthCheck?.online) {
        toast({
          title: "❌ Servidor WhatsApp Offline",
          description: healthCheck?.error || "O servidor Evolution API está inacessível. Tente novamente mais tarde.",
          variant: "destructive",
        });
        return;
      }
    } catch (err) {
      toast({
        title: "❌ Erro ao verificar servidor",
        description: "Não foi possível verificar se o servidor WhatsApp está online. Tente novamente.",
        variant: "destructive",
      });
      return;
    }

    // 🚫 TRAVA: Verificar se há profissionais parceiros sem tarefas em "Contato Iniciado" ou "Ativado"
    await checkDispatchAllowed();
    
    const { data: dispatchCheck } = await supabase.rpc('check_campaign_dispatch_allowed');
    if (dispatchCheck) {
      const result = dispatchCheck as unknown as { can_dispatch: boolean; total_sem_tarefa: number; arquitetos_sem_tarefa: ArquitetoSemTarefa[] };
      if (!result.can_dispatch) {
        setShowBlockingDialog(true);
        toast({
          title: "🚫 Disparo Bloqueado",
          description: `Existem ${result.total_sem_tarefa} profissionais parceiros sem tarefas futuras. Veja o popup para detalhes.`,
          variant: "destructive",
        });
        return;
      }
    }

    // ✅ Validação OBRIGATÓRIA: Verificar se há instância WhatsApp configurada
    if (!campanha.whatsapp_connection_id) {
      toast({
        title: "❌ Erro: Instância WhatsApp Obrigatória",
        description: "Esta campanha não possui uma instância WhatsApp configurada. Edite a campanha e selecione uma instância conectada.",
        variant: "destructive",
      });
      return;
    }

    // Verificar se a instância está conectada
    const instanceConnected = whatsappConnections.find(
      conn => conn.id === campanha.whatsapp_connection_id && conn.status === 'connected'
    );

    if (!instanceConnected) {
      toast({
        title: "❌ Erro: Instância Desconectada",
        description: "A instância WhatsApp selecionada não está conectada. Conecte a instância ou selecione outra.",
        variant: "destructive",
      });
      return;
    }

    const arquitetosSelecionados = campanha.arquitetos_selecionados || [];
    
    // Buscar dados atualizados dos profissionais parceiros diretamente do banco
    const { data: arquitetosData, error: arquitetosError } = await supabase
      .from('architects')
      .select('id, name, phone')
      .in('id', arquitetosSelecionados);

    if (arquitetosError || !arquitetosData) {
      toast({
        title: "Erro",
        description: "Erro ao buscar dados dos profissionais parceiros",
        variant: "destructive",
      });
      return;
    }

    const arquitetosValidos = arquitetosData.filter(arq => 
      validateBrazilianPhone(arq.phone).valid
    );

    if (arquitetosValidos.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhum profissional parceiro com telefone válido selecionado",
        variant: "destructive",
      });
      return;
    }

    const tempoEstimado = Math.round((arquitetosValidos.length * 3) / 60);

    const confirmar = window.confirm(
      `⏱️ ATENÇÃO: Esta campanha levará aproximadamente ${tempoEstimado} horas para ser concluída.\n\n` +
      `📊 Total de mensagens: ${arquitetosValidos.length}\n` +
      `⏳ Intervalo entre mensagens: 3 minutos (obrigatório)\n\n` +
      `A campanha será executada em background no servidor. Você pode continuar trabalhando normalmente.\n\n` +
      `Deseja continuar?`
    );

    if (!confirmar) return;

    setDispatching(true);
    setDispatchProgress(0);
    setDispatchStatuses([]);

    try {
      const arquitetosValidosIds = arquitetosValidos.map(a => a.id);
      
      const { data, error } = await supabase.functions.invoke('execute-campaign-background', {
        body: {
          campanha_id: campanha.id,
          arquiteto_ids: arquitetosValidosIds,
        },
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao iniciar campanha');
      }

      const tempoHoras = Math.round((arquitetosValidosIds.length * 3) / 60);

      toast({
        title: "✅ Campanha Enfileirada!",
        description: `${arquitetosValidosIds.length} mensagens enfileiradas. Tempo estimado: ~${tempoHoras > 0 ? tempoHoras + ' horas' : arquitetosValidosIds.length * 3 + ' minutos'}. Processamento em background.`,
      });

      setDispatching(false);
      setDispatchProgress(0);
      setDispatchStatuses([]);
      
      await fetchCampanhas();
      
    } catch (error: any) {
      console.error('💥 Erro ao iniciar campanha:', error);
      toast({
        title: "Erro ao Disparar",
        description: error.message || "Erro desconhecido ao iniciar campanha",
        variant: "destructive",
      });
      setDispatching(false);
    }
  };

  const toggleArquiteto = (id: string) => {
    setFormData({
      ...formData,
      arquitetosSelecionados: formData.arquitetosSelecionados.includes(id)
        ? formData.arquitetosSelecionados.filter(a => a !== id)
        : [...formData.arquitetosSelecionados, id]
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'rascunho':
        return <Badge variant="outline">Rascunho</Badge>;
      case 'enviando':
        return <Badge className="bg-blue-500">Enviando...</Badge>;
      case 'enviado':
        return <Badge className="bg-green-500">Enviado</Badge>;
      case 'erro':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTipoIcon = (tipo: string | null) => {
    switch (tipo) {
      case 'texto':
        return <MessageSquare className="w-4 h-4" />;
      case 'imagem':
        return <Image className="w-4 h-4" />;
      case 'audio':
        return <FileAudio className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const campanhasRascunho = campanhas.filter(c => c.status === 'rascunho');
  const campanhasAgendadas = campanhas.filter(c => c.status === 'agendado');
  const campanhasEmAndamento = campanhas.filter(c => ['pendente', 'enviando'].includes(c.status));
  const campanhasEnviadas = campanhas.filter(c => c.status === 'enviado');
  const campanhasComErro = campanhas.filter(c => c.status === 'erro');

  return (
    <div className="space-y-6">
      {/* 🚫 Dialog/Popup de Trava de Disparo */}
      <Dialog open={showBlockingDialog} onOpenChange={setShowBlockingDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Disparo de Campanhas Bloqueado
            </DialogTitle>
          </DialogHeader>
          
          <Alert className="border-amber-500/50 bg-amber-500/10 mb-4">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-700 font-semibold">⚠️ Lembrete Importante</AlertTitle>
            <AlertDescription className="text-amber-600">
              Tarefas com data/hora <strong>vencida</strong> são consideradas como "realizadas". 
              Se a data da tarefa já passou, o profissional parceiro volta a ter status de 
              <strong> sem tarefa agendada</strong> e precisa de nova tarefa.
            </AlertDescription>
          </Alert>
          
          <p className="text-sm mb-4">
            Existem <strong className="text-destructive">{arquitetosSemTarefa.length}</strong> profissionais parceiros em 
            "Contato Iniciado" ou "Ativado" que precisam de tarefas futuras:
          </p>
          
          <ScrollArea className="h-[300px] border rounded-md p-3">
            {arquitetosSemTarefa.map(arq => (
              <div key={arq.id} className="flex items-center justify-between py-2 border-b last:border-b-0 gap-2">
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate">{arq.name}</span>
                  {arq.company && <span className="text-muted-foreground ml-2 text-sm">- {arq.company}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    {arq.status === 'contato_iniciado' ? 'Contato Iniciado' : 'Ativado'}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 gap-1 text-xs"
                    onClick={() => {
                      setShowBlockingDialog(false);
                      // Navegar para aba CRM e abrir sheet do profissional parceiro
                      window.dispatchEvent(new CustomEvent('open-architect-sheet', { detail: { architectId: arq.id } }));
                    }}
                  >
                    <Eye className="h-3 w-3" />
                    Abrir
                  </Button>
                </div>
              </div>
            ))}
          </ScrollArea>
          
          <p className="text-sm text-muted-foreground mt-2">
            📌 Clique em <strong>"Abrir"</strong> para acessar o card do profissional parceiro e agendar uma tarefa.
          </p>
          
          <DialogFooter>
            <Button onClick={() => setShowBlockingDialog(false)}>
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Botão para reabrir popup quando bloqueado */}
      {!canDispatch && !checkingDispatchStatus && (
        <Button 
          variant="destructive" 
          size="sm"
          onClick={() => setShowBlockingDialog(true)}
          className="gap-2"
        >
          <ShieldAlert className="h-4 w-4" />
          {arquitetosSemTarefa.length} Profissionais Parceiros Sem Tarefa
        </Button>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Campanhas Personalizáveis</h2>
          <p className="text-muted-foreground">
            Crie e gerencie campanhas de WhatsApp para profissionais parceiros
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href="/whatsapp-integration-docs" target="_blank" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Documentação
            </a>
          </Button>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Campanha
          </Button>
        </div>
      </div>

      {/* Dialog de Criação/Edição */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCampanha ? 'Editar Campanha' : 'Nova Campanha'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Campanha *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Campanha de Boas-vindas"
              />
            </div>

            <div className="space-y-2">
              <Label>Instância WhatsApp *</Label>
              <Select value={formData.whatsappConnectionId} onValueChange={(v) => setFormData({ ...formData, whatsappConnectionId: v })}>
                <SelectTrigger className={!formData.whatsappConnectionId ? "border-red-500" : ""}>
                  <SelectValue placeholder="⚠️ OBRIGATÓRIO: Selecione uma instância conectada" />
                </SelectTrigger>
                <SelectContent>
                  {whatsappConnections.length === 0 ? (
                    <div className="p-3 text-center space-y-2">
                      <p className="text-sm font-medium text-destructive">
                        ⚠️ Nenhuma instância conectada
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Conecte uma instância WhatsApp na aba "WhatsApp API" antes de criar campanhas.
                      </p>
                    </div>
                  ) : (
                    whatsappConnections.map((conn) => (
                      <SelectItem key={conn.id} value={conn.id}>
                        ✅ {conn.instance_name} {conn.phone_number && `(${conn.phone_number})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {!formData.whatsappConnectionId && (
                <p className="text-xs text-destructive font-medium">
                  ⚠️ Instância WhatsApp é obrigatória para disparar campanhas
                </p>
              )}
              {whatsappConnections.length === 0 && (
                <Card className="border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20">
                  <CardContent className="p-3">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      <strong>Atenção:</strong> Você precisa conectar uma instância WhatsApp antes de criar/disparar campanhas.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tipo de Conteúdo *</Label>
              <Select value={formData.tipoEnvio} onValueChange={(v: any) => setFormData({ ...formData, tipoEnvio: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="texto">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Texto
                    </div>
                  </SelectItem>
                  <SelectItem value="imagem">
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      Imagem
                    </div>
                  </SelectItem>
                  <SelectItem value="audio">
                    <div className="flex items-center gap-2">
                      <FileAudio className="w-4 h-4" />
                      Áudio
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.tipoEnvio === 'texto' && (
              <div className="space-y-2">
                <Label htmlFor="conteudo_texto">Mensagem de Texto *</Label>
                <Textarea
                  id="conteudo_texto"
                  value={formData.conteudoTexto}
                  onChange={(e) => setFormData({ ...formData, conteudoTexto: e.target.value })}
                  rows={5}
                  placeholder="Digite a mensagem que será enviada..."
                />
                <p className="text-xs text-muted-foreground">
                  {formData.conteudoTexto.length} caracteres
                </p>
              </div>
            )}

            {formData.tipoEnvio === 'imagem' && (
              <div className="space-y-2">
                <Label>Imagem *</Label>
                {!formData.conteudoImagemUrl ? (
                  <div className="space-y-2">
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center gap-2">
                        {uploadingImage ? (
                          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                        ) : (
                          <Upload className="w-8 h-8 text-muted-foreground" />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {uploadingImage ? "Enviando..." : "Clique para selecionar imagem"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          JPG, JPEG ou PNG
                        </span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative border rounded-lg overflow-hidden">
                      <img 
                        src={formData.conteudoImagemUrl} 
                        alt="Preview" 
                        className="w-full h-auto"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={removeImage}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      ✓ Imagem anexada
                    </p>
                  </div>
                )}
              </div>
            )}

            {formData.tipoEnvio === 'audio' && (
              <div className="space-y-2">
                <Label>Áudio *</Label>
                {!formData.conteudoAudioUrl ? (
                  <div className="space-y-2">
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                      <input
                        type="file"
                        accept="audio/mpeg,audio/mp3,audio/wav"
                        onChange={handleAudioUpload}
                        disabled={uploadingAudio}
                        className="hidden"
                        id="audio-upload"
                      />
                      <label htmlFor="audio-upload" className="cursor-pointer flex flex-col items-center gap-2">
                        {uploadingAudio ? (
                          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                        ) : (
                          <Upload className="w-8 h-8 text-muted-foreground" />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {uploadingAudio ? "Enviando..." : "Clique para selecionar áudio"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          MP3 ou WAV
                        </span>
                      </label>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setIsRecorderOpen(true)}
                      className="w-full gap-2"
                    >
                      <Mic className="w-4 h-4" />
                      Gravar Áudio
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="p-4 border rounded space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Áudio anexado</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={removeAudio}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <audio controls className="w-full">
                        <source src={formData.conteudoAudioUrl} />
                        Seu navegador não suporta o elemento de áudio.
                      </audio>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Filtrar por Etapa do Kanban</Label>
              <Select value={filtroEtapa} onValueChange={(v) => setFiltroEtapa(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a etapa" />
                </SelectTrigger>
                <SelectContent>
                  {kanbanStages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.slug}>
                      {stage.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Selecione a etapa do kanban para filtrar profissionais parceiros disponíveis
              </p>
            </div>

            <div className="space-y-2">
              <Label>Profissionais Parceiros da Etapa: "{kanbanStages.find(s => s.slug === filtroEtapa)?.nome || filtroEtapa}" *</Label>
              {(arquitetosEmOutrasCampanhas > 0 || arquitetosComErroTelefone > 0) && (
                <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
                  <CardContent className="p-3 space-y-1">
                    {arquitetosEmOutrasCampanhas > 0 && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <p className="text-sm text-orange-800 dark:text-orange-200">
                          {arquitetosEmOutrasCampanhas} profissional parceiro(s) estão em outras campanhas pendentes.
                        </p>
                      </div>
                    )}
                    {arquitetosComErroTelefone > 0 && (
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <p className="text-sm text-red-800 dark:text-red-200">
                          {arquitetosComErroTelefone} profissional parceiro(s) com telefone inválido/inexistente foram excluídos.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              {arquitetosDisponiveis.length === 0 ? (
                <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20">
                  <CardContent className="p-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Nenhum profissional parceiro disponível na etapa "{kanbanStages.find(s => s.slug === filtroEtapa)?.nome || filtroEtapa}".
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex gap-2 mb-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setFormData({ ...formData, arquitetosSelecionados: arquitetosDisponiveis.map(a => a.id) })}
                    >
                      Selecionar Todos
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setFormData({ ...formData, arquitetosSelecionados: [] })}
                    >
                      Limpar Seleção
                    </Button>
                  </div>
                  <ScrollArea className="h-64 border rounded-lg p-4">
                    <div className="space-y-2">
                      {arquitetosDisponiveis.map((arq) => {
                        const phoneValidation = validateBrazilianPhone(arq.phone);
                        return (
                          <div
                            key={arq.id}
                            className="flex items-center space-x-2 p-2 hover:bg-muted rounded transition-colors"
                          >
                            <Checkbox
                              id={arq.id}
                              checked={formData.arquitetosSelecionados.includes(arq.id)}
                              onCheckedChange={() => toggleArquiteto(arq.id)}
                            />
                            <Label
                              htmlFor={arq.id}
                              className="flex-1 cursor-pointer flex items-center justify-between"
                            >
                              <div>
                                <p className="font-medium">{arq.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {arq.phone || 'Sem telefone'}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                {!phoneValidation.valid && (
                                  <Badge variant="destructive" className="text-xs gap-1">
                                    <XCircle className="w-3 h-3" />
                                    Tel. Inválido
                                  </Badge>
                                )}
                                {phoneValidation.valid && (
                                  <Badge variant="outline" className="text-xs gap-1 border-green-500 text-green-700 dark:text-green-400">
                                    <CheckCircle className="w-3 h-3" />
                                    Tel. OK
                                  </Badge>
                                )}
                              </div>
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </>
              )}
              <p className="text-sm font-medium text-primary">
                {formData.arquitetosSelecionados.length} profissional parceiro(s) selecionado(s)
              </p>
            </div>

            {/* Seção de Agendamento */}
            <ScheduleSelector
              value={scheduleConfig}
              onChange={setScheduleConfig}
              totalArquitetos={formData.arquitetosSelecionados.length}
            />

            <div className="space-y-2">
              <Label htmlFor="webhook">Webhook N8N</Label>
              <Input
                id="webhook"
                value={formData.webhookN8n}
                onChange={(e) => setFormData({ ...formData, webhookN8n: e.target.value })}
                placeholder="https://seu-webhook-n8n.com/webhook/..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveCampanha} 
              disabled={loading || !formData.whatsappConnectionId || whatsappConnections.length === 0} 
              className="gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {scheduleConfig.enabled ? (
                <>
                  <Calendar className="w-4 h-4" />
                  Agendar Campanha
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Campanha
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audio Recorder Dialog */}
      <AudioRecorder
        isOpen={isRecorderOpen}
        onClose={() => setIsRecorderOpen(false)}
        onSave={handleSaveRecording}
      />

      {/* Tabs and other UI */}
      <Tabs defaultValue="criar" className="space-y-6">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="criar">Criar Campanha</TabsTrigger>
          <TabsTrigger value="agendadas" className="gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Agendadas ({campanhasAgendadas.length})
          </TabsTrigger>
          <TabsTrigger value="andamento">
            Em Andamento ({campanhasEmAndamento.length})
            {campanhasEmAndamento.length > 0 && (
              <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger value="rascunhos">Rascunhos ({campanhasRascunho.length})</TabsTrigger>
          <TabsTrigger value="enviadas">Enviadas ({campanhasEnviadas.length})</TabsTrigger>
          {campanhasComErro.length > 0 && (
            <TabsTrigger value="erros" className="text-destructive">
              Com Erros ({campanhasComErro.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="criar">
          <Card>
            <CardHeader>
              <CardTitle>Criar Nova Campanha</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Campanha
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Campanhas Agendadas */}
        <TabsContent value="agendadas" className="space-y-4">
          {campanhasAgendadas.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma campanha agendada</p>
                <p className="text-xs mt-1">Crie uma nova campanha e ative o agendamento</p>
              </CardContent>
            </Card>
          ) : (
            campanhasAgendadas.map((campanha) => {
              const proximoDisparo = campanha.tipo_agendamento === 'unico' && campanha.data_hora_unica
                ? format(new Date(campanha.data_hora_unica), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                : campanha.horario_inicio 
                  ? `${campanha.horario_inicio} - Dias: ${campanha.dias_semana?.map(d => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d]).join(', ')}`
                  : 'Configuração incompleta';
              
              return (
                <Card key={campanha.id} className="border-primary/30 bg-primary/5">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getTipoIcon(campanha.tipo_envio)}
                          <CardTitle>{campanha.nome}</CardTitle>
                          <Badge className="bg-primary/20 text-primary gap-1">
                            <Calendar className="w-3 h-3" />
                            Agendada
                          </Badge>
                        </div>
                        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>Próximo: {proximoDisparo}</span>
                          </div>
                          <span>{campanha.arquitetos_selecionados?.length || 0} profissionais parceiros</span>
                          {campanha.tipo_agendamento === 'recorrente' && campanha.data_fim && (
                            <span className="text-xs">
                              Até: {format(new Date(campanha.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(campanha)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            if (confirm('Deseja cancelar o agendamento e voltar para rascunho?')) {
                              await supabase
                                .from('tendenci_prospec_arq_campaigns')
                                .update({ status: 'rascunho', agendar_automatico: false })
                                .eq('id', campanha.id);
                              toast({ title: 'Agendamento cancelado' });
                              fetchCampanhas();
                            }
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="andamento" className="space-y-4">
          {/* Monitor de Progresso em Tempo Real */}
          <CampaignProgressMonitor />
          
          {campanhasEmAndamento.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Nenhuma campanha em andamento
              </CardContent>
            </Card>
          ) : (
            campanhasEmAndamento.map((campanha) => (
              <Card key={campanha.id} className="border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-950/20">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getTipoIcon(campanha.tipo_envio)}
                        <CardTitle>{campanha.nome}</CardTitle>
                        <Badge className="bg-blue-500 gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {campanha.status === 'pendente' ? 'Aguardando' : 'Enviando'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {campanha.arquitetos_selecionados?.length || 0} profissionais parceiros selecionados
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setViewingCampanha(campanha);
                        setDetailsOpen(true);
                      }}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Ver Progresso
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="erros" className="space-y-4">
          {campanhasComErro.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Nenhuma campanha com erro
              </CardContent>
            </Card>
          ) : (
            campanhasComErro.map((campanha) => (
              <Card key={campanha.id} className="border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-950/20">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getTipoIcon(campanha.tipo_envio)}
                        <CardTitle>{campanha.nome}</CardTitle>
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="w-3 h-3" />
                          Erro
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {campanha.arquitetos_selecionados?.length || 0} profissionais parceiros
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(campanha)}
                      >
                        Editar e Retentar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setViewingCampanha(campanha);
                          setDetailsOpen(true);
                        }}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Ver Erros
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="rascunhos" className="space-y-4">
          {campanhasRascunho.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Nenhum rascunho de campanha
              </CardContent>
            </Card>
          ) : (
            campanhasRascunho.map((campanha) => (
              <Card key={campanha.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getTipoIcon(campanha.tipo_envio)}
                        <CardTitle>{campanha.nome}</CardTitle>
                        {getStatusBadge(campanha.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {campanha.arquitetos_selecionados?.length || 0} profissionais parceiros selecionados
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(campanha)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDispatchCampanha(campanha)}
                        className="gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Disparar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="enviadas" className="space-y-4">
          {campanhasEnviadas.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Nenhuma campanha enviada
              </CardContent>
            </Card>
          ) : (
            campanhasEnviadas.map((campanha) => (
              <Card key={campanha.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getTipoIcon(campanha.tipo_envio)}
                        <CardTitle>{campanha.nome}</CardTitle>
                        {getStatusBadge(campanha.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {campanha.arquitetos_selecionados?.length || 0} profissionais parceiros
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setViewingCampanha(campanha);
                        setDetailsOpen(true);
                      }}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Ver Detalhes
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
