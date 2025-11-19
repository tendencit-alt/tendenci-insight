import { useState, useEffect } from "react";
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
import { Plus, Send, Save, Trash2, Image, FileAudio, MessageSquare, Loader2, CheckCircle, XCircle, Upload, Mic, X } from "lucide-react";
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
  created_at: string;
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
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchProgress, setDispatchProgress] = useState(0);
  const [dispatchStatuses, setDispatchStatuses] = useState<DispatchStatus[]>([]);
  
  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const [editingCampanha, setEditingCampanha] = useState<Campanha | null>(null);
  const [nome, setNome] = useState("");
  const [tipoEnvio, setTipoEnvio] = useState<'texto' | 'imagem' | 'audio'>('texto');
  const [conteudoTexto, setConteudoTexto] = useState("");
  const [conteudoImagemUrl, setConteudoImagemUrl] = useState("");
  const [conteudoAudioUrl, setConteudoAudioUrl] = useState("");
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [arquitetosSelecionados, setArquitetosSelecionados] = useState<string[]>([]);
  const [webhookN8n, setWebhookN8n] = useState("");

  useEffect(() => {
    fetchCampanhas();
    fetchArquitetosDisponiveis();
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

  const fetchArquitetosDisponiveis = async () => {
    // Buscar arquitetos que nunca foram contactados (sem data_primeiro_contato e sem data_ultimo_contato)
    const { data, error } = await supabase
      .from('architects')
      .select('id, name, phone, tier, tag_prospeccao')
      .is('data_primeiro_contato', null)
      .is('data_ultimo_contato', null)
      .eq('active', true)
      .order('name');

    if (!error && data) {
      setArquitetosDisponiveis(data);
    }
  };

  const resetForm = () => {
    setNome("");
    setTipoEnvio('texto');
    setConteudoTexto("");
    setConteudoImagemUrl("");
    setConteudoAudioUrl("");
    setImagemFile(null);
    setAudioFile(null);
    setArquitetosSelecionados([]);
    setWebhookN8n("");
    setEditingCampanha(null);
  };

  const handleOpenDialog = (campanha?: Campanha) => {
    if (campanha) {
      setEditingCampanha(campanha);
      setNome(campanha.nome);
      setTipoEnvio(campanha.tipo_envio || 'texto');
      setConteudoTexto(campanha.conteudo_texto || "");
      setConteudoImagemUrl(campanha.conteudo_imagem_url || "");
      setConteudoAudioUrl(campanha.conteudo_audio_url || "");
      setArquitetosSelecionados(campanha.arquitetos_selecionados || []);
      setWebhookN8n(campanha.webhook_n8n || "");
    } else {
      resetForm();
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
      setConteudoImagemUrl(url);
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
      setConteudoAudioUrl(url);
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
      setConteudoAudioUrl(url);
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
    setConteudoImagemUrl("");
    setImagemFile(null);
  };

  const removeAudio = () => {
    setConteudoAudioUrl("");
    setAudioFile(null);
  };

  const handleSaveCampanha = async () => {
    if (!nome.trim()) {
      toast({
        title: "Erro",
        description: "Nome da campanha é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (arquitetosSelecionados.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um arquiteto",
        variant: "destructive",
      });
      return;
    }

    if (tipoEnvio === 'texto' && !conteudoTexto.trim()) {
      toast({
        title: "Erro",
        description: "Conteúdo de texto é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (tipoEnvio === 'imagem' && !conteudoImagemUrl.trim()) {
      toast({
        title: "Erro",
        description: "Imagem é obrigatória",
        variant: "destructive",
      });
      return;
    }

    if (tipoEnvio === 'audio' && !conteudoAudioUrl.trim()) {
      toast({
        title: "Erro",
        description: "Áudio é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const campanhaData = {
      nome,
      tipo_envio: tipoEnvio,
      conteudo_texto: tipoEnvio === 'texto' ? conteudoTexto : null,
      conteudo_imagem_url: tipoEnvio === 'imagem' ? conteudoImagemUrl : null,
      conteudo_audio_url: tipoEnvio === 'audio' ? conteudoAudioUrl : null,
      arquitetos_selecionados: arquitetosSelecionados,
      webhook_n8n: webhookN8n.trim() || null,
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
      } else {
        toast({
          title: "Campanha atualizada com sucesso!",
        });
        handleCloseDialog();
        fetchCampanhas();
      }
    } else {
      const { error } = await supabase
        .from('tendenci_prospec_arq_campaigns')
        .insert({
          ...campanhaData,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (error) {
        toast({
          title: "Erro ao criar campanha",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Campanha criada com sucesso!",
        });
        handleCloseDialog();
        fetchCampanhas();
      }
    }

    setLoading(false);
  };

  const handleDeleteCampanha = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta campanha?")) return;

    const { error } = await supabase
      .from('tendenci_prospec_arq_campaigns')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Erro ao excluir campanha",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Campanha excluída com sucesso!",
      });
      fetchCampanhas();
    }
  };

  const handleDispatchCampanha = async (campanha: Campanha) => {
    if (!campanha.webhook_n8n) {
      toast({
        title: "Erro",
        description: "Configure o webhook N8N antes de disparar",
        variant: "destructive",
      });
      return;
    }

    if (!campanha.arquitetos_selecionados || campanha.arquitetos_selecionados.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhum arquiteto selecionado",
        variant: "destructive",
      });
      return;
    }

    setDispatching(true);
    setDispatchProgress(0);
    
    // Atualizar status para "enviando"
    await supabase
      .from('tendenci_prospec_arq_campaigns')
      .update({ status: 'enviando' })
      .eq('id', campanha.id);

    const arquitetos = await supabase
      .from('architects')
      .select('id, name, phone, data_primeiro_contato, data_ultimo_contato')
      .in('id', campanha.arquitetos_selecionados);

    if (!arquitetos.data || arquitetos.data.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhum arquiteto encontrado",
        variant: "destructive",
      });
      setDispatching(false);
      return;
    }

    const statuses: DispatchStatus[] = arquitetos.data.map(arq => ({
      architect_id: arq.id,
      architect_name: arq.name,
      status: 'pendente'
    }));
    setDispatchStatuses(statuses);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < arquitetos.data.length; i++) {
      const arquiteto = arquitetos.data[i];
      
      // Atualizar status para "enviando"
      setDispatchStatuses(prev => prev.map(s => 
        s.architect_id === arquiteto.id 
          ? { ...s, status: 'enviando' }
          : s
      ));

      try {
        const payload = {
          campanha_id: campanha.id,
          arquiteto_id: arquiteto.id,
          nome: arquiteto.name,
          telefone: arquiteto.phone,
          tipo_envio: campanha.tipo_envio,
          conteudo_texto: campanha.conteudo_texto,
          conteudo_imagem_url: campanha.conteudo_imagem_url,
          conteudo_audio_url: campanha.conteudo_audio_url,
        };

        const response = await fetch(campanha.webhook_n8n, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          successCount++;
          
          // Atualizar status para "sucesso"
          setDispatchStatuses(prev => prev.map(s => 
            s.architect_id === arquiteto.id 
              ? { ...s, status: 'sucesso' }
              : s
          ));

          // Atualizar status do arquiteto para "contato_iniciado" e registrar data do contato
          const agora = new Date().toISOString();
          await supabase
            .from('architects')
            .update({
              status_funil: 'contato_iniciado',
              data_primeiro_contato: arquiteto.data_primeiro_contato || agora,
              data_ultimo_contato: agora,
            })
            .eq('id', arquiteto.id);

          // Registrar no histórico do arquiteto
          await supabase.from('tendenci_prospec_arq_logs').insert({
            architect_id: arquiteto.id,
            tipo: 'campanha',
            canal: 'whatsapp',
            mensagem: `Mensagem enviada pela Campanha "${campanha.nome}" em ${new Date().toLocaleString('pt-BR')}`,
            campanha_id: campanha.id,
          });

          // Salvar dispatch log
          await supabase.from('tendenci_prospec_arq_campaign_dispatches').insert({
            campanha_id: campanha.id,
            architect_id: arquiteto.id,
            status: 'sucesso',
            enviado_em: agora,
          });

        } else {
          errorCount++;
          const errorMsg = `Erro HTTP ${response.status}`;
          
          setDispatchStatuses(prev => prev.map(s => 
            s.architect_id === arquiteto.id 
              ? { ...s, status: 'erro', mensagem_erro: errorMsg }
              : s
          ));

          await supabase.from('tendenci_prospec_arq_campaign_dispatches').insert({
            campanha_id: campanha.id,
            architect_id: arquiteto.id,
            status: 'erro',
            mensagem_erro: errorMsg,
          });
        }
      } catch (error: any) {
        errorCount++;
        const errorMsg = error.message || 'Erro desconhecido';
        
        setDispatchStatuses(prev => prev.map(s => 
          s.architect_id === arquiteto.id 
            ? { ...s, status: 'erro', mensagem_erro: errorMsg }
            : s
        ));

        await supabase.from('tendenci_prospec_arq_campaign_dispatches').insert({
          campanha_id: campanha.id,
          architect_id: arquiteto.id,
          status: 'erro',
          mensagem_erro: errorMsg,
        });
      }

      // Atualizar progresso
      setDispatchProgress(((i + 1) / arquitetos.data.length) * 100);
      
      // Aguardar 500ms entre envios para não sobrecarregar
      if (i < arquitetos.data.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Atualizar status final da campanha
    const finalStatus = errorCount === 0 ? 'enviado' : 'erro';
    await supabase
      .from('tendenci_prospec_arq_campaigns')
      .update({ status: finalStatus })
      .eq('id', campanha.id);

    toast({
      title: "Disparo concluído!",
      description: `${successCount} sucesso(s), ${errorCount} erro(s)`,
    });

    setDispatching(false);
    fetchCampanhas();
  };

  const toggleArquiteto = (id: string) => {
    setArquitetosSelecionados(prev =>
      prev.includes(id)
        ? prev.filter(a => a !== id)
        : [...prev, id]
    );
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
  const campanhasEnviadas = campanhas.filter(c => c.status === 'enviado');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Campanhas Personalizáveis</h2>
          <p className="text-muted-foreground">
            Crie e gerencie campanhas de WhatsApp para arquitetos
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Campanha
        </Button>
      </div>

      {arquitetosDisponiveis.length === 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20">
          <CardContent className="p-6">
            <p className="text-yellow-800 dark:text-yellow-200 font-medium">
              ⚠️ Nenhum arquiteto disponível com a tag "Nunca Contactado" para campanhas.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="todas" className="w-full">
        <TabsList>
          <TabsTrigger value="todas">Todas ({campanhas.length})</TabsTrigger>
          <TabsTrigger value="rascunhos">Rascunhos ({campanhasRascunho.length})</TabsTrigger>
          <TabsTrigger value="enviadas">Enviadas ({campanhasEnviadas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="todas" className="space-y-4 mt-6">
          {campanhas.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                Nenhuma campanha criada ainda
              </CardContent>
            </Card>
          ) : (
            campanhas.map((campanha) => (
              <Card key={campanha.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getTipoIcon(campanha.tipo_envio)}
                      <div>
                        <CardTitle>{campanha.nome}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {campanha.arquitetos_selecionados?.length || 0} arquiteto(s) • Tipo: {campanha.tipo_envio || 'não definido'}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(campanha.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Preview do Conteúdo */}
                    {campanha.tipo_envio === 'texto' && campanha.conteudo_texto && (
                      <div className="p-4 bg-muted rounded-lg border">
                        <p className="text-sm font-medium mb-2">Pré-visualização:</p>
                        <p className="text-sm line-clamp-3 whitespace-pre-wrap">{campanha.conteudo_texto}</p>
                      </div>
                    )}
                    
                    {campanha.tipo_envio === 'imagem' && campanha.conteudo_imagem_url && (
                      <div className="p-4 bg-muted rounded-lg border">
                        <p className="text-sm font-medium mb-2">Imagem:</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Image className="w-4 h-4" />
                          <span className="truncate">{campanha.conteudo_imagem_url}</span>
                        </div>
                      </div>
                    )}
                    
                    {campanha.tipo_envio === 'audio' && campanha.conteudo_audio_url && (
                      <div className="p-4 bg-muted rounded-lg border">
                        <p className="text-sm font-medium mb-2">Áudio:</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileAudio className="w-4 h-4" />
                          <span className="truncate">{campanha.conteudo_audio_url}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {campanha.status === 'rascunho' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDialog(campanha)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleDispatchCampanha(campanha)}
                            className="gap-2"
                            disabled={!campanha.webhook_n8n || dispatching}
                          >
                            <Send className="w-4 h-4" />
                            Disparar Campanha
                          </Button>
                        </>
                      )}
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteCampanha(campanha.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="rascunhos" className="space-y-4 mt-6">
          {campanhasRascunho.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                Nenhum rascunho
              </CardContent>
            </Card>
          ) : (
            campanhasRascunho.map((campanha) => (
              <Card key={campanha.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getTipoIcon(campanha.tipo_envio)}
                      <CardTitle>{campanha.nome}</CardTitle>
                    </div>
                    {getStatusBadge(campanha.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {campanha.arquitetos_selecionados?.length || 0} arquiteto(s) selecionado(s)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDialog(campanha)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDispatchCampanha(campanha)}
                      className="gap-2"
                      disabled={!campanha.webhook_n8n || dispatching}
                    >
                      <Send className="w-4 h-4" />
                      Disparar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="enviadas" className="space-y-4 mt-6">
          {campanhasEnviadas.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                Nenhuma campanha enviada ainda
              </CardContent>
            </Card>
          ) : (
            campanhasEnviadas.map((campanha) => (
              <Card key={campanha.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getTipoIcon(campanha.tipo_envio)}
                      <div>
                        <CardTitle>{campanha.nome}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Enviado em {new Date(campanha.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(campanha.status)}
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

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
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Campanha de Boas-vindas"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Conteúdo *</Label>
              <Select value={tipoEnvio} onValueChange={(v: any) => setTipoEnvio(v)}>
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

            {tipoEnvio === 'texto' && (
              <div className="space-y-2">
                <Label htmlFor="conteudo_texto">Mensagem de Texto *</Label>
                <Textarea
                  id="conteudo_texto"
                  value={conteudoTexto}
                  onChange={(e) => setConteudoTexto(e.target.value)}
                  placeholder="Digite a mensagem que será enviada..."
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  {conteudoTexto.length} caracteres
                </p>
              </div>
            )}

            {tipoEnvio === 'imagem' && (
              <div className="space-y-2">
                <Label>Upload de Imagem *</Label>
                {!conteudoImagemUrl ? (
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="cursor-pointer"
                    />
                    {uploadingImage && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enviando imagem...
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Formatos aceitos: JPG, JPEG, PNG
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative p-2 border rounded">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 z-10"
                        onClick={removeImage}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <img
                        src={conteudoImagemUrl}
                        alt="Preview"
                        className="max-h-64 mx-auto rounded"
                      />
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      ✓ Imagem anexada
                    </p>
                  </div>
                )}
              </div>
            )}

            {tipoEnvio === 'audio' && (
              <div className="space-y-4">
                <Label>Áudio *</Label>
                
                {!conteudoAudioUrl ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Enviar Áudio</Label>
                      <Input
                        type="file"
                        accept=".mp3,.wav"
                        onChange={handleAudioUpload}
                        disabled={uploadingAudio}
                        className="cursor-pointer"
                      />
                      {uploadingAudio && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Enviando áudio...
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Formatos aceitos: MP3, WAV
                      </p>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          ou
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => setIsRecorderOpen(true)}
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
                        <source src={conteudoAudioUrl} />
                        Seu navegador não suporta o elemento de áudio.
                      </audio>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      ✓ Áudio anexado
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Arquitetos (Tag: "Nunca Contactado") *</Label>
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
                      onClick={() => setArquitetosSelecionados(arquitetosDisponiveis.map(a => a.id))}
                    >
                      Selecionar Todos
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setArquitetosSelecionados([])}
                    >
                      Limpar Seleção
                    </Button>
                  </div>
                  <ScrollArea className="h-64 border rounded-lg p-4">
                    <div className="space-y-2">
                      {arquitetosDisponiveis.map((arq) => (
                        <div
                          key={arq.id}
                          className="flex items-center space-x-2 p-2 hover:bg-muted rounded transition-colors"
                        >
                          <Checkbox
                            id={arq.id}
                            checked={arquitetosSelecionados.includes(arq.id)}
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
                              <Badge variant="outline" className="text-xs">
                                {arq.tier || 'Sem tier'}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                Nunca Contactado
                              </Badge>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
              <p className="text-sm font-medium text-primary">
                {arquitetosSelecionados.length} arquiteto(s) selecionado(s)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook">Webhook N8N</Label>
              <Input
                id="webhook"
                value={webhookN8n}
                onChange={(e) => setWebhookN8n(e.target.value)}
                placeholder="https://seu-webhook-n8n.com/webhook/..."
              />
              <p className="text-xs text-muted-foreground">
                URL do webhook N8N para disparo das mensagens
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCampanha} disabled={loading} className="gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              Salvar Campanha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Progresso de Disparo */}
      <Dialog open={dispatching} onOpenChange={() => {}}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Disparando Campanha</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Progresso</span>
                <span className="text-muted-foreground">{Math.round(dispatchProgress)}%</span>
              </div>
              <Progress value={dispatchProgress} className="h-2" />
            </div>

            <ScrollArea className="h-72 border rounded-lg p-4">
              <div className="space-y-2">
                {dispatchStatuses.map((status, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {status.status === 'sucesso' && (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      )}
                      {status.status === 'erro' && (
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      )}
                      {status.status === 'enviando' && (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-500 flex-shrink-0" />
                      )}
                      {status.status === 'pendente' && (
                        <div className="w-5 h-5 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{status.architect_name}</p>
                        {status.mensagem_erro && (
                          <p className="text-xs text-red-500 truncate">{status.mensagem_erro}</p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={
                        status.status === 'sucesso' ? 'default' :
                        status.status === 'erro' ? 'destructive' :
                        'secondary'
                      }
                      className="flex-shrink-0"
                    >
                      {status.status === 'sucesso' && 'Enviado'}
                      {status.status === 'erro' && 'Erro'}
                      {status.status === 'enviando' && 'Enviando...'}
                      {status.status === 'pendente' && 'Aguardando'}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {dispatchProgress === 100 && (
              <div className="flex justify-end">
                <Button onClick={() => setDispatching(false)}>
                  Fechar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Gravação de Áudio */}
      <AudioRecorder
        isOpen={isRecorderOpen}
        onClose={() => setIsRecorderOpen(false)}
        onSave={handleSaveRecording}
      />
    </div>
  );
}