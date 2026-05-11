import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useWebhookSync } from "@/hooks/useWebhookSync";
import { Upload, X, FileText, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CreateClientDialog } from "@/components/crm/CreateClientDialog";
import { CreateArchitectDialog } from "@/components/architects/CreateArchitectDialog";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { FormSaveIndicator } from "@/components/ui/FormSaveIndicator";
import { validateFileType, validateFileSize, ALLOWED_FILE_TYPES_ACCEPT, MAX_FILE_SIZE_MB, formatFileSize } from "@/lib/utils";
import { validateAndShowErrors, formatDatabaseError, ValidationRule } from "@/lib/formValidation";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preSelectedArchitectId?: string | null;
}

export function CreateProjectDialog({ open, onOpenChange, onSuccess, preSelectedArchitectId }: CreateProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [architects, setArchitects] = useState<any[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);
  const [isCreateArchitectOpen, setIsCreateArchitectOpen] = useState(false);
  const { notifyProjectCreated } = useWebhookSync();
  const [formData, setFormData, clearPersistedData, hasRestoredData] = useFormPersistence(
    `create-project-form-${preSelectedArchitectId || 'new'}`,
    {
      name: "",
      client_id: "",
      architect_id: preSelectedArchitectId || "",
      stage: "recebido",
      value: "",
      deadline: "",
      notes: ""
    },
    open
  );

  useEffect(() => {
    if (open) {
      fetchLeads();
      fetchArchitects();
      // Pré-selecionar profissional parceiro se fornecido
      if (preSelectedArchitectId) {
        setFormData(prev => ({ ...prev, architect_id: preSelectedArchitectId }));
      }
    }
  }, [open, preSelectedArchitectId]);

  const fetchLeads = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name')
      .order('name');
    
    if (!error && data) {
      setLeads(data);
    }
  };

  const fetchArchitects = async () => {
    const { data, error } = await supabase
      .from('architects')
      .select('id, name')
      .order('name');
    
    if (!error && data) {
      // Filtrar apenas profissionais parceiros (não vendedores)
      setArchitects(data);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles: File[] = [];
      
      for (const file of newFiles) {
        // Validar tipo de arquivo
        if (!validateFileType(file.name)) {
          toast.error(`Arquivo "${file.name}" possui tipo não permitido`);
          continue;
        }
        
        // Validar tamanho do arquivo (100MB)
        if (!validateFileSize(file.size)) {
          toast.error(`Arquivo "${file.name}" excede o tamanho máximo de ${MAX_FILE_SIZE_MB}MB. Tamanho: ${formatFileSize(file.size)}`);
          continue;
        }
        
        validFiles.push(file);
      }
      
      if (validFiles.length > 0) {
        console.log('📁 Arquivos válidos selecionados:', validFiles.map(f => ({
          name: f.name,
          type: f.type,
          size: f.size
        })));
        setFiles(prev => [...prev, ...validFiles]);
        toast.success(`${validFiles.length} arquivo(s) válido(s) selecionado(s)`);
      }
    }
  };

  const handleFileRemove = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (projectId: string) => {
    if (files.length === 0) return;

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();

    for (const file of files) {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      console.log('📤 Upload de arquivo do projeto:', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        extension: fileExt
      });
      
      try {
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(fileName, file, {
            contentType: file.type || 'application/octet-stream',
            upsert: false
          });

        if (uploadError) {
          console.error('❌ Erro no upload:', uploadError);
          throw uploadError;
        }

        await supabase.from('project_files').insert({
          project_id: projectId,
          file_name: file.name,
          file_path: fileName,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user?.id
        });
      } catch (error: any) {
        console.error('❌ Erro detalhado ao fazer upload:', {
          file: file.name,
          error: error,
          message: error.message,
          details: error.details
        });
        toast.error(`Erro ao enviar ${file.name}: ${error.message || 'Erro desconhecido'}`);
      }
    }

    setUploading(false);
  };

  const handleClientCreated = async (newClient: any) => {
    await fetchLeads();
    setFormData(prev => ({ ...prev, client_id: newClient.id }));
    setIsCreateClientOpen(false);
  };

  const handleArchitectCreated = async (newArchitect: any) => {
    await fetchArchitects();
    setFormData(prev => ({ ...prev, architect_id: newArchitect.id }));
    setIsCreateArchitectOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação com mensagens detalhadas
    const validationRules: ValidationRule[] = [
      { field: "name", label: "Nome do Projeto", required: true, minLength: 2 },
      { field: "client_id", label: "Cliente", required: true },
    ];

    if (!validateAndShowErrors(formData, validationRules)) {
      return;
    }

    if (files.length === 0) {
      toast.error("Arquivo obrigatório", {
        description: "É obrigatório anexar pelo menos um arquivo para criar o projeto.",
      });
      return;
    }

    setLoading(true);

    try {
      // Upload do arquivo para o cliente primeiro
      const { data: { user } } = await supabase.auth.getUser();
      const clientFile = files[0];
      const fileExt = clientFile.name.split('.').pop();
      const clientFileName = `${formData.client_id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('client-files')
        .upload(clientFileName, clientFile);

      if (uploadError) throw uploadError;

      // Atualizar cliente com referência ao arquivo
      const { error: clientError } = await supabase
        .from('clients')
        .update({
          attachment_path: clientFileName,
          attachment_name: clientFile.name,
          attachment_type: clientFile.type
        })
        .eq('id', formData.client_id);

      if (clientError) throw clientError;

      // Criar projeto
      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: formData.name,
          client_id: formData.client_id && formData.client_id !== 'none' ? formData.client_id : null,
          architect_id: formData.architect_id && formData.architect_id !== 'sem-arquiteto' ? formData.architect_id : null,
          stage: formData.stage,
          value: formData.value ? parseFloat(formData.value) : 0,
          deadline: formData.deadline || null,
          notes: formData.notes || null
        })
        .select()
        .maybeSingle();

      if (error) throw error;

      // SYNC: Se houver observações, salvar também na tabela project_notes
      if (data && formData.notes?.trim()) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("project_notes").insert({
          project_id: data.id,
          message: formData.notes,
          author_id: user?.id
        });
      }

      // Upload de arquivos adicionais do projeto
      if (data && files.length > 0) {
        await uploadFiles(data.id);
      }

      // Notificar webhook n8n (se configurado)
      if (data) {
        notifyProjectCreated(data);
      }

      toast.success("Projeto criado com sucesso!");
      
      clearPersistedData();
      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: "",
        client_id: "",
        architect_id: "",
        stage: "recebido",
        value: "",
        deadline: "",
        notes: ""
      });
      setFiles([]);
      
    } catch (error: any) {
      const errorMsg = formatDatabaseError(error);
      toast.error("Erro ao criar projeto", {
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Novo Projeto</DialogTitle>
          </DialogHeader>

          <FormSaveIndicator hasRestoredData={hasRestoredData} className="mb-4" />

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="name">Nome do Projeto *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ex: Mesa Maciça Família Silva"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client">Cliente *</Label>
                <div className="flex gap-2">
                  <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {leads.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsCreateClientOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="architect">Profissional Parceiro</Label>
                <div className="flex gap-2">
                  <Select value={formData.architect_id} onValueChange={(v) => setFormData({ ...formData, architect_id: v })}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione o profissional parceiro" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="sem-arquiteto">Cliente sem profissional parceiro</SelectItem>
                      {architects.map((arch) => (
                        <SelectItem key={arch.id} value={arch.id}>
                          {arch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsCreateArchitectOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stage">Estágio *</Label>
                <Select value={formData.stage} onValueChange={(v) => setFormData({ ...formData, stage: v })}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione o estágio" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="recebido">Recebido</SelectItem>
                    <SelectItem value="em_orcamento">Em Orçamento</SelectItem>
                    <SelectItem value="orcado">Orçado</SelectItem>
                    <SelectItem value="apresentado">Apresentado</SelectItem>
                    <SelectItem value="em_negociacao">Em Negociação</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="perdido">Perdido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">Valor (R$)</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="deadline">Prazo de Entrega</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Anotações sobre o projeto..."
                  rows={3}
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Anexar Arquivos *</Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      className="gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Escolher Arquivos
                    </Button>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept={ALLOWED_FILE_TYPES_ACCEPT}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <span className="text-sm text-muted-foreground">
                      Máx. {MAX_FILE_SIZE_MB}MB - PDF, DOC, Excel, DWG, Imagens, Áudio
                    </span>
                  </div>

                  {files.length > 0 && (
                    <div className="space-y-2">
                      {files.map((file, index) => (
                        <Card key={index} className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-primary" />
                            <div>
                              <p className="text-sm font-medium">{file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFileRemove(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={loading || uploading}>
                {uploading ? "Enviando arquivos..." : loading ? "Salvando..." : "Salvar"}
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading || uploading}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <CreateClientDialog
        open={isCreateClientOpen}
        onOpenChange={setIsCreateClientOpen}
        onSuccess={handleClientCreated}
      />

      <CreateArchitectDialog
        open={isCreateArchitectOpen}
        onOpenChange={setIsCreateArchitectOpen}
        onSuccess={handleArchitectCreated}
      />
    </>
  );
}
