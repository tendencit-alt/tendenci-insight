import React, { useState } from 'react';
import { Textarea, TextareaProps } from './textarea';
import { Button } from './button';
import { Mic, Sparkles, Loader2, MicOff, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EnhancedTextareaProps extends Omit<TextareaProps, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  context?: string;
  enableAudio?: boolean;
  enableImprove?: boolean;
  appendMode?: boolean;
  label?: string;
}

export function EnhancedTextarea({
  value,
  onChange,
  context,
  enableAudio = true,
  enableImprove = true,
  appendMode = false,
  label,
  className,
  ...props
}: EnhancedTextareaProps) {
  const [isImproving, setIsImproving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  const handleImproveText = async () => {
    if (!value || value.trim().length === 0) {
      toast.error('Digite algum texto para melhorar');
      return;
    }

    setIsImproving(true);
    try {
      const { data, error } = await supabase.functions.invoke('improve-text', {
        body: { text: value, context: context || label }
      });

      if (error) throw error;

      if (data?.improvedText) {
        onChange(data.improvedText);
        toast.success('Texto melhorado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao melhorar texto:', error);
      toast.error('Erro ao melhorar texto. Tente novamente.');
    } finally {
      setIsImproving(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        setAudioChunks(chunks);
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      setAudioChunks([]);
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Erro ao acessar microfone:', error);
      toast.error('Não foi possível acessar o microfone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async () => {
    if (audioChunks.length === 0) {
      toast.error('Nenhum áudio gravado');
      return;
    }

    setIsTranscribing(true);
    try {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const reader = new FileReader();
      
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const { data, error } = await supabase.functions.invoke('transcribe-audio-gemini', {
        body: { audio: base64Audio, mimeType: 'audio/webm' }
      });

      if (error) throw error;

      if (data?.text) {
        if (appendMode && value) {
          onChange(value + '\n' + data.text);
        } else {
          onChange(data.text);
        }
        toast.success('Áudio transcrito com sucesso!');
        setShowRecordingModal(false);
        setAudioChunks([]);
      }
    } catch (error) {
      console.error('Erro na transcrição:', error);
      toast.error('Erro ao transcrever áudio. Tente novamente.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{label}</span>
          <div className="flex gap-1">
            <TooltipProvider>
              {enableAudio && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setShowRecordingModal(true)}
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Gravar áudio e transcrever</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {enableImprove && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 gap-1"
                      onClick={handleImproveText}
                      disabled={isImproving || !value}
                    >
                      {isImproving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      <span className="text-xs">Melhorar</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Melhorar Texto com IA</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        </div>
      )}

      <Textarea
        value={value}
        onChange={handleTextareaChange}
        className={className}
        {...props}
      />

      <Dialog open={showRecordingModal} onOpenChange={setShowRecordingModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gravar Áudio</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-6 py-6">
            <div className={`p-6 rounded-full transition-all ${isRecording ? 'bg-red-100 animate-pulse' : 'bg-muted'}`}>
              {isRecording ? (
                <MicOff className="h-12 w-12 text-red-500" />
              ) : (
                <Mic className="h-12 w-12 text-muted-foreground" />
              )}
            </div>

            <div className="flex gap-3">
              {!isRecording ? (
                <Button onClick={startRecording} disabled={isTranscribing}>
                  <Mic className="h-4 w-4 mr-2" />
                  Iniciar Gravação
                </Button>
              ) : (
                <Button onClick={stopRecording} variant="destructive">
                  <MicOff className="h-4 w-4 mr-2" />
                  Parar Gravação
                </Button>
              )}
            </div>

            {audioChunks.length > 0 && !isRecording && (
              <Button 
                onClick={transcribeAudio} 
                disabled={isTranscribing}
                className="w-full"
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Transcrevendo...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Transcrever Áudio
                  </>
                )}
              </Button>
            )}

            <p className="text-sm text-muted-foreground text-center">
              {isRecording 
                ? 'Gravando... Clique em "Parar" quando terminar.'
                : audioChunks.length > 0 
                  ? 'Áudio gravado! Clique em "Transcrever" para converter em texto.'
                  : 'Clique em "Iniciar" para começar a gravar.'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
