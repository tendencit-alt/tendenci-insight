import { useEffect, useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Image as ImageIcon, Download, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useWebhookSync } from "@/hooks/useWebhookSync";

interface ProjectDetailSheetProps {
  project: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ProjectDetailSheet({ project, open, onOpenChange, onSuccess }: ProjectDetailSheetProps) {
  const [files, setFiles] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentStage, setCurrentStage] = useState(project?.stage || "recebido");
  const [originalStage, setOriginalStage] = useState(project?.stage || "recebido");
  const [savingStage, setSavingStage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { notifyFileUploaded, notifyStageChanged } = useWebhookSync();

  useEffect(() => {
    if (open && project) {
      setCurrentStage(project.stage || "recebido");
      setOriginalStage(project.stage || "recebido");
      fetchProjectData();
    }
  }, [open, project]);

  const fetchProjectData = async () => {
    setLoading(true);
    await Promise.all([
      fetchFiles(),
      fetchQuotes(),
      fetchHistory()
    ]);
    setLoading(false);
  };

  const fetchFiles = async () => {
    const { data, error } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', project.id)
      .order('uploaded_at', { ascending: false });

    if (!error && data) {
      setFiles(data);
    }
  };

  const fetchQuotes = async () => {
    const { data, error } = await supabase
      .from('project_quotes')
      .select('*')
      .eq('project_id', project.id);

    if (!error && data) {
      setQuotes(data);
    }
  };

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('project_history')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setHistory(data);
    }
  };

  const handleSaveStage = async () => {
    setSavingStage(true);
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({ stage: currentStage })
        .eq('id', project.id);

      if (error) throw error;

      setOriginalStage(currentStage);
      
      // Notificar webhook
      notifyStageChanged(project, originalStage, currentStage);
      
      toast.success("Estágio atualizado com sucesso!");
      
      // Recarregar histórico para mostrar a mudança
      fetchHistory();
      
      // Chamar callback para atualizar a lista
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar estágio");
    } finally {
      setSavingStage(false);
    }
  };

  const stageChanged = currentStage !== originalStage;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    
    if (!validTypes.includes(file.type)) {
      toast.error("Tipo de arquivo não suportado. Use PDF, PNG ou JPG.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 20MB.");
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${project.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id: project.id,
          file_name: file.name,
          file_path: fileName,
          file_type: file.type,
          file_size: file.size
        });

      if (dbError) throw dbError;

      // Notificar webhook n8n (se configurado)
      notifyFileUploaded(project, file.name);

      toast.success("Arquivo enviado com sucesso!");
      fetchFiles();
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar arquivo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadFile = async (file: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error('Erro ao baixar arquivo');
    }
  };

  const deleteFile = async (file: any) => {
    try {
      await supabase.storage
        .from('project-files')
        .remove([file.file_path]);

      await supabase
        .from('project_files')
        .delete()
        .eq('id', file.id);

      toast.success("Arquivo removido!");
      fetchFiles();
    } catch (error: any) {
      toast.error('Erro ao remover arquivo');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-full sm:max-w-3xl overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (e.target instanceof Element && e.target.closest('[role="dialog"]')) {
            e.preventDefault();
          }
        }}
      >
        <SheetHeader>
          <SheetTitle className="text-2xl">Detalhes do Projeto</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Info Card */}
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-lg">Informações Gerais</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Projeto</span>
                <p className="font-medium">{project.name || "Sem título"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Cliente</span>
                <p className="font-medium">{project.client?.name || "N/A"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Arquiteto</span>
                <p className="font-medium">{project.architect?.name || "Não atribuído"}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Estágio</Label>
                <div className="flex gap-2">
                  <Select value={currentStage} onValueChange={setCurrentStage}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recebido">Recebido</SelectItem>
                      <SelectItem value="em_desenvolvimento">Em Desenvolvimento</SelectItem>
                      <SelectItem value="aguardando_aprovacao">Aguardando Aprovação</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="perdido">Perdido</SelectItem>
                    </SelectContent>
                  </Select>
                  {stageChanged && (
                    <Button 
                      onClick={handleSaveStage} 
                      disabled={savingStage}
                      size="sm"
                    >
                      {savingStage ? "Salvando..." : "Salvar"}
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Valor</span>
                <p className="font-medium">R$ {project.value?.toLocaleString('pt-BR') || "0"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Prazo</span>
                <p className="font-medium">
                  {project.deadline ? new Date(project.deadline).toLocaleDateString('pt-BR') : "Sem prazo"}
                </p>
              </div>
            </div>
          </Card>

          {/* Orçamentos */}
          {quotes.length > 0 && (
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold text-lg">Orçamentos Detalhados</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Valor Unit.</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell>{quote.item}</TableCell>
                      <TableCell>{quote.quantity}</TableCell>
                      <TableCell>R$ {quote.unit_price?.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="font-semibold">R$ {quote.total?.toLocaleString('pt-BR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Arquivos */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Arquivos do Projeto ({files.length})
              </h3>
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                {uploading ? "Enviando..." : "Adicionar"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.dwg"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {files.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      {file.file_type.includes('pdf') ? (
                        <FileText className="w-8 h-8 text-red-500" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-blue-500" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.file_size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => downloadFile(file)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteFile(file)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum arquivo anexado
              </p>
            )}
          </Card>

          {/* Histórico */}
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-lg">Histórico do Projeto</h3>
            {history.length > 0 ? (
              <div className="space-y-4">
                {history.map((event) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{event.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Projeto criado no sistema</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(project.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
