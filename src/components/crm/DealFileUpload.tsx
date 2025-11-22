import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, File, X, Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DealFileUploadProps {
  dealId: string;
  files: any[];
  onFilesChange: () => void;
}

export function DealFileUpload({ dealId, files, onFilesChange }: DealFileUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 20MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Upload para o storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${dealId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("deal-files")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Registrar no banco
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

      if (dbError) throw dbError;

      toast({
        title: "Arquivo enviado",
        description: "O arquivo foi anexado com sucesso",
      });

      onFilesChange();
      e.target.value = "";
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast({
        title: "Erro ao enviar arquivo",
        description: "Não foi possível anexar o arquivo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
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
      console.error("Erro ao baixar arquivo:", error);
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
      console.error("Erro ao deletar arquivo:", error);
      toast({
        title: "Erro ao remover arquivo",
        description: "Não foi possível remover o arquivo",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
            onChange={handleFileUpload}
            disabled={uploading}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.jpg,.jpeg,.png,.webp,.txt"
          />
          {uploading && (
            <Button disabled size="sm">
              <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Formatos aceitos: PDF, DOC, DOCX, XLS, XLSX, DWG, JPG, PNG, WEBP, TXT (máx. 20MB)
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
