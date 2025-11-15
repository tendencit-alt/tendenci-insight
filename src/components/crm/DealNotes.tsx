import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mic, Square, FileText, Paperclip, Trash2, Download, Loader2 } from "lucide-react";
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
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNote(currentNote);
    fetchAttachments();
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

  const handleSaveNote = async () => {
    const { error } = await supabase
      .from("crm_deals")
      .update({ note })
      .eq("id", dealId);

    if (error) {
      toast({
        title: "Erro ao salvar observação",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Observação salva",
        description: "A observação foi atualizada com sucesso.",
      });
      onNoteUpdate(note);
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
        await transcribeAudio(audioBlob);
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

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(",")[1];

        const { data, error } = await supabase.functions.invoke(
          "transcribe-audio",
          {
            body: { audio: base64Audio },
          }
        );

        if (error) throw error;

        if (data?.text) {
          const transcription = data.text;
          setNote((prev) => (prev ? `${prev}\n\n${transcription}` : transcription));
          toast({
            title: "Áudio transcrito",
            description: "A transcrição foi adicionada às observações.",
          });
        }
      };
    } catch (error: any) {
      toast({
        title: "Erro ao transcrever áudio",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${dealId}/${Date.now()}-${file.name}`;
        const filePath = `deal-attachments/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("crm-files")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Save reference to database
        const { error: dbError } = await supabase
          .from("crm_deal_files")
          .insert({
            deal_id: dealId,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
          });

        if (dbError) throw dbError;
      }

      toast({
        title: "Arquivos anexados",
        description: `${files.length} arquivo(s) anexado(s) com sucesso.`,
      });

      fetchAttachments();
    } catch (error: any) {
      toast({
        title: "Erro ao anexar arquivos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteAttachment = async (attachmentId: string, filePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("crm-files")
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("crm_deal_files")
        .delete()
        .eq("id", attachmentId);

      if (dbError) throw dbError;

      toast({
        title: "Arquivo removido",
        description: "O arquivo foi removido com sucesso.",
      });

      fetchAttachments();
    } catch (error: any) {
      toast({
        title: "Erro ao remover arquivo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownloadAttachment = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("crm-files")
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
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

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Observações</h3>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing}
          >
            {isRecording ? (
              <>
                <Square className="h-4 w-4 mr-2 fill-current" />
                Parar
              </>
            ) : isTranscribing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Transcrevendo...
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                Gravar
              </>
            )}
          </Button>
          <Button
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
                Anexar
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="note">Texto</Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Digite ou grave suas observações..."
            rows={6}
            className="mt-1"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSaveNote} disabled={note === currentNote}>
            Salvar Observação
          </Button>
        </div>

        {attachments.length > 0 && (
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Anexos ({attachments.length})
            </Label>
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {attachment.file_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(attachment.file_size / 1024).toFixed(1)} KB •{" "}
                        {formatDistanceToNow(new Date(attachment.uploaded_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleDownloadAttachment(
                          attachment.file_path,
                          attachment.file_name
                        )
                      }
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleDeleteAttachment(attachment.id, attachment.file_path)
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
