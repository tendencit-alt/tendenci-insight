import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mic, Square, FileText, Paperclip, Trash2, Download, Loader2, Play, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DealNotesProps {
  dealId: string;
  currentNote: string;
  onNoteUpdate: (note: string) => void;
}

export function DealNotes({ dealId, currentNote, onNoteUpdate }: DealNotesProps) {
  const { toast } = useToast();
  const [note, setNote] = useState(currentNote);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [noteHistory, setNoteHistory] = useState<any[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    setNote(currentNote);
    fetchAttachments();
    fetchNoteHistory();
  }, [currentNote, dealId]);

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

    // Atualizar o campo note do deal também
    await supabase
      .from("crm_deals")
      .update({ note })
      .eq("id", dealId);

    toast({
      title: "Observação salva",
      description: mentions.length > 0 
        ? `Observação salva e ${mentions.length} usuário(s) notificado(s).`
        : "A observação foi adicionada ao histórico.",
    });
    
    setNote(""); // Limpar campo após salvar
    onNoteUpdate(note);
    fetchNoteHistory(); // Atualizar histórico
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "Arquivo muito grande",
            description: `${file.name} excede o limite de 10MB`,
            variant: "destructive",
          });
          continue;
        }

        const fileName = `${Date.now()}_${file.name}`;
        const filePath = `${dealId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("crm-files")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase.from("crm_deal_files").insert({
          deal_id: dealId,
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

      fetchAttachments();
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
      const { data, error } = await supabase.storage
        .from("crm-files")
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Erro ao baixar arquivo",
        description: error.message,
        variant: "destructive",
      });
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Observações/Histórico</Label>
        </div>

        <div className="flex gap-2">
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
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp"
          />
        </div>

        {isUploading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Salvando arquivo...
          </div>
        )}

        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Adicione observações sobre este negócio... (Use @ para mencionar usuários)"
          className="min-h-[120px]"
        />

        <Button type="button" onClick={handleSaveNote}>
          Salvar Observação
        </Button>

        {/* Histórico de Observações */}
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
                    <span>
                      {formatDistanceToNow(new Date(entry.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{entry.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {attachments.length > 0 && (
          <div className="space-y-2">
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
      </div>
    </Card>
  );
}
