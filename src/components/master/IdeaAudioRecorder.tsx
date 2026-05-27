import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Mic, Square, Play, Pause, Loader2, FileText, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IdeaAudioRecorderProps {
  onAudioSaved: (url: string, fileName: string, filePath: string, transcription?: string) => void;
  disabled?: boolean;
}

const getSupportedMimeType = () => {
  const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return 'audio/webm';
};

const getFileExtension = (mimeType: string) => {
  const map: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
  };
  return map[mimeType] || 'webm';
};

export const IdeaAudioRecorder = ({ onAudioSaved, disabled }: IdeaAudioRecorderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Erro ao acessar microfone:', error);
      toast.error('Erro ao acessar microfone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const transcribeAudio = async () => {
    if (!audioBlob) return;

    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: base64Audio }
      });

      if (error) throw error;
      
      setTranscription(data.text || '');
      toast.success('Áudio transcrito!');
    } catch (error) {
      console.error('Erro ao transcrever:', error);
      toast.error('Erro ao transcrever áudio');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSave = async () => {
    if (!audioBlob) return;

    setIsSaving(true);
    try {
      const mimeType = audioBlob.type;
      const extension = getFileExtension(mimeType);
      const fileName = `audio_${Date.now()}.${extension}`;
      const filePath = `audios/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('master-ideas-files')
        .upload(filePath, audioBlob);

      if (uploadError) throw uploadError;

      const { data: signed } = await supabase.storage
        .from('master-ideas-files')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7);

      onAudioSaved(signed?.signedUrl ?? '', fileName, filePath, transcription || undefined);
      toast.success('Áudio salvo!');
      resetRecording();
      setIsOpen(false);
    } catch (error) {
      console.error('Erro ao salvar áudio:', error);
      toast.error('Erro ao salvar áudio');
    } finally {
      setIsSaving(false);
    }
  };

  const resetRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscription('');
    setRecordingTime(0);
    setIsPlaying(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-2"
        >
          <Mic className="h-4 w-4" />
          Áudio
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gravar Áudio</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Recording Controls */}
          <div className="flex flex-col items-center gap-4">
            {!audioBlob ? (
              <>
                <div className="text-4xl font-mono text-muted-foreground">
                  {formatTime(recordingTime)}
                </div>
                <Button
                  size="lg"
                  variant={isRecording ? 'destructive' : 'default'}
                  onClick={isRecording ? stopRecording : startRecording}
                  className="w-16 h-16 rounded-full"
                >
                  {isRecording ? (
                    <Square className="h-6 w-6" />
                  ) : (
                    <Mic className="h-6 w-6" />
                  )}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {isRecording ? 'Clique para parar' : 'Clique para gravar'}
                </span>
              </>
            ) : (
              <>
                {/* Audio Preview */}
                <audio 
                  ref={audioRef} 
                  src={audioUrl || undefined}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
                <div className="flex items-center gap-4">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={togglePlay}
                    className="w-12 h-12 rounded-full"
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Duração: {formatTime(recordingTime)}
                  </span>
                </div>

                {/* Transcription */}
                <div className="w-full space-y-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={transcribeAudio}
                    disabled={isTranscribing}
                    className="w-full gap-2"
                  >
                    {isTranscribing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Transcrevendo...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4" />
                        Transcrever Áudio
                      </>
                    )}
                  </Button>
                  
                  {transcription && (
                    <div className="p-3 bg-muted rounded-lg text-sm max-h-32 overflow-y-auto">
                      <p className="text-xs text-muted-foreground mb-1">Transcrição:</p>
                      {transcription}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetRecording}
                    className="flex-1 gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Regravar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 gap-2"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Salvar Áudio'
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface AudioPreviewProps {
  url: string;
  fileName: string;
  transcription?: string;
  onRemove: () => void;
  onInsertTranscription?: () => void;
}

export const AudioPreview = ({ url, fileName, transcription, onRemove, onInsertTranscription }: AudioPreviewProps) => {
  return (
    <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
      <audio src={url} controls className="h-8 max-w-[150px]" />
      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground truncate block">{fileName}</span>
        {transcription && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onInsertTranscription}
            className="h-6 text-xs gap-1 px-1"
          >
            <FileText className="h-3 w-3" />
            Inserir texto
          </Button>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};
