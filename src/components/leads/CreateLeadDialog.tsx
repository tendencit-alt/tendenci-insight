import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { FormSaveIndicator } from "@/components/ui/FormSaveIndicator";
import { validateAndShowErrors, formatDatabaseError, ValidationRule, ValidationPatterns, ValidationMessages } from "@/lib/formValidation";

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (lead?: any) => void;
}

export function CreateLeadDialog({ open, onOpenChange, onSuccess }: CreateLeadDialogProps) {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [responsaveis, setResponsaveis] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData, clearPersistedData, hasRestoredData] = useFormPersistence(
    'create-lead-form',
    {
      name: "",
      phone: "",
      email: "",
      source: "",
      message: "",
      interest: "",
      responsible: ""
    },
    open
  );

  useEffect(() => {
    fetchResponsaveis();
  }, []);

  const fetchResponsaveis = async () => {
    const { data, error } = await supabase
      .from('architects')
      .select('id, name')
      .order('name');
    
    if (!error && data) {
      setResponsaveis(data);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(file => {
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
        
        if (!validTypes.includes(file.type)) {
          toast.error(`Arquivo "${file.name}" não é suportado. Use PNG, JPG ou PDF.`);
          return false;
        }
        
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`Arquivo "${file.name}" é muito grande. Máximo 20MB.`);
          return false;
        }
        
        console.log('Arquivo validado:', file.name, file.type, (file.size / 1024).toFixed(2) + ' KB');
        return true;
      });
      
      if (newFiles.length > 0) {
        setFiles(prev => [...prev, ...newFiles]);
        toast.success(`${newFiles.length} arquivo(s) selecionado(s)`);
      }
      
      // Reset input para permitir selecionar o mesmo arquivo novamente
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação com mensagens detalhadas
    const validationRules: ValidationRule[] = [
      { field: "name", label: "Nome", required: true, minLength: 2 },
      { field: "phone", label: "Telefone/WhatsApp", required: true, pattern: ValidationPatterns.phone, patternMessage: ValidationMessages.phone },
    ];

    // Validar email se preenchido
    if (formData.email) {
      validationRules.push({
        field: "email",
        label: "E-mail",
        pattern: ValidationPatterns.email,
        patternMessage: ValidationMessages.email,
      });
    }

    if (!validateAndShowErrors(formData, validationRules)) {
      return;
    }

    setLoading(true);
    console.log('=== INICIANDO CRIAÇÃO DE LEAD ===');
    console.log('Dados do formulário:', formData);
    console.log('Arquivos anexados:', files.length);

    try {
      // First create client
      console.log('1. Criando cliente...');
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .insert({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email ? formData.email.trim() : null
        })
        .select()
        .maybeSingle();

      if (clientError) {
        console.error('❌ Erro ao criar cliente:', clientError);
        const errorMsg = formatDatabaseError(clientError);
        throw new Error(errorMsg);
      }

      console.log('✅ Cliente criado com sucesso:', clientData.id);

      // Then create lead
      console.log('2. Criando lead...');
      const { data: leadData, error: leadError } = await supabase
        .from("leads")
        .insert({
          client_id: clientData.id,
          status: "novo",
          utm_source: formData.source || null,
          architect_id: formData.responsible || null
        })
        .select()
        .maybeSingle();

      if (leadError) {
        console.error('❌ Erro ao criar lead:', leadError);
        throw new Error(`Erro ao criar lead: ${leadError.message}`);
      }

      console.log('✅ Lead criado com sucesso:', leadData.id);

      // Upload files if any
      if (files.length > 0) {
        console.log(`3. Fazendo upload de ${files.length} arquivo(s)...`);
        setUploadProgress(`Fazendo upload de ${files.length} arquivo(s)...`);
        
        let uploadedCount = 0;
        let successCount = 0;
        
        for (const file of files) {
          uploadedCount++;
          setUploadProgress(`Fazendo upload ${uploadedCount}/${files.length}: ${file.name}`);
          
          const fileExt = file.name.split('.').pop();
          const fileName = `${leadData.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          console.log(`  → Fazendo upload: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('lead-attachments')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('  ❌ Erro ao fazer upload:', uploadError);
            toast.error(`Erro ao fazer upload de ${file.name}`);
            continue;
          }

          console.log('  ✅ Upload realizado:', uploadData.path);

          // Save attachment record
          const { error: attachmentError } = await supabase
            .from('lead_attachments')
            .insert({
              lead_id: leadData.id,
              file_name: file.name,
              file_path: fileName,
              file_type: file.type,
              file_size: file.size
            });

          if (attachmentError) {
            console.error('  ❌ Erro ao registrar anexo:', attachmentError);
            toast.error(`Erro ao registrar anexo ${file.name}`);
          } else {
            console.log('  ✅ Anexo registrado no banco');
            successCount++;
          }
        }
        
        console.log(`✅ Upload concluído: ${successCount}/${files.length} arquivo(s)`);
        setUploadProgress('');
      }

      console.log('=== LEAD CRIADO COM SUCESSO ===');
      toast.success("Lead criado com sucesso!");
      
      clearPersistedData();
      onSuccess?.(leadData);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: "",
        phone: "",
        email: "",
        source: "",
        message: "",
        interest: "",
        responsible: ""
      });
      setFiles([]);
      setUploadProgress("");
      
    } catch (error: any) {
      console.error('=== ERRO GERAL ===', error);
      toast.error(error.message || "Erro ao criar lead");
    } finally {
      setLoading(false);
      setUploadProgress("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Novo Lead</DialogTitle>
        </DialogHeader>

        <FormSaveIndicator hasRestoredData={hasRestoredData} className="mb-4" />

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Origem *</Label>
              <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WhatsApp IA">WhatsApp IA</SelectItem>
                  <SelectItem value="Meta Ads">Meta Ads</SelectItem>
                  <SelectItem value="Indicação">Indicação</SelectItem>
                  <SelectItem value="Orgânico">Orgânico</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsible">Responsável</Label>
              <Select value={formData.responsible} onValueChange={(v) => setFormData({ ...formData, responsible: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {responsaveis.map((resp) => (
                    <SelectItem key={resp.id} value={resp.id}>
                      {resp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interest">Interesse</Label>
            <Select value={formData.interest} onValueChange={(v) => setFormData({ ...formData, interest: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o interesse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mesa Maciça">Mesa Maciça</SelectItem>
                <SelectItem value="Planejado">Planejado</SelectItem>
                <SelectItem value="Cadeira Náutica">Cadeira Náutica</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem Inicial / Conversas WhatsApp</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Digite a mensagem inicial do lead ou integre com WhatsApp para ver conversas anteriores..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              💬 Este campo pode ser integrado com WhatsApp para carregar conversas automaticamente
            </p>
          </div>

          <div className="space-y-3">
            <Label>Anexos (PNG, JPG, PDF - Máx. 20MB)</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Selecionar Arquivos
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/jpg,application/pdf,.doc,.docx,.xls,.xlsx,.dwg"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((file, index) => (
                  <Badge key={index} variant="secondary" className="gap-2 py-1.5 px-3">
                    <span className="max-w-[200px] truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="ml-1 hover:text-destructive"
                      disabled={loading}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              📎 Formatos aceitos: PNG, JPG, PDF • Tamanho máximo: 20MB por arquivo
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (uploadProgress || "Salvando...") : "Salvar"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
