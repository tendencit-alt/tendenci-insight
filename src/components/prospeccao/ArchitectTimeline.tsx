import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { validateFileType, validateFileSize, ALLOWED_FILE_TYPES_ACCEPT, MAX_FILE_SIZE_MB } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Paperclip, Send, MessageSquare, Phone, Users, Bot, Download, Edit2, X, Check, Mic, Square, Play, Pause } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { describeError } from '@/lib/errorMessage';

interface TimelineUpdate {
  id: string;
  architect_id: string;
  author_id: string | null;
  created_at: string;
  message: string;
  update_type: string;
  mentioned_users: string[];
  ai_summary: string | null;
  profiles: {
    full_name: string | null;
    email: string;
  } | null;
  attachments?: {
    id: string;
    file_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
  }[];
}

interface ArchitectTimelineProps {
  architectId: string;
}

const updateTypeConfig = {
  "Comentário Interno": { icon: MessageSquare, color: "bg-blue-500", label: "Comentário Interno" },
  "Reunião / Ligação": { icon: Phone, color: "bg-purple-500", label: "Reunião" },
  "Visita / Projeto": { icon: Users, color: "bg-orange-500", label: "Visita" },
  "Conversa WhatsApp": { icon: MessageSquare, color: "bg-green-500", label: "WhatsApp" },
  "Observação IA": { icon: Bot, color: "bg-cyan-500", label: "IA" },
};

