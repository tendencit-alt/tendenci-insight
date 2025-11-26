import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, File, X, Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { validateFileType, validateFileSize, ALLOWED_FILE_TYPES_ACCEPT, MAX_FILE_SIZE_MB, formatFileSize } from "@/lib/utils";

interface DealFileUploadProps {
  dealId: string;
  files: any[];
  onFilesChange: () => void;
}

export function DealFileUpload({ dealId, files, onFilesChange }: DealFileUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validar todos os arquivos antes de começar upload
    const validFiles: File[] = [];
    for (const file of Array.from(files)) {
      if (!validateFileType(file.name)) {
        toast({
          title: "Tipo não permitido",
          description: `${file.name} não é um formato aceito`,
          variant: "destructive",
        });
        continue;
      }

      if (!validateFileSize(file.size)) {
        toast({
          title: "Arquivo muito grande",
          description: `${file.name} excede ${MAX_FILE_SIZE_MB}MB`,
          variant: "destructive",
        });
        continue;
      }
      
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      e.target.value = "";
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let successCount = 0;
      
      // Upload sequencial com retry para cada arquivo
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${dealId}/${Date.now()}_${i}.${fileExt}`;
        
        // Atualizar progresso
        const currentProgress = Math.round(((i) / validFiles.length) * 100);
        setUploadProgress(currentProgress);

        // Determinar contentType correto baseado na extensão
        let contentType = file.type;
        if (!contentType || contentType === 'application/octet-stream') {
          const ext = file.name.split('.').pop()?.toLowerCase();
          if (ext === 'skp') {
            contentType = 'application/vnd.sketchup.skp';
          } else if (ext === 'dwg') {
            contentType = 'image/vnd.dwg';
          } else if (ext === 'xlsm') {
            contentType = 'application/vnd.ms-excel.sheet.macroenabled.12';
          }
        }

        console.log(`Uploading ${file.name} with type: ${contentType}, size: ${file.size}`);

        // Retry lógica: até 3 tentativas por arquivo
        let uploadError;
        for (let attempt = 0; attempt < 3; attempt++) {
          const { error } = await supabase.storage
            .from("deal-files")
            .upload(fileName, file, {
              contentType: contentType || 'application/octet-stream',
              upsert: false,
            });
          
          uploadError = error;
          if (!error) break;
          
          console.error(`Upload attempt ${attempt + 1} failed for ${file.name}:`, error);
          
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }

        if (!uploadError) {
          const { error: dbError } = await supabase
            .from("crm_deal_files")
            .insert({
              deal_id: dealId,
              file_name: file.name,
              file_path: fileName,
              file_type: file.type,
              file_size: file.size,
              uploaded_by: user.id,
            });

          if (!dbError) {
            successCount++;
          }
        }
      }

      setUploadProgress(100);

      if (successCount > 0) {
        toast({
          title: `${successCount} arquivo(s) enviado(s)`,
          description: successCount < validFiles.length 
            ? `${validFiles.length - successCount} falhou(aram)`
            : "Todos os arquivos foram anexados",
        });
        onFilesChange();
      } else {
        throw new Error("Nenhum arquivo foi enviado");
      }

      e.target.value = "";
    } catch (error: any) {
      toast({
        title: "Erro ao enviar arquivos",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 500);
    }
  };

  const handleDownload = async (file: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("deal-files")
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Erro ao baixar arquivo",
        description: "Não foi possível baixar o arquivo",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (fileId: string, filePath: string) => {
    try {
      // Deletar do storage
      const { error: storageError } = await supabase.storage
        .from("deal-files")
        .remove([filePath]);

      if (storageError) throw storageError;

      // Deletar do banco
      const { error: dbError } = await supabase
        .from("crm_deal_files")
        .delete()
        .eq("id", fileId);

      if (dbError) throw dbError;

      toast({
        title: "Arquivo removido",
        description: "O arquivo foi removido com sucesso",
      });

      onFilesChange();
    } catch (error) {
      toast({
        title: "Erro ao remover arquivo",
        description: "Não foi possível remover o arquivo",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="file-upload" className="flex items-center gap-2 cursor-pointer">
          <Upload className="h-4 w-4" />
          Anexar documento
        </Label>
        <div className="mt-2 flex gap-2">
          <Input
            id="file-upload"
            type="file"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            accept={ALLOWED_FILE_TYPES_ACCEPT}
          />
          {uploading && (
            <Button disabled size="sm">
              <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
          )}
        </div>
            {uploading && uploadProgress > 0 && (
              <div className="mt-2 space-y-2">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enviando arquivos... {uploadProgress}%
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Formatos aceitos: PDF, DOC, DOCX, XLS, XLSX, XLSM, DWG, JPG, PNG, WEBP, TXT, MP3, WAV, M4A, WEBM, OGG (máx. {MAX_FILE_SIZE_MB}MB)
            </p>
      </div>

      {files && files.length > 0 && (
        <div className="space-y-2">
          <Label>Arquivos anexados</Label>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.file_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.file_size)}</span>
                      <span>•</span>
                      <span>
                        {new Date(file.uploaded_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(file)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(file.id, file.file_path)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
