import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  MessageSquarePlus, 
  Image as ImageIcon, 
  Mic, 
  FileUp, 
  X, 
  Download,
  Play,
  Trash2,
  Clock,
  User,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AudioRecorder } from '../prospeccao/AudioRecorder';
import { useFileUpload } from '@/hooks/useFileUpload';

interface ProductionUpdatesProps {
  orderId: string;
}

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by: string | null;
}

export function ProductionUpdates({ orderId }: ProductionUpdatesProps) {
  const queryClient = useQueryClient();
  const [updateText, setUpdateText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { uploadFiles, isUploading, uploadProgress, totalProgress } = useFileUpload({
    bucketName: 'production-attachments',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-attachments', orderId] });
    }
  });

  // Buscar anexos da OP
  const { data: attachments = [], isLoading: loadingAttachments } = useQuery({
    queryKey: ['production-attachments', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_attachments')
        .select('*')
        .eq('production_order_id', orderId)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return data as Attachment[];
    },
    enabled: !!orderId
  });

  // Buscar logs/atualizações da OP
  const { data: logs = [] } = useQuery({
    queryKey: ['production-logs', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_logs')
        .select('*, created_by_profile:profiles!production_logs_created_by_fkey(full_name)')
        .eq('production_order_id', orderId)
        .eq('action_type', 'update')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!orderId
  });

  // Mutation para adicionar atualização
  const addUpdateMutation = useMutation({
    mutationFn: async (description: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('production_logs')
        .insert({
          production_order_id: orderId,
          action_type: 'update',
          description,
          created_by: user.id
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-logs', orderId] });
      queryClient.invalidateQueries({ queryKey: ['production-order-logs', orderId] });
      setUpdateText('');
      toast.success('Atualização adicionada');
    },
    onError: () => {
      toast.error('Erro ao adicionar atualização');
    }
  });

  // Mutation para excluir anexo
  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachment: Attachment) => {
      // Excluir do storage
      const { error: storageError } = await supabase.storage
        .from('production-attachments')
        .remove([attachment.file_path]);
      
      if (storageError) console.error('Storage delete error:', storageError);

      // Excluir do banco
      const { error } = await supabase
        .from('production_attachments')
        .delete()
        .eq('id', attachment.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-attachments', orderId] });
      toast.success('Anexo excluído');
    },
    onError: () => {
      toast.error('Erro ao excluir anexo');
    }
  });

  // Handler para submit de atualização
  const handleSubmitUpdate = async () => {
    if (!updateText.trim() && selectedFiles.length === 0) {
      toast.error('Adicione um texto ou arquivo');
      return;
    }

    setIsSubmitting(true);
    try {
      // Adicionar texto se existir
      if (updateText.trim()) {
        await addUpdateMutation.mutateAsync(updateText.trim());
      }

      // Upload de arquivos se existirem
      if (selectedFiles.length > 0) {
        await uploadFiles(selectedFiles, orderId, async (file, filePath) => {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase
            .from('production_attachments')
            .insert({
              production_order_id: orderId,
              file_name: file.name,
              file_path: filePath,
              file_type: file.type,
              file_size: file.size,
              uploaded_by: user?.id
            });
        });
        setSelectedFiles([]);
      }

      toast.success('Atualização salva com sucesso!');
    } catch (error) {
      console.error('Error submitting update:', error);
      toast.error('Erro ao salvar atualização');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler para salvar áudio
  const handleSaveAudio = async (audioBlob: Blob) => {
    const timestamp = Date.now();
    const extension = audioBlob.type.includes('webm') ? 'webm' : audioBlob.type.includes('mp4') ? 'm4a' : 'ogg';
    const fileName = `audio_${timestamp}.${extension}`;
    const filePath = `${orderId}/${fileName}`;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Upload do áudio
    const { error: uploadError } = await supabase.storage
      .from('production-attachments')
      .upload(filePath, audioBlob, {
        contentType: audioBlob.type,
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Salvar metadados
    const { error: dbError } = await supabase
      .from('production_attachments')
      .insert({
        production_order_id: orderId,
        file_name: fileName,
        file_path: filePath,
        file_type: audioBlob.type,
        file_size: audioBlob.size,
        uploaded_by: user.id
      });

    if (dbError) throw dbError;

    queryClient.invalidateQueries({ queryKey: ['production-attachments', orderId] });
    toast.success('Áudio salvo com sucesso!');
  };

  // Handler para seleção de arquivos
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setSelectedFiles(prev => [...prev, ...Array.from(files)]);
    }
    event.target.value = '';
  };

  // Remover arquivo selecionado
  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Obter URL pública do arquivo
  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('production-attachments')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  // Formatear tamanho do arquivo
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Verificar se é imagem
  const isImage = (fileType: string) => fileType.startsWith('image/');
  
  // Verificar se é áudio
  const isAudio = (fileType: string) => fileType.startsWith('audio/');

  // Separar anexos por tipo
  const imageAttachments = attachments.filter(a => isImage(a.file_type));
  const audioAttachments = attachments.filter(a => isAudio(a.file_type));
  const otherAttachments = attachments.filter(a => !isImage(a.file_type) && !isAudio(a.file_type));

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          Atualizações e Anexos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulário de nova atualização */}
        <div className="space-y-3">
          <Textarea
            placeholder="Adicione uma atualização sobre esta OP..."
            value={updateText}
            onChange={(e) => setUpdateText(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          
          {/* Arquivos selecionados */}
          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <Badge key={index} variant="secondary" className="gap-1 pr-1">
                  {file.name.length > 20 ? file.name.slice(0, 20) + '...' : file.name}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => removeSelectedFile(index)}
                    aria-label="Remover arquivo selecionado"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}

          {/* Progresso de upload */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Enviando arquivos...</span>
                <span className="font-medium">{totalProgress}%</span>
              </div>
              <Progress value={totalProgress} className="h-2" />
            </div>
          )}
          
          {/* Botões de ação */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => imageInputRef.current?.click()}
              disabled={isSubmitting || isUploading}
            >
              <ImageIcon className="h-4 w-4 mr-1" />
              Imagem
            </Button>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAudioRecorder(true)}
              disabled={isSubmitting || isUploading}
            >
              <Mic className="h-4 w-4 mr-1" />
              Áudio
            </Button>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting || isUploading}
            >
              <FileUp className="h-4 w-4 mr-1" />
              Arquivo
            </Button>
            
            <div className="flex-1" />
            
            <Button
              onClick={handleSubmitUpdate}
              disabled={isSubmitting || isUploading || (!updateText.trim() && selectedFiles.length === 0)}
              size="sm"
            >
              {isSubmitting || isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Atualização'
              )}
            </Button>
          </div>
          
          {/* Inputs escondidos */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/heic"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm,.dwg,.skp,.txt"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Galeria de Imagens */}
        {imageAttachments.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <ImageIcon className="h-4 w-4" />
                Imagens ({imageAttachments.length})
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {imageAttachments.map((attachment) => (
                  <div key={attachment.id} className="relative group">
                    <img
                      src={getFileUrl(attachment.file_path)}
                      alt={attachment.file_name}
                      className="w-full h-24 object-cover rounded-md border"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center gap-1">
                      <a
                        href={getFileUrl(attachment.file_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 bg-white rounded-md hover:bg-gray-100"
                      >
                        <Download className="h-4 w-4 text-gray-700" />
                      </a>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 bg-white hover:bg-gray-100"
                        onClick={() => deleteAttachmentMutation.mutate(attachment)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Lista de Áudios */}
        {audioAttachments.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <Mic className="h-4 w-4" />
                Áudios ({audioAttachments.length})
              </h4>
              <div className="space-y-2">
                {audioAttachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                    <Play className="h-4 w-4 text-muted-foreground shrink-0" />
                    <audio controls className="flex-1 h-8">
                      <source src={getFileUrl(attachment.file_path)} type={attachment.file_type} />
                    </audio>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.file_size)}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0"
                      onClick={() => deleteAttachmentMutation.mutate(attachment)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Lista de Outros Arquivos */}
        {otherAttachments.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <FileUp className="h-4 w-4" />
                Documentos ({otherAttachments.length})
              </h4>
              <div className="space-y-2">
                {otherAttachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                    <FileUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.file_size)}
                      </p>
                    </div>
                    <a
                      href={getFileUrl(attachment.file_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-muted rounded"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0"
                      onClick={() => deleteAttachmentMutation.mutate(attachment)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Histórico de Atualizações */}
        {logs.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Histórico de Atualizações
              </h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="p-2 border rounded-md bg-muted/20">
                    <p className="text-sm">{log.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{log.created_by_profile?.full_name || 'Sistema'}</span>
                      <span>•</span>
                      <span>{format(new Date(log.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Modal de gravação de áudio */}
      <AudioRecorder
        isOpen={showAudioRecorder}
        onClose={() => setShowAudioRecorder(false)}
        onSave={handleSaveAudio}
      />
    </Card>
  );
}
