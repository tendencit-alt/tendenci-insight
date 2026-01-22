import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { validateFileType, validateFileSize, ALLOWED_FILE_TYPES_ACCEPT, MAX_FILE_SIZE_MB, formatFileSize } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Mic, Square, FileText, Paperclip, Trash2, Download, Loader2, Play, Pause, AtSign, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { AudioRecorder } from "@/components/prospeccao/AudioRecorder";
import { Progress } from "@/components/ui/progress";

interface DealNotesProps {
  dealId: string;
  currentNote: string;
  onNoteUpdate: (note: string) => void;
}

export function DealNotes({ dealId, currentNote, onNoteUpdate }: DealNotesProps) {
  const { toast } = useToast();
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
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchAttachments();
    fetchNoteHistory();
    fetchAvailableUsers();
  }, [dealId]);

  const fetchAvailableUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, full_name, email")
      .order("full_name");

    if (!error && data) {
      setAvailableUsers(data);
    }
  };

  const handleSelectUser = (user: any) => {
    if (!textareaRef.current) return;

    const beforeMention = note.substring(0, mentionStartPos);
    const afterMention = note.substring(textareaRef.current.selectionStart);
    const newNote = `${beforeMention}@${user.username} ${afterMention}`;
    
    setNote(newNote);
    setShowMentionDropdown(false);
    
    // Focar textarea e posicionar cursor após a menção
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
      .from("crm_deal_files")
      .select("*")
      .eq("deal_id", dealId)
      .order("uploaded_at", { ascending: false });

    if (!error && data) {
      setAttachments(data);
    }
  };

  const fetchNoteHistory = async () => {
    const { data, error } = await supabase
      .from("crm_timeline")
      .select(`
        *,
        author:profiles!crm_timeline_author_id_fkey(full_name, email)
      `)
      .eq("deal_id", dealId)
      .eq("update_type", "Observação")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNoteHistory(data);
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

    const { data: { user } } = await supabase.auth.getUser();
    
    // Detectar menções @username
    const mentionRegex = /@(\w+)/g;
    const mentions = [...note.matchAll(mentionRegex)].map(match => match[1]);
    
    // Salvar na timeline
    const { error: timelineError } = await supabase
      .from("crm_timeline")
      .insert({
        deal_id: dealId,
        message: note,
        update_type: "Observação",
        author_id: user?.id,
        mentioned_users: mentions.length > 0 ? mentions : null
      });

    if (timelineError) {
      toast({
        title: "Erro ao salvar observação",
        description: timelineError.message,
        variant: "destructive",
      });
      return;
    }

    // SYNC: Atualizar também o campo crm_deals.note para sincronização com o card
    await supabase.from("crm_deals").update({
      note: note
    }).eq("id", dealId);

    // Se houver menções, buscar IDs dos usuários e criar notificações
    if (mentions.length > 0) {
      const { data: mentionedUsers } = await supabase
        .from("profiles")
        .select("id, username, full_name")
        .in("username", mentions);

      if (mentionedUsers && mentionedUsers.length > 0) {
        // Buscar informações do deal para a notificação
        const { data: deal } = await supabase
          .from("crm_deals")
          .select("title")
          .eq("id", dealId)
          .single();

        // Criar notificações para cada usuário mencionado
        const notifications = mentionedUsers.map(mentionedUser => ({
          user_id: mentionedUser.id,
          type: "mention",
          title: "Você foi mencionado",
          message: `${user?.email || 'Alguém'} mencionou você em uma observação do negócio "${deal?.title || 'sem título'}"`,
          link: `/kanban?deal=${dealId}`,
          read: false
        }));

        await supabase
          .from("notifications")
          .insert(notifications);
      }
    }


    toast({
      title: "Observação salva",
      description: mentions.length > 0 
        ? `Observação salva e ${mentions.length} usuário(s) notificado(s).`
        : "A observação foi adicionada ao histórico.",
    });
    
    setNote(""); // Limpar campo após salvar
    // NÃO chamar onNoteUpdate aqui para evitar loop
    fetchNoteHistory(); // Atualizar histórico
  };

  const handleSaveAudio = async (audioBlob: Blob) => {
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const fileName = `audio_${Date.now()}.webm`;
      const filePath = `${dealId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("crm-files")
        .upload(filePath, audioBlob);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("crm_deal_files").insert({
        deal_id: dealId,
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

  const uploadWithRetry = async (file: File, maxRetries = 3): Promise<boolean> => {
    // Validar tipo de arquivo
    if (!validateFileType(file.name)) {
      toast({
        title: "Tipo de arquivo não permitido",
        description: `O arquivo ${file.name} não é um formato aceito.`,
        variant: "destructive",
      });
      return false;
    }

    // Validar tamanho
    if (!validateFileSize(file.size)) {
      toast({
        title: "Arquivo muito grande",
        description: `${file.name} excede o limite de ${MAX_FILE_SIZE_MB}MB`,
        variant: "destructive",
      });
      return false;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Usuário não autenticado. Faça login novamente.",
        variant: "destructive",
      });
      return false;
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${dealId}/${fileName}`;

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

    // Determinar contentType correto
    let contentType = file.type;
    if (!contentType || contentType === 'application/octet-stream') {
      contentType = mimeTypeMap[fileExt || ''] || 'application/octet-stream';
    }

    console.log(`[DealNotes] Uploading ${file.name} (${fileExt}) with type: ${contentType}, size: ${file.size}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        setUploadProgress(Math.min(attempt * 25, 90));

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("crm-files")
          .upload(filePath, file, {
            contentType,
            upsert: false,
          });

        if (uploadError) {
          console.error(`[DealNotes] Upload attempt ${attempt} failed:`, uploadError);
          throw uploadError;
        }

        console.log(`[DealNotes] Upload successful:`, uploadData);
        setUploadProgress(100);

        const { error: dbError } = await supabase.from("crm_deal_files").insert({
          deal_id: dealId,
          file_name: file.name,
          file_path: filePath,
          file_type: contentType,
          file_size: file.size,
          uploaded_by: user.id,
        });

        if (dbError) {
          console.error(`[DealNotes] DB insert failed:`, dbError);
          // Tentar remover arquivo do storage se falhou inserir no DB
          await supabase.storage.from("crm-files").remove([filePath]);
          throw dbError;
        }

        setTimeout(() => setUploadProgress(0), 2000);
        return true;
      } catch (error: any) {
        console.error(`[DealNotes] Attempt ${attempt}/${maxRetries} error:`, error?.message || error);
        
        if (attempt === maxRetries) {
          toast({
            title: "Erro no upload",
            description: error?.message || `Falha após ${maxRetries} tentativas. Tente novamente.`,
            variant: "destructive",
          });
          setUploadProgress(0);
          return false;
        }
        // Exponential backoff antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }
    return false;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      let successCount = 0;
      for (const file of Array.from(files)) {
        const success = await uploadWithRetry(file);
        if (success) successCount++;
      }

      if (successCount > 0) {
        toast({
          title: "Arquivos enviados",
          description: `${successCount} arquivo(s) enviado(s) com sucesso.`,
        });
        fetchAttachments();
      }

      // Limpar o input após o upload
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
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

  const handleDeleteAttachment = async (fileId: string, filePath: string) => {
    try {
      const { error: storageError } = await supabase.storage
        .from("crm-files")
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("crm_deal_files")
        .delete()
        .eq("id", fileId);

      if (dbError) throw dbError;

      toast({
        title: "Arquivo excluído",
        description: "O arquivo foi removido com sucesso.",
      });

      fetchAttachments();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir arquivo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownloadAttachment = async (file: any) => {
    try {
      console.log('📥 Iniciando download CRM:', file.file_name, file.file_path);
      
      // Criar URL assinada - Supabase retorna URL completa
      const { data, error } = await supabase.storage
        .from("crm-files")
        .createSignedUrl(file.file_path, 60);

      if (error) {
        console.error('❌ Erro ao criar URL assinada:', error);
        throw error;
      }

      console.log('✅ URL assinada criada com sucesso');

      // A URL já vem completa do Supabase, usar diretamente com tag <a>
      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = file.file_name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download iniciado",
        description: "O arquivo está sendo baixado.",
      });
    } catch (error: any) {
      console.error('❌ Erro ao baixar arquivo:', error);
      
      // Fallback com download direto
      try {
        console.log('🔄 Tentando download direto como fallback...');
        const { data, error: downloadError } = await supabase.storage
          .from("crm-files")
          .download(file.file_path);

        if (downloadError) throw downloadError;

        const url = URL.createObjectURL(data);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Download concluído",
          description: "O arquivo foi baixado com sucesso.",
        });
      } catch (fallbackError: any) {
        console.error('❌ Fallback também falhou:', fallbackError);
        toast({
          title: "Erro ao baixar arquivo",
          description: "Verifique suas permissões de acesso.",
          variant: "destructive",
        });
      }
    }
  };

  const togglePlayAudio = async (file: any) => {
    const audioId = file.id;
    
    if (playingAudio === audioId) {
      const audio = audioRefs.current.get(audioId);
      if (audio) {
        audio.pause();
        setPlayingAudio(null);
      }
      return;
    }

    // Pause any currently playing audio
    audioRefs.current.forEach((audio) => audio.pause());
    setPlayingAudio(null);

    try {
      let audio = audioRefs.current.get(audioId);
      
      if (!audio) {
        const { data, error } = await supabase.storage
          .from("crm-files")
          .download(file.file_path);

        if (error) throw error;

        const url = URL.createObjectURL(data);
        audio = new Audio(url);
        audio.onended = () => setPlayingAudio(null);
        audioRefs.current.set(audioId, audio);
      }

      audio.play();
      setPlayingAudio(audioId);
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
      .from("crm_timeline")
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
      .from("crm_timeline")
      .update({ message: editingNoteText })
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
      description: "As alterações foram salvas.",
    });

    setEditingNoteId(null);
    setEditingNoteText("");
    fetchNoteHistory();
  };

  return (
    <Card>
      <CardHeader>
        <div className="space-y-1">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-xl">📋</span>
            Observações Internas
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Registre anotações internas sobre este negócio
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Seção: Nova Observação */}
        <div className="p-4 rounded-lg bg-muted/30 space-y-3">
          <Label className="text-sm font-medium">Nova Observação</Label>
          
          <div className="relative">
            <Textarea
            ref={textareaRef}
            value={note}
            onChange={(e) => {
              const newValue = e.target.value;
              const cursorPos = e.target.selectionStart;
              setNote(newValue);

              // Detectar se @ foi digitado
              const textBeforeCursor = newValue.substring(0, cursorPos);
              const lastAtIndex = textBeforeCursor.lastIndexOf('@');
              
              if (lastAtIndex !== -1) {
                const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
                // Verificar se não há espaço após o @
                if (!textAfterAt.includes(' ')) {
                  setMentionSearch(textAfterAt.toLowerCase());
                  setMentionStartPos(lastAtIndex);
                  setShowMentionDropdown(true);
                  setSelectedUserIndex(0);
                  
                  // Filtrar usuários
                  const filtered = availableUsers.filter(user => 
                    user.username.toLowerCase().includes(textAfterAt.toLowerCase()) ||
                    (user.full_name && user.full_name.toLowerCase().includes(textAfterAt.toLowerCase()))
                  );
                  setFilteredUsers(filtered);
                } else {
                  setShowMentionDropdown(false);
                }
              } else {
                setShowMentionDropdown(false);
              }
            }}
            onKeyDown={(e) => {
              if (showMentionDropdown && filteredUsers.length > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedUserIndex(prev => 
                    prev < filteredUsers.length - 1 ? prev + 1 : 0
                  );
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedUserIndex(prev => 
                    prev > 0 ? prev - 1 : filteredUsers.length - 1
                  );
                } else if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault();
                  handleSelectUser(filteredUsers[selectedUserIndex]);
                } else if (e.key === 'Escape') {
                  setShowMentionDropdown(false);
                }
              }
            }}
            placeholder="Adicione observações sobre este negócio... (Use @ para mencionar usuários)"
            className="min-h-[120px]"
          />

          {/* Dropdown de menções */}
          {showMentionDropdown && filteredUsers.length > 0 && (
            <Card className="absolute bottom-full left-0 mb-2 w-full max-w-xs z-50 shadow-lg border bg-background">
              <Command>
                <CommandList className="max-h-[200px]">
                  <CommandEmpty>Nenhum usuário encontrado</CommandEmpty>
                  <CommandGroup>
                    {filteredUsers.map((user, index) => (
                      <CommandItem
                        key={user.id}
                        onSelect={() => handleSelectUser(user)}
                        className={`cursor-pointer ${index === selectedUserIndex ? 'bg-accent' : ''}`}
                      >
                        <AtSign className="h-4 w-4 mr-2" />
                        <div className="flex flex-col">
                          <span className="font-medium">@{user.username}</span>
                          {user.full_name && (
                            <span className="text-xs text-muted-foreground">{user.full_name}</span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </Card>
          )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" onClick={handleSaveNote} size="sm">
              Salvar Observação
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAudioRecorder(true)}
              disabled={isUploading}
            >
              <Mic className="h-4 w-4 mr-1" />
              Gravar Áudio
            </Button>

            <label htmlFor="file-upload">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploading}
                asChild
              >
                <span className="cursor-pointer">
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Paperclip className="h-4 w-4 mr-1" />
                      Anexar
                    </>
                  )}
                </span>
              </Button>
            </label>

            <input
              id="file-upload"
              type="file"
              className="hidden"
              multiple
              onChange={handleFileUpload}
              accept={ALLOWED_FILE_TYPES_ACCEPT}
              disabled={isUploading}
            />
          </div>

          {isUploading && uploadProgress > 0 && (
            <div className="space-y-2 pt-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Enviando arquivo... {uploadProgress}%
              </p>
            </div>
          )}
        </div>

        {/* Seção: Histórico de Observações */}
        {noteHistory.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-sm font-medium">Histórico de Observações</Label>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {noteHistory.map((entry) => (
                <div key={entry.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium">
                      {entry.author?.full_name || entry.author?.email || "Usuário"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span>
                        {formatDistanceToNow(new Date(entry.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleStartEdit(entry)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteNote(entry.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {editingNoteId === entry.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingNoteText}
                        onChange={(e) => setEditingNoteText(e.target.value)}
                        className="min-h-[80px]"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(entry.id)}
                        >
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{entry.message}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Seção: Arquivos Anexados */}
        {attachments.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-sm font-medium">Arquivos Anexados</Label>
            {attachments.map((file) => {
              const isAudio = file.file_type?.startsWith('audio/');
              
              return (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-secondary rounded-md"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)} •{" "}
                        {formatDistanceToNow(new Date(file.uploaded_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    {isAudio && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePlayAudio(file)}
                      >
                        {playingAudio === file.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadAttachment(file)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAttachment(file.id, file.file_path)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <AudioRecorder
        isOpen={showAudioRecorder}
        onClose={() => setShowAudioRecorder(false)}
        onSave={handleSaveAudio}
      />
    </Card>
  );
}
