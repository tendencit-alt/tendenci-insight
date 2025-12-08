import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Mic, Square, Play, RotateCcw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AudioRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (audioBlob: Blob) => Promise<void>;
}

// Detect best supported audio format for cross-browser compatibility
const getSupportedMimeType = (): string => {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/wav'
  ];
  
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  
  // Fallback for Safari/iOS which may not report support correctly
  return 'audio/mp4';
};

// Get file extension based on MIME type
const getFileExtension = (mimeType: string): string => {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
};

export function AudioRecorder({ isOpen, onClose, onSave }: AudioRecorderProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('audio/webm');

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Detect supported MIME type
      mimeTypeRef.current = getSupportedMimeType();
      
      const options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported(mimeTypeRef.current)) {
        options.mimeType = mimeTypeRef.current;
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const actualMimeType = mediaRecorder.mimeType || mimeTypeRef.current;
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Erro ao iniciar gravação",
        description: "Verifique as permissões do microfone",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const resetRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    chunksRef.current = [];
  };

  const handleSave = async () => {
    if (!audioBlob) return;

    setIsSaving(true);
    try {
      await onSave(audioBlob);
      resetRecording();
      onClose();
    } catch (error) {
      toast({
        title: "Erro ao salvar áudio",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    resetRecording();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>🎤 Gravar Áudio</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!audioBlob && (
            <div className="flex flex-col items-center gap-4">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  size="lg"
                  className="w-full gap-2"
                >
                  <Mic className="w-5 h-5" />
                  Iniciar Gravação
                </Button>
              ) : (
                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="flex items-center gap-2 text-red-500 animate-pulse">
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    <span className="font-medium">Gravando...</span>
                  </div>
                  <Button
                    onClick={stopRecording}
                    variant="destructive"
                    size="lg"
                    className="w-full gap-2"
                  >
                    <Square className="w-5 h-5" />
                    Parar Gravação
                  </Button>
                </div>
              )}
            </div>
          )}

          {audioBlob && audioUrl && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                  <Play className="w-4 h-4" />
                  <span>Pré-visualização:</span>
                </div>
                <audio controls className="w-full">
                  <source src={audioUrl} type="audio/webm" />
                  Seu navegador não suporta o elemento de áudio.
                </audio>
              </div>

              <Button
                onClick={resetRecording}
                variant="outline"
                className="w-full gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Regravar
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!audioBlob || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Gravação"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
