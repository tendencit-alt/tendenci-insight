import { useState, useRef } from "react";
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

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateLeadDialog({ open, onOpenChange, onSuccess }: CreateLeadDialogProps) {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    source: "",
    message: "",
    interest: ""
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(file => {
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
          toast.error(`Arquivo ${file.name} não é suportado. Use PNG, JPG ou PDF.`);
          return false;
        }
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`Arquivo ${file.name} é muito grande. Máximo 20MB.`);
          return false;
        }
        return true;
      });
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First create client
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .insert({
          name: formData.name,
          phone: formData.phone,
          email: formData.email
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // Then create lead
      const { data: leadData, error: leadError } = await supabase
        .from("leads")
        .insert({
          client_id: clientData.id,
          status: "novo",
          utm_source: formData.source
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // Upload files if any
      if (files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${leadData.id}/${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('lead-attachments')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Error uploading file:', uploadError);
            continue;
          }

          // Save attachment record
          await supabase.from('lead_attachments').insert({
            lead_id: leadData.id,
            file_name: file.name,
            file_path: fileName,
            file_type: file.type,
            file_size: file.size
          });
        }
      }

      toast.success("Lead criado com sucesso!");
      onSuccess?.();
      onOpenChange(false);
      setFormData({
        name: "",
        phone: "",
        email: "",
        source: "",
        message: "",
        interest: ""
      });
      setFiles([]);
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Novo Lead</DialogTitle>
        </DialogHeader>

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
                accept="image/png,image/jpeg,image/jpg,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((file, index) => (
                  <Badge key={index} variant="secondary" className="gap-2 py-1.5 px-3">
                    {file.name}
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
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
