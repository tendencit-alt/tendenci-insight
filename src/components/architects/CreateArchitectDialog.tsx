import { useState, useEffect } from "react";
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
import { Target } from "lucide-react";
import { validateAndShowErrors, formatDatabaseError, ValidationRule, ValidationPatterns, ValidationMessages } from "@/lib/formValidation";

interface CreateArchitectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (architectId?: string) => void;
}

export function CreateArchitectDialog({ open, onOpenChange, onSuccess }: CreateArchitectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [deals, setDeals] = useState<any[]>([]);
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

  // Estado para indicação de oportunidade
  const [hasIndication, setHasIndication] = useState(false);
  const [indication, setIndication] = useState({
    deal_id: "",
    product_type: "",
    value: "",
    notes: ""
  });

  useEffect(() => {
    if (open) {
      fetchDeals();
    }
  }, [open]);

  const fetchDeals = async () => {
    const { data } = await supabase
      .from("crm_deals")
      .select("id, title, lead:leads(client:clients(name))")
      .order("created_at", { ascending: false })
      .limit(50);
    
    setDeals(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação com mensagens detalhadas
    const validationRules: ValidationRule[] = [
      { field: "name", label: "Nome do Profissional Parceiro", required: true, minLength: 2 },
      { field: "phone", label: "WhatsApp", required: true, pattern: ValidationPatterns.phone, patternMessage: ValidationMessages.phone },
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

    // Validar indicação se ativada
    if (hasIndication && (!indication.deal_id || !indication.product_type)) {
      toast.error("Para adicionar indicação, selecione a oportunidade e o tipo de produto", {
        description: "Os campos 'Oportunidade' e 'Tipo de Produto' são obrigatórios para indicações.",
      });
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

      // Salvar indicação se houver
      if (hasIndication && data && indication.deal_id && indication.product_type) {
        const { data: { user } } = await supabase.auth.getUser();
        
        await supabase.from("architect_indications").insert({
          architect_id: data.id,
          deal_id: indication.deal_id,
          product_type: indication.product_type,
          value: indication.value ? Number(indication.value) : null,
          notes: indication.notes || null,
          created_by: user?.id || null,
        });
      }

      toast.success("Profissional Parceiro criado com sucesso!");
      
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
      setHasIndication(false);
      setIndication({ deal_id: "", product_type: "", value: "", notes: "" });
      
    } catch (error: any) {
      const errorMsg = formatDatabaseError(error);
      toast.error("Erro ao criar profissional parceiro", {
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Novo Profissional Parceiro</DialogTitle>
        </DialogHeader>

        <FormSaveIndicator hasRestoredData={hasRestoredData} className="mb-4" />

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">Nome do Profissional Parceiro *</Label>
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
                <p className="text-sm text-muted-foreground">Marque se este profissional parceiro já teve contato com a empresa</p>
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

          {/* Seção de Indicação de Oportunidade */}
          <div className="space-y-4 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-600" />
                <div className="space-y-0.5">
                  <Label htmlFor="has_indication" className="text-base text-amber-800 dark:text-amber-200">
                    Indicação de Oportunidade
                  </Label>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Vincule este arquiteto a uma oportunidade existente
                  </p>
                </div>
              </div>
              <Switch
                id="has_indication"
                checked={hasIndication}
                onCheckedChange={(checked) => {
                  setHasIndication(checked);
                  if (!checked) {
                    setIndication({ deal_id: "", product_type: "", value: "", notes: "" });
                  }
                }}
              />
            </div>

            {hasIndication && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-sm">Oportunidade *</Label>
                  <Select
                    value={indication.deal_id}
                    onValueChange={(value) => setIndication(prev => ({ ...prev, deal_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a oportunidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {deals.map((deal) => (
                        <SelectItem key={deal.id} value={deal.id}>
                          {deal.title}
                          {deal.lead?.client?.name && ` - ${deal.lead.client.name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Tipo de Produto *</Label>
                  <Select
                    value={indication.product_type}
                    onValueChange={(value) => setIndication(prev => ({ ...prev, product_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Sofá", "Poltrona", "Mesa", "Cadeira", "Aparador", "Banqueta", "Rack", "Cristaleira", "Estante", "Vaso", "Quadro", "Chaise", "Personalizado"].map((tp) => (
                        <SelectItem key={tp} value={tp}>{tp}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Valor Estimado (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={indication.value}
                    onChange={(e) => setIndication(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Observações</Label>
                  <Input
                    value={indication.notes}
                    onChange={(e) => setIndication(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Observações da indicação"
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
