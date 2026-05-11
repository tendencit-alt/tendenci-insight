import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { Loader2, Search } from "lucide-react";
import { toast as sonnerToast } from "sonner";

const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

interface CreateClientFromArchitectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  architectId: string;
  architectName: string;
  onSuccess?: () => void;
}

export function CreateClientFromArchitectDialog({
  open,
  onOpenChange,
  architectId,
  architectName,
  onSuccess,
}: CreateClientFromArchitectDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  
  // Use session persistence for form data
  const [formData, setFormData, clearFormData] = useFormPersistence('create-client-architect-form', {
    name: "",
    phone: "",
    email: "",
    cpf_cnpj: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    city: "",
    state: "",
    boleto_status: "",
    notes: "",
  });

  // Clear form data on successful submission
  useEffect(() => {
    if (!open) {
      // Don't clear when closing - only clear on successful submit
      return;
    }
  }, [open]);

  const formatCpfCnpj = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 11) {
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  };

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length > 5) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    return digits;
  };

  const handleCepSearch = async () => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length !== 8) {
      sonnerToast.error('CEP inválido');
      return;
    }

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        sonnerToast.error('CEP não encontrado');
        return;
      }

      setFormData({
        ...formData,
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
      });

      sonnerToast.success('Endereço preenchido automaticamente');
    } catch (error) {
      sonnerToast.error('Erro ao buscar CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Criar cliente
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert({
          name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          cpf_cnpj: formData.cpf_cnpj || null,
          cep: formData.cep || null,
          logradouro: formData.logradouro || null,
          numero: formData.numero || null,
          complemento: formData.complemento || null,
          bairro: formData.bairro || null,
          city: formData.city || null,
          state: formData.state || null,
          boleto_status: formData.boleto_status || null,
          notes: formData.notes || null,
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // 2. Criar lead vinculado ao cliente e profissional parceiro
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .insert({
          client_id: client.id,
          architect_id: architectId,
          status: "novo",
          temperature: "frio",
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // 3. Buscar todos os pipelines e suas stages "Lead"
      const { data: pipelines } = await supabase
        .from("crm_pipelines")
        .select("id, crm_stages!inner(id, name, position)")
        .order("created_at");

      if (pipelines && pipelines.length > 0) {
        const { data: user } = await supabase.auth.getUser();
        
        // 4. Criar deal em todos os pipelines na etapa "Lead"
        for (const pipeline of pipelines) {
          const leadStage = (pipeline.crm_stages as any[]).find(
            (stage: any) => stage.name.toLowerCase() === "lead"
          );

          if (leadStage) {
            const { error: dealError } = await supabase
              .from("crm_deals")
              .insert({
                title: `${formData.name} - ${architectName}`,
                lead_id: lead.id,
                architect_id: architectId,
                pipeline_id: pipeline.id,
                stage_id: leadStage.id,
                owner_id: user.user?.id,
                value: 0,
                status: "aberto",
                note: formData.notes,
              });

            if (dealError) throw dealError;
          }
        }
      }

      // 5. Registrar no histórico do profissional parceiro
      await supabase.from("architect_history").insert({
        architect_id: architectId,
        event_type: "cliente_cadastrado",
        description: `Cliente ${formData.name} cadastrado e vinculado ao profissional parceiro`,
      });

      toast({
        title: "Sucesso!",
        description: "Cliente cadastrado, lead criado e oportunidade adicionada ao CRM",
      });

      // Clear persisted form data on success
      clearFormData();
      
      setFormData({
        name: "",
        phone: "",
        email: "",
        cpf_cnpj: "",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        city: "",
        state: "",
        boleto_status: "",
        notes: "",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar cliente",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Cliente para {architectName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dados Básicos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">Nome do Cliente *</Label>
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
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="cpf_cnpj">CPF / CNPJ</Label>
              <Input
                id="cpf_cnpj"
                value={formData.cpf_cnpj}
                onChange={(e) => setFormData({ ...formData, cpf_cnpj: formatCpfCnpj(e.target.value) })}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                maxLength={18}
              />
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Endereço</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <div className="flex gap-2">
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: formatCep(e.target.value) })}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={handleCepSearch} disabled={loadingCep}>
                    {loadingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">UF</Label>
                <Select 
                  value={formData.state} 
                  onValueChange={(v) => setFormData({ ...formData, state: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="logradouro">Logradouro</Label>
                <Input
                  id="logradouro"
                  value={formData.logradouro}
                  onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                  placeholder="Rua, Avenida, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  placeholder="Nº"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  value={formData.complemento}
                  onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                  placeholder="Apto, Sala, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  value={formData.bairro}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  placeholder="Bairro"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Cidade"
                />
              </div>
            </div>
          </div>

          {/* Status de Boleto */}
          <div className="space-y-2">
            <Label htmlFor="boleto_status">Status de Boleto</Label>
            <Select 
              value={formData.boleto_status || "none"} 
              onValueChange={(v) => setFormData({ ...formData, boleto_status: v === "none" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Não informado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não informado</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="nao_aprovado">Não Aprovado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cadastrar Cliente
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
