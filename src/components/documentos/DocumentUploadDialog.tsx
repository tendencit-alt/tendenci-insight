import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

const MODULES = [
  { value: "comercial", label: "Comercial" },
  { value: "financeiro", label: "Financeiro" },
  { value: "operacional", label: "Operacional" },
  { value: "estrutural", label: "Estrutural" },
  { value: "producao", label: "Produção" },
  { value: "aprovacao", label: "Aprovação" },
];

const DOC_TYPES = [
  { value: "fiscal", label: "Fiscal" },
  { value: "financeiro", label: "Financeiro" },
  { value: "contratual", label: "Contratual" },
  { value: "operacional", label: "Operacional" },
  { value: "comercial", label: "Comercial" },
  { value: "comprovante", label: "Comprovante" },
  { value: "imagem", label: "Imagem" },
  { value: "arquivo_tecnico", label: "Arquivo Técnico" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultModule?: string;
  defaultEntityTable?: string;
  defaultEntityId?: string;
}

export function DocumentUploadDialog({ open, onOpenChange, onSuccess, defaultModule, defaultEntityTable, defaultEntityId }: Props) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    module: defaultModule || "financeiro",
    document_type: "fiscal",
    entity_table: defaultEntityTable || "",
    entity_id: defaultEntityId || "",
    notes: "",
  });

  const handleUpload = async () => {
    if (!file || !user) {
      toast.error("Selecione um arquivo");
      return;
    }
    if (!form.entity_table || !form.entity_id) {
      toast.error("Informe a entidade vinculada");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}_${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("erp-documents")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("erp_documents").insert({
        module: form.module,
        document_type: form.document_type,
        entity_table: form.entity_table,
        entity_id: form.entity_id,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
        notes: form.notes || null,
      });
      if (insertError) throw insertError;

      toast.success("Documento anexado com sucesso!");
      onSuccess();
      onOpenChange(false);
      setFile(null);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anexar Documento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Arquivo *</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            {file && <p className="text-xs text-muted-foreground">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Módulo *</Label>
              <Select value={form.module} onValueChange={(v) => setForm({ ...form, module: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MODULES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo *</Label>
              <Select value={form.document_type} onValueChange={(v) => setForm({ ...form, document_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tabela Entidade *</Label>
              <Input value={form.entity_table} onChange={(e) => setForm({ ...form, entity_table: e.target.value })} placeholder="orders, fin_payables..." />
            </div>
            <div className="space-y-1">
              <Label>ID Entidade *</Label>
              <Input value={form.entity_id} onChange={(e) => setForm({ ...form, entity_id: e.target.value })} placeholder="UUID do registro" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Observações sobre o documento..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
