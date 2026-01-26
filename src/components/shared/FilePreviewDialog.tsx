import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    file_name: string;
    file_path: string;
    file_type?: string;
  } | null;
  bucket: "project-files" | "crm-files";
  onDownload?: () => void;
}

const isPreviewable = (fileName: string, fileType?: string): "image" | "pdf" | false => {
  const ext = fileName.toLowerCase().split('.').pop();
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
  
  if (imageExtensions.includes(ext || '')) return "image";
  if (ext === 'pdf' || fileType?.includes('pdf')) return "pdf";
  return false;
};

export const FilePreviewDialog = ({
  open,
  onOpenChange,
  file,
  bucket,
  onDownload,
}: FilePreviewDialogProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = async () => {
    if (!file) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: urlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(file.file_path, 300); // 5 minutos para visualização

      if (urlError) throw urlError;
      setPreviewUrl(data.signedUrl);
    } catch (err: any) {
      console.error('Erro ao carregar preview:', err);
      setError('Não foi possível carregar a pré-visualização.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && file) {
      loadPreview();
    } else {
      setPreviewUrl(null);
      setError(null);
    }
    onOpenChange(isOpen);
  };

  const previewType = file ? isPreviewable(file.file_name, file.file_type) : false;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between pr-8">
            <span className="truncate max-w-md">{file?.file_name || "Pré-visualização"}</span>
            <div className="flex gap-2">
              {previewUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(previewUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Abrir
                </Button>
              )}
              {onDownload && (
                <Button variant="default" size="sm" onClick={onDownload}>
                  <Download className="h-4 w-4 mr-1" />
                  Baixar
                </Button>
              )}
            </div>
          </DialogTitle>
          <VisuallyHidden.Root>
            <DialogDescription>
              Pré-visualização do arquivo {file?.file_name}
            </DialogDescription>
          </VisuallyHidden.Root>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto bg-muted/30 rounded-lg flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-2 p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Carregando...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <X className="h-8 w-8 text-destructive" />
              <span className="text-sm text-muted-foreground">{error}</span>
            </div>
          ) : previewUrl ? (
            previewType === "image" ? (
              <img
                src={previewUrl}
                alt={file?.file_name}
                className="max-w-full max-h-[70vh] object-contain"
              />
            ) : previewType === "pdf" ? (
              <iframe
                src={previewUrl}
                className="w-full h-[70vh] border-0"
                title={file?.file_name}
              />
            ) : null
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { isPreviewable };