export function ArchitectTimeline({ architectId }: ArchitectTimelineProps) {
  const { toast } = useToast();
  const [timeline, setTimeline] = useState<TimelineUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [updateType, setUpdateType] = useState("Comentário Interno");
  const [files, setFiles] = useState<FileList | null>(null);
  const [audioFiles, setAudioFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        
        // Verificar se é admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        setIsAdmin(profile?.role === 'admin');
      }
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    fetchTimeline();
    fetchUsers();
    
    // Debounce para evitar múltiplos refetches
    let debounceTimer: NodeJS.Timeout;
    const debouncedFetch = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchTimeline(), 500);
    };
    
    // Realtime subscription
    const channel = supabase
      .channel(`architect-timeline-${architectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'architect_timeline',
          filter: `architect_id=eq.${architectId}`,
        },
        () => {
          debouncedFetch();
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [architectId]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name');
    
    if (data) setAllUsers(data);
  };

  const fetchTimeline = async () => {
    setLoading(true);
    
    // Buscar timeline sem JOIN (FK pode não existir)
    const { data, error } = await supabase
      .from("architect_timeline")
      .select(`
        *,
        attachments:architect_timeline_attachments(*)
      `)
      .eq("architect_id", architectId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Buscar profiles separadamente para os author_id
      const authorIds = [...new Set(data.filter(t => t.author_id).map(t => t.author_id))];
      
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", authorIds);
        
        // Mapear profiles aos registros
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const timelineWithProfiles = data.map(t => ({
          ...t,
          profiles: t.author_id ? profileMap.get(t.author_id) || null : null
        }));
        
        setTimeline(timelineWithProfiles as any);
      } else {
        setTimeline(data.map(t => ({ ...t, profiles: null })) as any);
      }
    }
    
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!message.trim() && !files && !audioFiles && !audioBlob) return;

    // Validar sessão do usuário antes de permitir envio
    if (!currentUserId) {
      toast({
        title: "Sessão expirada",
        description: "Por favor, faça login novamente para continuar",
        variant: "destructive",
      });
      return;
    }

    // Validar arquivos regulares antes do upload
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (!validateFileType(file.name)) {
          toast({
            title: "Tipo de arquivo não permitido",
            description: `O arquivo ${file.name} não é um formato aceito.`,
            variant: "destructive",
          });
          return;
        }
        
        if (!validateFileSize(file.size)) {
          toast({
            title: "Arquivo muito grande",
            description: `${file.name} excede o limite de ${MAX_FILE_SIZE_MB}MB`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    // Validar arquivos de áudio
    if (audioFiles && audioFiles.length > 0) {
      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i];
        
        if (!validateFileSize(file.size)) {
          toast({
            title: "Arquivo muito grande",
            description: `${file.name} excede o limite de ${MAX_FILE_SIZE_MB}MB`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      // Extract mentioned users from message
      const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
      const mentionedUsers: string[] = [];
      let match;
      
      while ((match = mentionRegex.exec(message)) !== null) {
        mentionedUsers.push(match[2]); // Extract user ID from [@Name](userId)
      }

      // Insert timeline entry com author_id
      const { data: timelineEntry, error: timelineError } = await supabase
        .from("architect_timeline")
        .insert({
          architect_id: architectId,
          message,
          update_type: updateType,
          mentioned_users: mentionedUsers,
          author_id: currentUserId,
        })
        .select()
        .maybeSingle();

      if (timelineError) throw timelineError;

      // Validar se o registro foi realmente criado
      if (!timelineEntry) {
        throw new Error("Falha ao salvar - registro não foi criado. Verifique sua conexão e tente novamente.");
      }

      // Upload files if any
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          const fileName = `${architectId}/${Date.now()}-${file.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from('architect-files')
            .upload(fileName, file);

          if (!uploadError) {
            await supabase
              .from("architect_timeline_attachments")
              .insert({
                timeline_id: timelineEntry.id,
                file_name: file.name,
                file_path: fileName,
                file_type: file.type,
                file_size: file.size,
              });
          }
        }
      }

      // Upload audio files if any
      if (audioFiles && audioFiles.length > 0) {
        for (let i = 0; i < audioFiles.length; i++) {
          const audioFile = audioFiles[i];
          
          // Validar tamanho (20MB)
          if (audioFile.size > 20 * 1024 * 1024) {
            toast({
              title: "Áudio muito grande",
              description: `${audioFile.name} excede o limite de 20MB`,
              variant: "destructive",
            });
            continue;
          }
          
          const fileName = `${architectId}/${Date.now()}-${audioFile.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from('architect-files')
            .upload(fileName, audioFile);

          if (!uploadError) {
            await supabase
              .from("architect_timeline_attachments")
              .insert({
                timeline_id: timelineEntry.id,
                file_name: audioFile.name,
                file_path: fileName,
                file_type: audioFile.type,
                file_size: audioFile.size,
              });
          }
        }
      }

      // Upload recorded audio blob if any
      if (audioBlob) {
        // Validar tamanho (20MB)
        if (audioBlob.size > 20 * 1024 * 1024) {
          toast({
            title: "Áudio muito grande",
            description: "O áudio gravado excede o limite de 20MB",
            variant: "destructive",
          });
        } else {
          const fileName = `${architectId}/${Date.now()}-recording.webm`;
          
          const { error: uploadError } = await supabase.storage
            .from('architect-files')
            .upload(fileName, audioBlob);

          if (!uploadError) {
            await supabase
              .from("architect_timeline_attachments")
              .insert({
                timeline_id: timelineEntry.id,
                file_name: "recording.webm",
                file_path: fileName,
                file_type: "audio/webm",
                file_size: audioBlob.size,
              });
          }
        }
      }

      toast({
        title: "Salvo com sucesso",
        description: `Atualização registrada às ${format(new Date(), "HH:mm", { locale: ptBR })}`,
      });

      setMessage("");
      setFiles(null);
      setAudioFiles(null);
      setAudioBlob(null);
      fetchTimeline();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar atualização",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("architect_timeline")
      .delete()
      .eq("id", id);

    if (!error) {
      toast({
        title: "Sucesso",
        description: "Entrada removida da timeline",
      });
      fetchTimeline();
    } else {
      toast({
        title: "Erro",
        description: describeError('Erro ao remover entrada', error),
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (id: string) => {
    const { error } = await supabase
      .from("architect_timeline")
      .update({ message: editMessage })
      .eq("id", id);

    if (!error) {
      toast({
        title: "Sucesso",
        description: "Entrada atualizada",
      });
      setEditingId(null);
      setEditMessage("");
      fetchTimeline();
    } else {
      toast({
        title: "Erro",
        description: describeError('Erro ao atualizar entrada', error),
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data } = await supabase.storage
      .from('architect-files')
      .download(filePath);

    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Seu navegador não suporta gravação de áudio");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast({
        title: "🎤 Gravando áudio",
        description: "Clique em 'Parar' quando terminar",
      });
    } catch (error: any) {
      let errorMessage = "Não foi possível acessar o microfone";
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = "Permissão para usar o microfone foi negada. Verifique as configurações do navegador.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "Nenhum microfone foi encontrado no dispositivo.";
      } else if (error.name === 'NotReadableError') {
        errorMessage = "O microfone está sendo usado por outro aplicativo.";
      }
      
      toast({
        title: "Erro ao gravar áudio",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({
        title: "Gravação concluída",
        description: "Áudio pronto para enviar",
      });
    }
  };

  const clearAudio = () => {
    setAudioBlob(null);
    audioChunksRef.current = [];
  };

  const playAudio = (blobOrUrl: Blob | string) => {
    const audio = new Audio();
    if (typeof blobOrUrl === 'string') {
      audio.src = blobOrUrl;
    } else {
      audio.src = URL.createObjectURL(blobOrUrl);
    }
    audio.play();
  };

  const toggleAudioPlayback = async (audioId: string, audioPath: string) => {
    if (playingAudioId === audioId && audioRefs.current[audioId]) {
      audioRefs.current[audioId].pause();
      setPlayingAudioId(null);
      return;
    }

    if (playingAudioId && audioRefs.current[playingAudioId]) {
      audioRefs.current[playingAudioId].pause();
    }

    try {
      const { data, error } = await supabase.storage
        .from('architect-files')
        .download(audioPath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const audio = new Audio(url);
      audioRefs.current[audioId] = audio;

      audio.onended = () => {
        setPlayingAudioId(null);
      };

      audio.play();
      setPlayingAudioId(audioId);
    } catch (error) {
      toast({
        title: "Erro",
        description: describeError('Não foi possível reproduzir o áudio', error),
        variant: "destructive",
      });
    }
  };

  const handleMention = (userId: string, userName: string) => {
    const mention = `@[${userName}](${userId}) `;
    setMessage(message + mention);
    setShowMentionSuggestions(false);
    setMentionSearch("");
    textareaRef.current?.focus();
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Check for @ to trigger mentions
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex === value.length - 1) {
      setShowMentionSuggestions(true);
      setMentionSearch("");
    } else if (lastAtIndex !== -1 && value[lastAtIndex] === '@') {
      const searchTerm = value.slice(lastAtIndex + 1);
      if (!searchTerm.includes(' ')) {
        setMentionSearch(searchTerm);
        setShowMentionSuggestions(true);
      }
    } else {
      setShowMentionSuggestions(false);
    }
  };

  const filteredUsers = allUsers.filter(user =>
    user.full_name?.toLowerCase().includes(mentionSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Timeline Colaborativa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Form */}
        <div className="space-y-3">
          <Select value={updateType} onValueChange={setUpdateType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Comentário Interno">💬 Comentário Interno</SelectItem>
              <SelectItem value="Reunião / Ligação">📞 Reunião / Ligação</SelectItem>
              <SelectItem value="Visita / Projeto">🏢 Visita / Projeto</SelectItem>
              <SelectItem value="Conversa WhatsApp">💚 Conversa WhatsApp</SelectItem>
              <SelectItem value="Observação IA">🤖 Observação IA</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Textarea
              ref={textareaRef}
              placeholder="Digite @ para mencionar alguém..."
              value={message}
              onChange={handleTextareaChange}
              rows={3}
            />
            
            {showMentionSuggestions && filteredUsers.length > 0 && (
              <div className="absolute bottom-full mb-1 w-full bg-popover border rounded-md shadow-lg max-h-40 overflow-auto z-50">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                    onClick={() => handleMention(user.id, user.full_name || user.email)}
                  >
                    {user.full_name || user.email}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="architect-file-input">Anexar Arquivos</Label>
            <Input
              id="architect-file-input"
              type="file"
              multiple
              accept={ALLOWED_FILE_TYPES_ACCEPT}
              onChange={(e) => setFiles(e.target.files)}
              className="mt-1"
            />
            {files && files.length > 0 && (
              <span className="text-sm text-muted-foreground mt-1 block">
                {files.length} arquivo(s) selecionado(s)
              </span>
            )}
          </div>

          <div>
            <Label htmlFor="architect-audio-input">Anexar Áudio</Label>
            <Input
              id="architect-audio-input"
              type="file"
              multiple
              accept="audio/*"
              onChange={(e) => setAudioFiles(e.target.files)}
              className="mt-1"
            />
            {audioFiles && audioFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {Array.from(audioFiles).map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm p-1 bg-muted rounded">
                    <span className="truncate flex-1">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const audio = new Audio(URL.createObjectURL(file));
                        audio.play();
                      }}
                      className="h-6 px-2"
                    >
                      Ouvir
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Gravar Áudio</Label>
            <div className="flex gap-2 mt-1">
              <Button
                type="button"
                variant={isRecording ? "destructive" : "outline"}
                className="flex-1"
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? (
                  <>
                    <Square className="mr-2 h-4 w-4" />
                    Parar
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-4 w-4" />
                    Gravar
                  </>
                )}
              </Button>
              {audioBlob && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={clearAudio}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {audioBlob && (
              <div className="flex items-center gap-2 mt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => playAudio(audioBlob)}
                >
                  <Play className="h-3 w-3 mr-1" />
                  Ouvir
                </Button>
                <p className="text-sm text-muted-foreground">
                  Áudio pronto para enviar
                </p>
              </div>
            )}
          </div>

          {/* Indicador do usuário logado */}
          {currentUserId && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              Você está logado como: {allUsers.find(u => u.id === currentUserId)?.full_name || "Usuário"}
            </div>
          )}
          {!currentUserId && (
            <div className="text-xs text-destructive flex items-center gap-1">
              <span className="h-2 w-2 bg-destructive rounded-full" />
              Sessão expirada - faça login novamente
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting || !currentUserId || (!message.trim() && !files && !audioBlob && !audioFiles)}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {submitting ? "Salvando..." : "Enviar Atualização"}
          </Button>
        </div>

        {/* Timeline */}
        <div className="space-y-4 mt-6">
          {loading ? (
            <p className="text-center text-muted-foreground">Carregando timeline...</p>
          ) : timeline.length === 0 ? (
            <p className="text-center text-muted-foreground">Nenhuma atualização ainda</p>
          ) : (
            timeline.map((update) => {
              const config = updateTypeConfig[update.update_type as keyof typeof updateTypeConfig];
              const Icon = config?.icon || MessageSquare;
              const isAuthor = currentUserId === update.author_id;

              return (
                <div
                  key={update.id}
                  className="relative pl-8 pb-4 border-l-2 border-muted last:border-transparent last:pb-0"
                >
                  <div
                    className={`absolute -left-2.5 top-1 w-5 h-5 rounded-full ${config?.color || 'bg-gray-500'} flex items-center justify-center text-white`}
                  >
                    <Icon className="h-3 w-3" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{config?.label || update.update_type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(update.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      
                      {(isAuthor || isAdmin) && (
                        <div className="flex gap-1">
                          {editingId === update.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(update.id)}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditMessage("");
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingId(update.id);
                                  setEditMessage(update.message);
                                }}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(update.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {editingId === update.id ? (
                      <Textarea
                        value={editMessage}
                        onChange={(e) => setEditMessage(e.target.value)}
                        rows={3}
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{update.message}</p>
                    )}

                    {update.profiles && (
                      <p className="text-xs text-muted-foreground">
                        Por: {update.profiles.full_name || update.profiles.email}
                      </p>
                    )}

                    {update.attachments && update.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {update.attachments.map((att) => (
                          <Button
                            key={att.id}
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(att.file_path, att.file_name)}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            {att.file_name}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
