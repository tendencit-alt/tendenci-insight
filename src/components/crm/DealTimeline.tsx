import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Paperclip, Send, MessageSquare, Phone, Users, Bot, Download, Edit2, X, Check, Mic, Square, Play } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimelineUpdate {
  id: string;
  deal_id: string;
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

interface DealTimelineProps {
  dealId: string;
}

const updateTypeConfig = {
  "Comentário Interno": { icon: MessageSquare, color: "bg-blue-500", label: "Comentário Interno" },
  "Reunião / Ligação": { icon: Phone, color: "bg-purple-500", label: "Reunião" },
  "Visita / Projeto": { icon: Users, color: "bg-orange-500", label: "Visita" },
  "Conversa WhatsApp": { icon: MessageSquare, color: "bg-green-500", label: "WhatsApp" },
  "Observação IA": { icon: Bot, color: "bg-cyan-500", label: "IA" },
};

export function DealTimeline({ dealId }: DealTimelineProps) {
  const { toast } = useToast();
  const navigate = useToast();
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
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    fetchTimeline();
    fetchUsers();
    
    // Realtime subscription
    const channel = supabase
      .channel(`timeline-${dealId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_timeline',
          filter: `deal_id=eq.${dealId}`,
        },
        () => {
          fetchTimeline();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dealId]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, email')
      .not('username', 'is', null);
    
    setAllUsers(data || []);
  };

  const fetchTimeline = async () => {
    setLoading(true);
    const { data: timelineData, error: timelineError } = await supabase
      .from("crm_timeline")
      .select(`
        *,
        profiles:author_id(full_name, email)
      `)
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false });

    if (timelineError) {
      toast({
        title: "Erro ao carregar timeline",
        description: timelineError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Fetch attachments for each timeline entry
    const timelineWithAttachments = await Promise.all(
      (timelineData || []).map(async (item) => {
        const { data: attachments } = await supabase
          .from("crm_timeline_attachments")
          .select("*")
          .eq("timeline_id", item.id);
        
        return { ...item, attachments: attachments || [] };
      })
    );

    setTimeline(timelineWithAttachments);
    setLoading(false);
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Detect @ mentions
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1 && lastAtIndex === textBeforeCursor.length - 1) {
      setShowMentionSuggestions(true);
      setMentionSearch('');
    } else if (lastAtIndex !== -1) {
      const searchTerm = textBeforeCursor.slice(lastAtIndex + 1);
      if (!searchTerm.includes(' ')) {
        setShowMentionSuggestions(true);
        setMentionSearch(searchTerm);
      } else {
        setShowMentionSuggestions(false);
      }
    } else {
      setShowMentionSuggestions(false);
    }
  };

  const insertMention = (username: string) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = message.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    const newMessage = 
      message.slice(0, lastAtIndex) + 
      `@${username} ` + 
      message.slice(cursorPosition);
    
    setMessage(newMessage);
    setShowMentionSuggestions(false);
    textareaRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({
        title: "Mensagem vazia",
        description: "Digite uma mensagem antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      // Extract mentioned users by username
      const mentionRegex = /@(\w+)/g;
      const mentionedUsernames = [...message.matchAll(mentionRegex)].map(m => m[1]);
      
      // Get user IDs from usernames
      const mentionedUserIds: string[] = [];
      for (const username of mentionedUsernames) {
        const user = allUsers.find(u => u.username === username);
        if (user && user.id !== userData.user.id) {
          mentionedUserIds.push(user.id);
        }
      }

      // Insert timeline entry
      const { data: timelineEntry, error: timelineError } = await supabase
        .from("crm_timeline")
        .insert({
          deal_id: dealId,
          author_id: userData.user.id,
          message,
          update_type: updateType,
          mentioned_users: mentionedUserIds,
        })
        .select()
        .single();

      if (timelineError) throw timelineError;

      // Create notifications for mentioned users
      if (mentionedUserIds.length > 0) {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('username, full_name')
          .eq('id', userData.user.id)
          .single();

        const authorName = currentProfile?.full_name || currentProfile?.username || 'Alguém';

        const notifications = mentionedUserIds.map(userId => ({
          user_id: userId,
          type: 'mention',
          title: `${authorName} mencionou você`,
          message: message.slice(0, 100) + (message.length > 100 ? '...' : ''),
          link: `/kanban`,
        }));

        await supabase.from('notifications').insert(notifications);
      }

      // Upload files if any (including audio)
      const filesToUpload: File[] = [];
      
      if (files && files.length > 0) {
        filesToUpload.push(...Array.from(files));
      }
      
      if (audioFiles && audioFiles.length > 0) {
        filesToUpload.push(...Array.from(audioFiles));
      }
      
      if (audioBlob) {
        const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
        filesToUpload.push(audioFile);
      }

      if (filesToUpload.length > 0) {
        for (const file of filesToUpload) {
          const fileExt = file.name.split('.').pop();
          const filePath = `${dealId}/${timelineEntry.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('crm-timeline-attachments')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          // Save attachment record
          await supabase.from("crm_timeline_attachments").insert({
            timeline_id: timelineEntry.id,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
          });
        }
      }

      toast({
        title: "Atualização adicionada",
        description: "Sua atualização foi registrada com sucesso.",
      });

      setMessage("");
      setFiles(null);
      setAudioFiles(null);
      setAudioBlob(null);
      setUpdateType("Comentário Interno");
      fetchTimeline();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar atualização",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from('crm-timeline-attachments')
      .download(filePath);

    if (error) {
      toast({
        title: "Erro ao baixar arquivo",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEdit = async (timelineId: string) => {
    try {
      const { error } = await supabase
        .from("crm_timeline")
        .update({ message: editMessage })
        .eq("id", timelineId);

      if (error) throw error;

      toast({
        title: "Atualização editada",
        description: "Sua mensagem foi editada com sucesso.",
      });

      setEditingId(null);
      setEditMessage("");
      fetchTimeline();
    } catch (error: any) {
      toast({
        title: "Erro ao editar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startEdit = (timelineId: string, currentMessage: string) => {
    setEditingId(timelineId);
    setEditMessage(currentMessage);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditMessage("");
  };

  const startRecording = async () => {
    try {
      // Check if browser supports getUserMedia
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
      console.error("Erro ao iniciar gravação:", error);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>📋 Timeline Colaborativa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new update form */}
        <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
          <div>
            <Label>Tipo de Atualização</Label>
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
          </div>

          <div className="relative">
            <Label>Mensagem</Label>
            <Textarea
              ref={textareaRef}
              placeholder="Digite sua atualização... Use @username para mencionar alguém"
              value={message}
              onChange={handleMessageChange}
              rows={3}
            />
            {showMentionSuggestions && (
              <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {allUsers
                  .filter(u => 
                    u.username.toLowerCase().includes(mentionSearch.toLowerCase()) ||
                    (u.full_name && u.full_name.toLowerCase().includes(mentionSearch.toLowerCase()))
                  )
                  .slice(0, 5)
                  .map(user => (
                    <div
                      key={user.id}
                      className="px-4 py-2 hover:bg-muted cursor-pointer flex items-center gap-2"
                      onClick={() => insertMention(user.username)}
                    >
                      <Badge variant="outline">@{user.username}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {user.full_name || user.email}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="timeline-files">Anexar Arquivos</Label>
              <Input
                id="timeline-files"
                type="file"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                accept="image/*,.pdf,.doc,.docx"
              />
              {files && files.length > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {files.length} arquivo(s)
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="timeline-audio-files">Anexar Áudio</Label>
              <Input
                id="timeline-audio-files"
                type="file"
                multiple
                onChange={(e) => setAudioFiles(e.target.files)}
                accept="audio/*"
              />
              {audioFiles && audioFiles.length > 0 && (
                <div className="space-y-1 mt-1">
                  {Array.from(audioFiles).map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Play className="h-3 w-3" />
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
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            <Send className="mr-2 h-4 w-4" />
            {submitting ? "Enviando..." : "Adicionar Atualização"}
          </Button>
        </div>

        {/* Timeline feed */}
        <div className="space-y-4">
          {loading ? (
            <p className="text-center text-muted-foreground">Carregando timeline...</p>
          ) : timeline.length === 0 ? (
            <p className="text-center text-muted-foreground">Nenhuma atualização ainda. Seja o primeiro a adicionar!</p>
          ) : (
            timeline.map((update) => {
              const config = updateTypeConfig[update.update_type as keyof typeof updateTypeConfig];
              const Icon = config?.icon || MessageSquare;
              
              return (
                <div key={update.id} className="flex gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`h-10 w-10 rounded-full ${config?.color || 'bg-gray-500'} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">
                          {update.profiles?.full_name || update.profiles?.email || "Usuário desconhecido"}
                        </span>
                        <Badge variant="outline">{config?.label || update.update_type}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(update.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      
                      {/* Botão de editar - apenas para o autor */}
                      {currentUserId === update.author_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(update.id, update.message)}
                          className="h-8"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    {editingId === update.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editMessage}
                          onChange={(e) => setEditMessage(e.target.value)}
                          rows={3}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleEdit(update.id)}
                            className="gap-1"
                          >
                            <Check className="h-3 w-3" />
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEdit}
                            className="gap-1"
                          >
                            <X className="h-3 w-3" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{update.message}</p>
                    )}
                    
                    {update.ai_summary && (
                      <div className="bg-cyan-50 dark:bg-cyan-950 border border-cyan-200 dark:border-cyan-800 rounded p-3 text-sm">
                        <p className="font-semibold text-cyan-700 dark:text-cyan-300 mb-1">🧠 Resumo IA:</p>
                        <p className="text-cyan-600 dark:text-cyan-400">{update.ai_summary}</p>
                      </div>
                    )}
                    
                    {update.attachments && update.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {update.attachments.map((attachment) => {
                          const isAudio = attachment.file_type.startsWith('audio/');
                          
                          if (isAudio) {
                            return (
                              <div key={attachment.id} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    const { data } = await supabase.storage
                                      .from('crm-timeline-attachments')
                                      .createSignedUrl(attachment.file_path, 60);
                                    if (data?.signedUrl) {
                                      playAudio(data.signedUrl);
                                    }
                                  }}
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                                <span className="text-sm">🎤 Áudio</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => downloadFile(attachment.file_path, attachment.file_name)}
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          }
                          
                          return (
                            <Button
                              key={attachment.id}
                              variant="outline"
                              size="sm"
                              onClick={() => downloadFile(attachment.file_path, attachment.file_name)}
                            >
                              <Paperclip className="mr-2 h-3 w-3" />
                              {attachment.file_name}
                              <Download className="ml-2 h-3 w-3" />
                            </Button>
                          );
                        })}
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
