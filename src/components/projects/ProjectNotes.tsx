import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mic, FileText, Paperclip, Trash2, Download, Loader2, Play, Pause, AtSign, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { AudioRecorder } from "@/components/prospeccao/AudioRecorder";
import { Progress } from "@/components/ui/progress";
import { validateFileType, validateFileSize, ALLOWED_FILE_TYPES_ACCEPT, MAX_FILE_SIZE_MB, formatFileSize } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

interface ProjectNotesProps {
  projectId: string;
}

export function ProjectNotes({ projectId }: ProjectNotesProps) {
  const { toast } = useToast();
  const { isMaster } = usePermissions();
  const [note, setNote] = useState("");
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [noteHistory, setNoteHistory] = useState<any[]>([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [mentionStartPos, setMentionStartPos] = useState<number>(0);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [projectInitialNote, setProjectInitialNote] = useState<string | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchAttachments();
    fetchNoteHistory();
    fetchAvailableUsers();
    fetchCurrentUser();
    fetchProjectInitialNote();
  }, [projectId]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  // Buscar observação inicial do projeto (campo projects.notes)
  const fetchProjectInitialNote = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("notes, created_at")
      .eq("id", projectId)
      .single();

    if (!error && data && data.notes?.trim()) {
      setProjectInitialNote(data.notes);
    }
  };

  const fetchAvailableUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, full_name, email")
      .order("full_name");

    if (!error && data) {
      setAvailableUsers(data);
    }
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setNote(value);

    // Detectar se está digitando uma menção
    const textBeforeCursor = value.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    
    if (atIndex !== -1 && atIndex === textBeforeCursor.length - 1) {
      setMentionStartPos(atIndex);
      setShowMentionDropdown(true);
      setFilteredUsers(availableUsers);
    } else if (atIndex !== -1 && textBeforeCursor.substring(atIndex + 1).match(/^\w*$/)) {
      const searchText = textBeforeCursor.substring(atIndex + 1).toLowerCase();
      setMentionSearch(searchText);
      setMentionStartPos(atIndex);
      setShowMentionDropdown(true);
      setFilteredUsers(
        availableUsers.filter(
          (u) =>
            u.username?.toLowerCase().includes(searchText) ||
            u.full_name?.toLowerCase().includes(searchText)
        )
      );
    } else {
      setShowMentionDropdown(false);
    }
  };

  const handleSelectUser = (user: any) => {
    if (!textareaRef.current) return;

    const beforeMention = note.substring(0, mentionStartPos);
    const afterMention = note.substring(textareaRef.current.selectionStart);
    const newNote = `${beforeMention}@${user.username} ${afterMention}`;
    
    setNote(newNote);
    setShowMentionDropdown(false);
    
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionStartPos + user.username.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const fetchAttachments = async () => {
    const { data, error } = await supabase
      .from("project_files")
      .select("*")
      .eq("project_id", projectId)
      .order("uploaded_at", { ascending: false });

    if (!error && data) {
      setAttachments(data);
    }
  };

  const fetchNoteHistory = async () => {
    const { data, error } = await supabase
      .from("project_notes")
      .select(`
        *,
        author:profiles!project_notes_author_id_fkey(full_name, email)
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNoteHistory(data);
      // Se há histórico, limpar a observação inicial (já está no histórico)
      if (data.length > 0) {
        setProjectInitialNote(null);
      }
    }
  };

  const handleSaveNote = async () => {
    if (!note.trim()) {
      toast({
        title: "Observação vazia",
        description: "Por favor, adicione uma observação antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Se existe observação inicial que não está no histórico, migrar primeiro
      if (projectInitialNote && noteHistory.length === 0) {
        await supabase.from("project_notes").insert({
          project_id: projectId,
          message: projectInitialNote,
          author_id: null, // Observação inicial do cadastro
        });
        setProjectInitialNote(null);
      }
      
      // Detectar menções @username
      const mentionRegex = /@(\w+)/g;
      const mentions = [...note.matchAll(mentionRegex)].map(match => match[1]);
      
      // Salvar na tabela project_notes
      const { error: noteError } = await supabase
        .from("project_notes")
        .insert({
          project_id: projectId,
          message: note,
          author_id: user?.id,
          mentioned_users: mentions.length > 0 ? mentions : null
        });

      if (noteError) {
        throw noteError;
      }

      // SYNC: Atualizar também o campo projects.notes para sincronização
      const { error: updateError } = await supabase.from("projects").update({
        notes: note
      }).eq("id", projectId);

      if (updateError) {
        console.error("Erro ao sincronizar projects.notes:", updateError);
      }

      // Se houver menções, criar notificações
      if (mentions.length > 0) {
        const { data: mentionedUsers } = await supabase
          .from("profiles")
          .select("id, username, full_name")
          .in("username", mentions);

        if (mentionedUsers && mentionedUsers.length > 0) {
          const { data: project } = await supabase
            .from("projects")
            .select("name")
            .eq("id", projectId)
            .single();

          const notifications = mentionedUsers.map(mentionedUser => ({
            user_id: mentionedUser.id,
            type: "mention",
            title: "Você foi mencionado",
            message: `${user?.email || 'Alguém'} mencionou você em uma observação do projeto "${project?.name || 'sem título'}"`,
            link: `/projects?project=${projectId}`,
            read: false
          }));

          await supabase.from("notifications").insert(notifications);
        }
      }

      toast({
        title: "Observação salva",
        description: mentions.length > 0 
          ? `Observação salva e ${mentions.length} usuário(s) notificado(s).`
          : "A observação foi adicionada ao histórico.",
      });
      
      setNote("");
      fetchNoteHistory();
    } catch (error: any) {
      console.error("Erro ao salvar observação:", error);
      toast({
        title: "Erro ao salvar observação",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleSaveAudio = async (audioBlob: Blob) => {
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const fileName = `audio_${Date.now()}.webm`;
      const filePath = `${projectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(filePath, audioBlob);

      if (uploadError) throw uploadError;

      // Salvar referência na tabela project_notes
      const { error: noteError } = await supabase.from("project_notes").insert({
        project_id: projectId,
        message: "🎤 Áudio gravado",
        audio_url: filePath,
        author_id: user.id,
      });

      if (noteError) throw noteError;

      // Também salvar no project_files para aparecer na lista de arquivos
      const { error: dbError } = await supabase.from("project_files").insert({
        project_id: projectId,
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

      fetchAttachments();
      fetchNoteHistory();
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
    
    // Mapeamento de MIME types para extensões problemáticas
    const mimeTypeMap: Record<string, string> = {
      'skp': 'application/vnd.sketchup.skp',
      'dwg': 'application/x-dwg',
      'xlsm': 'application/vnd.ms-excel.sheet.macroenabled.12',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'txt': 'text/plain',
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'mkv': 'video/x-matroska',
      'wmv': 'video/x-ms-wmv',
      'webm': 'video/webm',
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let successCount = 0;
      const maxRetries = 3;

      for (const file of Array.from(files)) {
        if (!validateFileType(file.name)) {
          toast({
            title: "Tipo de arquivo não permitido",
            description: `O arquivo ${file.name} não é um formato aceito.`,
            variant: "destructive",
          });
          continue;
        }

        if (!validateFileSize(file.size)) {
          toast({
            title: "Arquivo muito grande",
            description: `${file.name} excede o limite de ${MAX_FILE_SIZE_MB}MB`,
            variant: "destructive",
          });
          continue;
        }

        const fileExt = file.name.split(".").pop()?.toLowerCase();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${projectId}/${fileName}`;

        // Determinar contentType correto
        let contentType = file.type;
        if (!contentType || contentType === 'application/octet-stream') {
          contentType = mimeTypeMap[fileExt || ''] || 'application/octet-stream';
        }

        console.log(`[ProjectNotes] Uploading ${file.name} (${fileExt}) with type: ${contentType}, size: ${file.size}`);

        let uploaded = false;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const { error: uploadError, data: uploadData } = await supabase.storage
              .from("project-files")
              .upload(filePath, file, {
                contentType,
                upsert: false,
              });

            if (uploadError) {
              console.error(`[ProjectNotes] Upload attempt ${attempt} failed:`, uploadError);
              throw uploadError;
            }

            console.log(`[ProjectNotes] Upload successful:`, uploadData);

            const { error: dbError } = await supabase.from("project_files").insert({
              project_id: projectId,
              file_name: file.name,
              file_path: filePath,
              file_type: contentType,
              file_size: file.size,
              uploaded_by: user.id,
            });

            if (dbError) {
              console.error(`[ProjectNotes] DB insert failed:`, dbError);
              await supabase.storage.from("project-files").remove([filePath]);
              throw dbError;
            }

            uploaded = true;
            successCount++;
            break;
          } catch (error: any) {
            console.error(`[ProjectNotes] Attempt ${attempt}/${maxRetries} error:`, error?.message || error);
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
            }
          }
        }

        if (!uploaded) {
          toast({
            title: "Erro no upload",
            description: `Falha ao enviar ${file.name} após ${maxRetries} tentativas.`,
            variant: "destructive",
          });
        }
      }

      if (successCount > 0) {
        toast({
          title: "Arquivos enviados",
          description: `${successCount} arquivo(s) enviado(s) com sucesso.`,
        });
        fetchAttachments();
      }
      
      e.target.value = "";
    } catch (error: any) {
      console.error("[ProjectNotes] Error:", error);
      toast({
        title: "Erro ao enviar arquivos",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const togglePlayAudio = async (audioUrl: string, noteId: string) => {
    if (playingAudio === noteId) {
      const audio = audioRefs.current.get(noteId);
      if (audio) {
        audio.pause();
        setPlayingAudio(null);
      }
      return;
    }

    audioRefs.current.forEach((audio) => audio.pause());
    setPlayingAudio(null);

    try {
      let audio = audioRefs.current.get(noteId);
      
      if (!audio) {
        const { data, error } = await supabase.storage
          .from("project-files")
          .download(audioUrl);

        if (error) throw error;

        const url = URL.createObjectURL(data);
        audio = new Audio(url);
        audio.onended = () => setPlayingAudio(null);
        audioRefs.current.set(noteId, audio);
      }

      audio.play();
      setPlayingAudio(noteId);
    } catch (error: any) {
      toast({
        title: "Erro ao reproduzir áudio",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const { error } = await supabase
      .from("project_notes")
      .delete()
      .eq("id", noteId);

    if (error) {
      toast({
        title: "Erro ao excluir observação",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Observação excluída",
      description: "A observação foi removida do histórico.",
    });

    fetchNoteHistory();
  };

  const handleStartEdit = (entry: any) => {
    setEditingNoteId(entry.id);
    setEditingNoteText(entry.message);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingNoteText("");
  };

  const handleSaveEdit = async (noteId: string) => {
    if (!editingNoteText.trim()) {
      toast({
        title: "Observação vazia",
        description: "A observação não pode estar vazia.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("project_notes")
      .update({ message: editingNoteText, updated_at: new Date().toISOString() })
      .eq("id", noteId);

    if (error) {
      toast({
        title: "Erro ao atualizar observação",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Observação atualizada",
      description: "A observação foi atualizada com sucesso.",
    });

    setEditingNoteId(null);
    setEditingNoteText("");
    fetchNoteHistory();
  };

  return (
    <Card className="p-4 space-y-4">
      <CardHeader className="p-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Observações do Projeto
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0 space-y-4">
        {/* Nova Observação */}
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
          <Label className="text-sm font-medium">Nova Observação</Label>
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={note}
              onChange={handleNoteChange}
              placeholder="Digite sua observação... Use @ para mencionar alguém"
              className="min-h-[80px] resize-none"
            />
            
            {showMentionDropdown && filteredUsers.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto">
                <Command>
                  <CommandList>
                    <CommandEmpty>Nenhum usuário encontrado</CommandEmpty>
                    <CommandGroup>
                      {filteredUsers.map((user) => (
                        <CommandItem
                          key={user.id}
                          onSelect={() => handleSelectUser(user)}
                          className="cursor-pointer"
                        >
                          <AtSign className="w-3 h-3 mr-2 text-muted-foreground" />
                          <span className="font-medium">{user.username}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {user.full_name}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={handleSaveNote} disabled={!note.trim()}>
              Salvar Observação
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAudioRecorder(true)}
              className="gap-2"
            >
              <Mic className="w-4 h-4" />
              Gravar Áudio
            </Button>
            <Label htmlFor="project-file-upload" className="cursor-pointer">
              <Button size="sm" variant="outline" asChild className="gap-2">
                <span>
                  <Paperclip className="w-4 h-4" />
                  Anexar Arquivo
                </span>
              </Button>
            </Label>
            <input
              id="project-file-upload"
              type="file"
              accept={ALLOWED_FILE_TYPES_ACCEPT}
              onChange={handleFileUpload}
              className="hidden"
              multiple
            />
          </div>

          {isUploading && (
            <div className="space-y-1">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">Enviando...</p>
            </div>
          )}
        </div>

        {/* Histórico de Observações */}
        {(noteHistory.length > 0 || projectInitialNote) && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Histórico de Observações</Label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {/* Se não há histórico mas existe observação inicial, mostrar ela */}
              {noteHistory.length === 0 && projectInitialNote && (
                <div className="p-3 bg-background border rounded-lg space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm whitespace-pre-wrap">{projectInitialNote}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Observação inicial</span>
                    <span>•</span>
                    <span>Cadastro do projeto</span>
                  </div>
                </div>
              )}
              
              {/* Histórico normal da tabela project_notes */}
              {noteHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 bg-background border rounded-lg space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {editingNoteId === entry.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingNoteText}
                            onChange={(e) => setEditingNoteText(e.target.value)}
                            className="min-h-[60px]"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveEdit(entry.id)}>
                              Salvar
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm whitespace-pre-wrap">{entry.message}</p>
                          {entry.audio_url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => togglePlayAudio(entry.audio_url, entry.id)}
                              className="gap-2 mt-2"
                            >
                              {playingAudio === entry.id ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                              {playingAudio === entry.id ? "Pausar" : "Ouvir Áudio"}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                    {editingNoteId !== entry.id && (
                      <div className="flex gap-1">
                        {/* Botão Editar - apenas para o autor */}
                        {entry.author_id === currentUserId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(entry)}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        )}
                        {/* Botão Excluir - apenas para admins */}
                        {isMaster && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteNote(entry.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{entry.author?.full_name || entry.author?.email || "Usuário"}</span>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(entry.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Audio Recorder Modal */}
      <AudioRecorder
        isOpen={showAudioRecorder}
        onClose={() => setShowAudioRecorder(false)}
        onSave={handleSaveAudio}
      />
    </Card>
  );
}