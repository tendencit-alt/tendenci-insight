import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validateFileType, validateFileSize, MAX_FILE_SIZE_MB } from "@/lib/utils";

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface UseFileUploadOptions {
  bucketName: string;
  maxConcurrent?: number;
  maxRetries?: number;
  onSuccess?: () => void;
}

export function useFileUpload({
  bucketName,
  maxConcurrent = 2,
  maxRetries = 3,
  onSuccess,
}: UseFileUploadOptions) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [totalProgress, setTotalProgress] = useState(0);

  const uploadSingleFile = async (
    file: File,
    folderPath: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; filePath?: string; error?: string }> => {
    // Validações
    if (!validateFileType(file.name)) {
      return {
        success: false,
        error: "Tipo de arquivo não permitido",
      };
    }

    if (!validateFileSize(file.size)) {
      return {
        success: false,
        error: `Arquivo excede ${MAX_FILE_SIZE_MB}MB`,
      };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Usuário não autenticado" };
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase();
    const fileName = `${folderPath}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Determinar contentType correto baseado na extensão
    let contentType = file.type;
    if (!contentType || contentType === 'application/octet-stream') {
      if (fileExt === 'skp') {
        contentType = 'application/vnd.sketchup.skp';
      } else if (fileExt === 'dwg') {
        contentType = 'image/vnd.dwg';
      } else if (fileExt === 'xlsm') {
        contentType = 'application/vnd.ms-excel.sheet.macroenabled.12';
      }
    }

    console.log(`Uploading ${file.name} with type: ${contentType}, size: ${file.size}`);

    // Retry logic com exponential backoff
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Atualizar progresso
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.fileName === file.name
              ? { ...p, status: 'uploading', progress: Math.min(attempt * 30, 90) }
              : p
          )
        );

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(fileName, file, {
            contentType: contentType || "application/octet-stream",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Upload bem-sucedido
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.fileName === file.name ? { ...p, status: 'success', progress: 100 } : p
          )
        );

        return {
          success: true,
          filePath: fileName,
        };
      } catch (error: any) {
        lastError = error;

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * Math.pow(2, attempt - 1))
          );
        }
      }
    }

    // Todas as tentativas falharam
    setUploadProgress((prev) =>
      prev.map((p) =>
        p.fileName === file.name
          ? { ...p, status: 'error', progress: 0, error: lastError?.message }
          : p
      )
    );

    return {
      success: false,
      error: lastError?.message || "Erro no upload",
    };
  };

  const uploadFiles = useCallback(
    async (
      files: File[],
      folderPath: string,
      onFileUploaded?: (file: File, filePath: string) => Promise<void>
    ) => {
      if (files.length === 0) return { success: true, uploadedCount: 0 };

      setIsUploading(true);
      setUploadProgress(
        files.map((f) => ({
          fileName: f.name,
          progress: 0,
          status: 'pending',
        }))
      );
      setTotalProgress(0);

      let successCount = 0;
      let errorCount = 0;

      // Upload em batches paralelos (máx 2 simultâneos)
      for (let i = 0; i < files.length; i += maxConcurrent) {
        const batch = files.slice(i, i + maxConcurrent);
        const results = await Promise.all(
          batch.map((file) => uploadSingleFile(file, folderPath))
        );

        for (let j = 0; j < results.length; j++) {
          const result = results[j];
          const file = batch[j];

          if (result.success && result.filePath && onFileUploaded) {
            try {
              await onFileUploaded(file, result.filePath);
              successCount++;
            } catch (error: any) {
              errorCount++;
              toast({
                title: "Erro ao salvar metadados",
                description: `${file.name}: ${error.message}`,
                variant: "destructive",
              });
            }
          } else if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        }

        // Atualizar progresso total
        const completed = i + batch.length;
        setTotalProgress(Math.round((completed / files.length) * 100));
      }

      setIsUploading(false);

      // Feedback final
      if (successCount > 0) {
        toast({
          title: `${successCount} arquivo(s) enviado(s)`,
          description:
            errorCount > 0
              ? `${errorCount} arquivo(s) falharam`
              : "Todos os arquivos foram enviados com sucesso",
        });
        
        if (onSuccess) {
          onSuccess();
        }
      } else if (errorCount > 0) {
        toast({
          title: "Falha no upload",
          description: `Nenhum arquivo foi enviado. ${errorCount} erro(s).`,
          variant: "destructive",
        });
      }

      // Limpar progresso após 3 segundos
      setTimeout(() => {
        setUploadProgress([]);
        setTotalProgress(0);
      }, 3000);

      return { success: successCount > 0, uploadedCount: successCount };
    },
    [bucketName, maxConcurrent, maxRetries, toast, onSuccess]
  );

  const resetProgress = useCallback(() => {
    setUploadProgress([]);
    setTotalProgress(0);
  }, []);

  return {
    uploadFiles,
    isUploading,
    uploadProgress,
    totalProgress,
    resetProgress,
  };
}
