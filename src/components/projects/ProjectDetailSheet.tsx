import { useEffect, useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Image as ImageIcon, Download, Upload, X, Loader2, Edit, Calculator, Info, History, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useWebhookSync } from "@/hooks/useWebhookSync";
import { EditProjectDialog } from "./EditProjectDialog";
import { ProjectNotes } from "./ProjectNotes";
import { usePermissions } from "@/hooks/usePermissions";
import { ProjectBudgetTab } from "@/components/budgets/ProjectBudgetTab";
import { FilePreviewDialog, isPreviewable } from "@/components/shared/FilePreviewDialog";
import { 
  validateFileType, 
  validateFileSize, 
  formatFileSize,
  ALLOWED_FILE_TYPES_ACCEPT,
  MAX_FILE_SIZE_MB 
} from "@/lib/utils";

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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { notifyFileUploaded, notifyStageChanged } = useWebhookSync();
  const { hasModuleAccess } = usePermissions();

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
      // Fetch user names for each history entry
      const userIds = [...new Set(data.filter(e => e.created_by).map(e => e.created_by))];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
        
        const historyWithUsers = data.map(event => ({
          ...event,
          user_name: event.created_by ? profileMap.get(event.created_by) : null
        }));
        
        setHistory(historyWithUsers);
      } else {
        setHistory(data);
      }
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
    
    // Validar tipo de arquivo usando utils
    if (!validateFileType(file.name)) {
      toast.error("Tipo de arquivo não permitido. Formatos aceitos: PDF, DOC, DOCX, XLS, XLSX, DWG, JPG, PNG, WEBP, TXT, MP3, WAV, M4A, WEBM, OGG");
      e.target.value = "";
      return;
    }

    // Validar tamanho usando utils
    if (!validateFileSize(file.size)) {
      toast.error(`Arquivo muito grande. Máximo ${MAX_FILE_SIZE_MB}MB`);
      e.target.value = "";
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${project.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      console.log('📤 Fazendo upload:', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        extension: fileExt
      });

      // Retry lógica: até 3 tentativas
      let uploadError;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { error } = await supabase.storage
          .from('project-files')
          .upload(fileName, file, {
            contentType: file.type || 'application/octet-stream',
            upsert: false
          });
        
        uploadError = error;
        if (!error) break;
        
        console.error(`Tentativa ${attempt + 1} falhou:`, error);
        
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }

      if (uploadError) {
        console.error('❌ Erro no upload após 3 tentativas:', uploadError);
        throw uploadError;
      }

      const { error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id: project.id,
          file_name: file.name,
          file_path: fileName,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user.id
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
      console.log('📥 Iniciando download:', file.file_name, file.file_path);
      
      // Criar URL assinada - Supabase retorna URL completa
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.file_path, 60);

      if (error) {
        console.error('❌ Erro ao criar URL assinada:', error);
        throw error;
      }

      console.log('✅ URL assinada criada com sucesso');

      // A URL já vem completa do Supabase, usar diretamente com tag <a>
      // Isso evita problemas de CORS que podem ocorrer com fetch()
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = file.file_name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download iniciado!');
    } catch (error: any) {
      console.error('❌ Erro ao baixar arquivo:', error);
      
      // Tentar fallback com download direto (método alternativo)
      try {
        console.log('🔄 Tentando download direto como fallback...');
        const { data, error: downloadError } = await supabase.storage
          .from('project-files')
          .download(file.file_path);

        if (downloadError) throw downloadError;

        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.file_name;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Download concluído!');
      } catch (fallbackError) {
        console.error('❌ Fallback também falhou:', fallbackError);
        toast.error('Erro ao baixar arquivo. Verifique suas permissões.');
      }
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

  if (!project) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>Carregando...</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl">Detalhes do Projeto</SheetTitle>
            {hasModuleAccess('configuracoes' as any, 'edit') && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setEditDialogOpen(true)}
                className="gap-2"
              >
                <Edit className="w-4 h-4" />
                Editar Projeto
              </Button>
            )}
          </div>
        </SheetHeader>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="info" className="flex items-center gap-1">
              <Info className="h-4 w-4" />
              Informações
            </TabsTrigger>
            <TabsTrigger value="budget" className="flex items-center gap-1">
              <Calculator className="h-4 w-4" />
              Orçamento
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Arquivos
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6 mt-4">
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
                  <span className="text-sm text-muted-foreground">Parceiro Profissional</span>
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
                        <SelectItem value="em_orcamento">Em Orçamento</SelectItem>
                        <SelectItem value="orcado">Orçado</SelectItem>
                        <SelectItem value="apresentado">Apresentado</SelectItem>
                        <SelectItem value="em_negociacao">Em Negociação</SelectItem>
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
                  <p className="font-medium">R$ {(project.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Prazo</span>
                  <p className="font-medium">
                    {project.deadline ? new Date(project.deadline).toLocaleDateString('pt-BR') : "Sem prazo"}
                  </p>
                </div>
              </div>
            </Card>

            {/* Orçamentos simples antigos */}
            {quotes.length > 0 && (
              <Card className="p-6 space-y-4">
                <h3 className="font-semibold text-lg">Orçamentos Simples</h3>
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
                        <TableCell>R$ {(quote.unit_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="font-semibold">R$ {(quote.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}

            {/* Observações do Projeto */}
            <ProjectNotes projectId={project.id} />
          </TabsContent>

          <TabsContent value="budget" className="mt-4">
            <ProjectBudgetTab projectId={project.id} />
          </TabsContent>

          <TabsContent value="files" className="space-y-4 mt-4">

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
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Adicionar
                    </>
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_FILE_TYPES_ACCEPT}
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
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatFileSize(file.file_size)}</span>
                            {file.uploaded_at && (
                              <>
                                <span>•</span>
                                <span>{new Date(file.uploaded_at).toLocaleDateString('pt-BR')}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {isPreviewable(file.file_name, file.file_type) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setPreviewFile(file);
                                setPreviewOpen(true);
                              }}
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => downloadFile(file)}
                            title="Baixar"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteFile(file)}
                            className="text-destructive hover:text-destructive"
                            title="Excluir"
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
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {/* Histórico */}
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold text-lg">Histórico do Projeto</h3>
              {history.length > 0 ? (
                <div className="space-y-4">
                  {history.map((event: any) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{event.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: ptBR })}</span>
                          {event.user_name && (
                            <>
                              <span>•</span>
                              <span className="font-medium">{event.user_name}</span>
                            </>
                          )}
                        </div>
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
                      {project.created_at 
                        ? formatDistanceToNow(new Date(project.created_at), { addSuffix: true, locale: ptBR })
                        : 'Data não disponível'}
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>

      {/* Edit Dialog */}
      <EditProjectDialog 
        project={project} 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen}
        onSuccess={() => {
          fetchProjectData();
          onSuccess?.();
        }}
      />

      {/* File Preview Dialog */}
      <FilePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        file={previewFile}
        bucket="project-files"
        onDownload={() => previewFile && downloadFile(previewFile)}
      />
    </Sheet>
  );
}
