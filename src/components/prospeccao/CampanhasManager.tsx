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
import { Plus, Send, Save, Trash2, Image, FileAudio, MessageSquare, Loader2, CheckCircle, XCircle, Upload, Mic, X, BookOpen, Eye, AlertTriangle } from "lucide-react";
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

export function CampanhasManager() {
  const { toast } = useToast();
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [arquitetosDisponiveis, setArquitetosDisponiveis] = useState<Arquiteto[]>([]);
  const [whatsappConnections, setWhatsappConnections] = useState<WhatsAppConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchProgress, setDispatchProgress] = useState(0);
  const [dispatchStatuses, setDispatchStatuses] = useState<DispatchStatus[]>([]);
  const [isWaiting, setIsWaiting] = useState(false);
  const [waitingSeconds, setWaitingSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  
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

  useEffect(() => {
    fetchCampanhas();
    fetchArquitetosDisponiveis();
    fetchWhatsAppConnections();
  }, []);

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

  const fetchArquitetosDisponiveis = async (editingCampaignId?: string) => {
    // 1. Buscar IDs de arquitetos que JÁ receberam campanhas com sucesso
    const { data: jaDisparados } = await supabase
      .from('tendenci_prospec_arq_campaign_architects')
      .select('architect_id')
      .eq('status', 'enviado');

    // 2. Buscar IDs de arquitetos em CAMPANHAS PENDENTES (rascunho/pendente/enviando)
    const { data: campanhasPendentes } = await supabase
      .from('tendenci_prospec_arq_campaigns')
      .select('id')
      .in('status', ['rascunho', 'pendente', 'enviando']);

    const campanhasPendentesIds = campanhasPendentes?.map(c => c.id) || [];
    
    let emCampanhasPendentes: { architect_id: string; campanha_id: string }[] = [];
    if (campanhasPendentesIds.length > 0) {
      const { data: arquitetosEmPendentes } = await supabase
        .from('tendenci_prospec_arq_campaign_architects')
        .select('architect_id, campanha_id')
        .in('campanha_id', campanhasPendentesIds);
      
      emCampanhasPendentes = arquitetosEmPendentes || [];
    }

    // 3. Buscar IDs de arquitetos com ERROS de telefone (número inexistente/formatação/envio)
    const { data: arquitetosComErros } = await supabase
      .from('tendenci_prospec_arq_logs')
      .select('architect_id')
      .in('tipo', ['numero_inexistente', 'erro_formatacao', 'erro_envio'])
      .not('architect_id', 'is', null);

    const idsComErroTelefone = [...new Set(arquitetosComErros?.map(d => d.architect_id).filter(Boolean) || [])];
    setArquitetosComErroTelefone(idsComErroTelefone.length);

    // 4. Se estiver editando, não excluir arquitetos da PRÓPRIA campanha
    let arquitetosParaExcluirDePendentes = emCampanhasPendentes;
    if (editingCampaignId) {
      arquitetosParaExcluirDePendentes = emCampanhasPendentes.filter(
        a => a.campanha_id !== editingCampaignId
      );
    }

    // 5. Combinar listas de exclusão (já disparados + em campanhas pendentes + com erro de telefone)
    const idsJaDisparados = [...new Set(jaDisparados?.map(d => d.architect_id) || [])];
    const idsEmPendentes = [...new Set(arquitetosParaExcluirDePendentes.map(d => d.architect_id))];
    const todosIdsParaExcluir = [...new Set([...idsJaDisparados, ...idsEmPendentes, ...idsComErroTelefone])];

    console.log(`🚫 Arquitetos já disparados: ${idsJaDisparados.length}`);
    console.log(`⏳ Arquitetos em campanhas pendentes (outras): ${idsEmPendentes.length}`);
    console.log(`📵 Arquitetos com erro de telefone: ${idsComErroTelefone.length}`);
    setArquitetosEmOutrasCampanhas(idsEmPendentes.length);

    // 6. Buscar arquitetos disponíveis EXCLUINDO todos
    let query = supabase
      .from('architects')
      .select('id, name, phone, tier, tag_prospeccao')
      .is('data_primeiro_contato', null)
      .is('data_ultimo_contato', null)
      .eq('active', true);

    if (todosIdsParaExcluir.length > 0) {
      query = query.not('id', 'in', `(${todosIdsParaExcluir.join(',')})`);
    }

    const { data, error } = await query.order('name');

    if (!error && data) {
      console.log(`✅ Arquitetos disponíveis para campanha: ${data.length}`);
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
      // Recarregar arquitetos disponíveis considerando esta campanha em edição
      fetchArquitetosDisponiveis(campanha.id);
    } else {
      resetForm();
      fetchArquitetosDisponiveis();
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
        description: "Selecione pelo menos um arquiteto",
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

    setLoading(true);

    const campanhaData = {
      nome: formData.nome,
      tipo_envio: formData.tipoEnvio,
      conteudo_texto: formData.tipoEnvio === 'texto' ? formData.conteudoTexto : null,
      conteudo_imagem_url: formData.tipoEnvio === 'imagem' ? formData.conteudoImagemUrl : null,
      conteudo_audio_url: formData.tipoEnvio === 'audio' ? formData.conteudoAudioUrl : null,
      arquitetos_selecionados: formData.arquitetosSelecionados,
      webhook_n8n: formData.webhookN8n.trim() || DEFAULT_N8N_WEBHOOK,
      whatsapp_connection_id: formData.whatsappConnectionId,
      status: 'rascunho',
      updated_at: new Date().toISOString(),
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

      toast({
        title: "Campanha atualizada!",
      });
    } else {
      const { error } = await supabase
        .from('tendenci_prospec_arq_campaigns')
        .insert({ ...campanhaData, created_at: new Date().toISOString() });

      if (error) {
        toast({
          title: "Erro ao criar campanha",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Campanha criada!",
        description: "Rascunho salvo com sucesso",
      });
    }

    await fetchCampanhas();
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
    
    // Buscar dados atualizados dos arquitetos diretamente do banco
    const { data: arquitetosData, error: arquitetosError } = await supabase
      .from('architects')
      .select('id, name, phone')
      .in('id', arquitetosSelecionados);

    if (arquitetosError || !arquitetosData) {
      toast({
        title: "Erro",
        description: "Erro ao buscar dados dos arquitetos",
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
        description: "Nenhum arquiteto com telefone válido selecionado",
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
  const campanhasEmAndamento = campanhas.filter(c => ['pendente', 'enviando'].includes(c.status));
  const campanhasEnviadas = campanhas.filter(c => c.status === 'enviado');
  const campanhasComErro = campanhas.filter(c => c.status === 'erro');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Campanhas Personalizáveis</h2>
          <p className="text-muted-foreground">
            Crie e gerencie campanhas de WhatsApp para arquitetos
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
              <Label>Arquitetos (Tag: "Nunca Contactado") *</Label>
              {(arquitetosEmOutrasCampanhas > 0 || arquitetosComErroTelefone > 0) && (
                <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
                  <CardContent className="p-3 space-y-1">
                    {arquitetosEmOutrasCampanhas > 0 && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <p className="text-sm text-orange-800 dark:text-orange-200">
                          {arquitetosEmOutrasCampanhas} arquiteto(s) estão em outras campanhas pendentes.
                        </p>
                      </div>
                    )}
                    {arquitetosComErroTelefone > 0 && (
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <p className="text-sm text-red-800 dark:text-red-200">
                          {arquitetosComErroTelefone} arquiteto(s) com telefone inválido/inexistente foram excluídos.
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
                      Nenhum arquiteto disponível com a tag "Nunca Contactado".
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
                {formData.arquitetosSelecionados.length} arquiteto(s) selecionado(s)
              </p>
            </div>

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
              <Save className="w-4 h-4" />
              Salvar Campanha
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
                        {campanha.arquitetos_selecionados?.length || 0} arquitetos selecionados
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
                        {campanha.arquitetos_selecionados?.length || 0} arquitetos
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
                        {campanha.arquitetos_selecionados?.length || 0} arquitetos selecionados
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
                        {campanha.arquitetos_selecionados?.length || 0} arquitetos
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
