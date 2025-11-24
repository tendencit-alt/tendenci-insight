import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { FormSaveIndicator } from "@/components/ui/FormSaveIndicator";

interface CreateArchitectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (architectId?: string) => void;
}

export function CreateArchitectDialog({ open, onOpenChange, onSuccess }: CreateArchitectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData, clearPersistedData, hasRestoredData] = useFormPersistence(
    'create-architect-form',
    {
      name: "",
      company: "",
      phone: "",
      email: "",
      birthday: "",
      categoria: "metropolitano",
      ja_contactado: false,
      data_primeiro_contato: "",
      data_ultimo_contato: ""
    },
    open
  );


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (!formData.phone) {
      toast.error("WhatsApp é obrigatório");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("architects")
        .insert({
          name: formData.name,
          company: formData.company || null,
          phone: formData.phone,
          email: formData.email || null,
          birthday: formData.birthday || null,
          categoria: formData.categoria,
          active: true,
          data_primeiro_contato: formData.ja_contactado && formData.data_primeiro_contato 
            ? formData.data_primeiro_contato 
            : null,
          data_ultimo_contato: formData.ja_contactado && formData.data_ultimo_contato 
            ? formData.data_ultimo_contato 
            : null,
          status_funil: formData.ja_contactado ? "contato_iniciado" : "novo_arquiteto"
        })
        .select()
        .maybeSingle();

      if (error) throw error;

      toast.success("Arquiteto criado com sucesso!");
      
      clearPersistedData();
      onSuccess(data?.id);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: "",
        company: "",
        phone: "",
        email: "",
        birthday: "",
        categoria: "metropolitano",
        ja_contactado: false,
        data_primeiro_contato: "",
        data_ultimo_contato: ""
      });
      
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar arquiteto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (e.target instanceof Element && (
            e.target.closest('[role="dialog"]') || 
            e.target.closest('[role="listbox"]') ||
            e.target.closest('.react-day-picker')
          )) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">Novo Arquiteto</DialogTitle>
        </DialogHeader>

        <FormSaveIndicator hasRestoredData={hasRestoredData} className="mb-4" />

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">Nome do Arquiteto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Nome da empresa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(11) 99999-9999"
                required
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="categoria">Categoria *</Label>
              <Select
                value={formData.categoria}
                onValueChange={(value) => setFormData({ ...formData, categoria: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="metropolitano">Metropolitano</SelectItem>
                  <SelectItem value="captado">Captado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="birthday">Data de Nascimento</Label>
              <Input
                id="birthday"
                type="date"
                value={formData.birthday}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
              />
            </div>
          </div>

          {/* Seção de Contato */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ja_contactado" className="text-base">Já foi contactado?</Label>
                <p className="text-sm text-muted-foreground">Marque se este arquiteto já teve contato com a empresa</p>
              </div>
              <Switch
                id="ja_contactado"
                checked={formData.ja_contactado}
                onCheckedChange={(checked) => setFormData({ 
                  ...formData, 
                  ja_contactado: checked,
                  data_primeiro_contato: checked ? formData.data_primeiro_contato : "",
                  data_ultimo_contato: checked ? formData.data_ultimo_contato : ""
                })}
              />
            </div>

            {formData.ja_contactado && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="data_primeiro_contato">Data do Primeiro Contato</Label>
                  <Input
                    id="data_primeiro_contato"
                    type="date"
                    value={formData.data_primeiro_contato}
                    onChange={(e) => setFormData({ ...formData, data_primeiro_contato: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_ultimo_contato">Data do Último Contato (Opcional)</Label>
                  <Input
                    id="data_ultimo_contato"
                    type="date"
                    value={formData.data_ultimo_contato}
                    onChange={(e) => setFormData({ ...formData, data_ultimo_contato: e.target.value })}
                  />
                </div>
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
