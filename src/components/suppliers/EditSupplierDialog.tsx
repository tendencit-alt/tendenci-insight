import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditSupplierDialogProps {
  supplier: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Máscaras de formatação
const formatCNPJ = (value: string) => {
  const numbers = value.replace(/\D/g, "").slice(0, 14);
  return numbers
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

const formatCPF = (value: string) => {
  const numbers = value.replace(/\D/g, "").slice(0, 11);
  return numbers
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

const formatCPFCNPJ = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 11) return formatCPF(value);
  return formatCNPJ(value);
};

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "").slice(0, 11);
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  }
  return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
};

const formatCEP = (value: string) => {
  const numbers = value.replace(/\D/g, "").slice(0, 8);
  return numbers.replace(/(\d{5})(\d{0,3})/, "$1-$2");
};

export default function EditSupplierDialog({ supplier, open, onOpenChange, onSuccess }: EditSupplierDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);
  const [form, setForm] = useState({
    name: "",
    trade_name: "",
    cpf_cnpj: "",
    inscricao_estadual: "",
    phone: "",
    email: "",
    website: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    city: "",
    state: "",
    payment_terms: "",
    bank_name: "",
    bank_agency: "",
    bank_account: "",
    bank_account_type: "",
    bank_holder_name: "",
    bank_holder_document: "",
    pix_key_type: "",
    pix_key: "",
    notes: "",
    active: true
  });

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name || "",
        trade_name: supplier.trade_name || "",
        cpf_cnpj: supplier.cpf_cnpj || "",
        inscricao_estadual: supplier.inscricao_estadual || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        website: supplier.website || "",
        cep: supplier.cep || "",
        logradouro: supplier.logradouro || "",
        numero: supplier.numero || "",
        complemento: supplier.complemento || "",
        bairro: supplier.bairro || "",
        city: supplier.city || "",
        state: supplier.state || "",
        payment_terms: supplier.payment_terms || "",
        notes: supplier.notes || "",
        active: supplier.active ?? true
      });
    }
  }, [supplier]);

  const searchCEP = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    setSearchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast({ title: "CEP não encontrado", variant: "destructive" });
        return;
      }

      setForm(prev => ({
        ...prev,
        logradouro: data.logradouro || "",
        bairro: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
        complemento: data.complemento || prev.complemento
      }));
      
      toast({ title: "Endereço preenchido automaticamente!" });
    } catch (error) {
      toast({ title: "Erro ao buscar CEP", variant: "destructive" });
    } finally {
      setSearchingCep(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("suppliers")
        .update(form)
        .eq("id", supplier.id);

      if (error) throw error;

      toast({ title: "Fornecedor atualizado!" });
      onSuccess();
    } catch (error: any) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Fornecedor</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <Label htmlFor="active">Fornecedor Ativo</Label>
            <Switch
              id="active"
              checked={form.active}
              onCheckedChange={(checked) => setForm({ ...form, active: checked })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Razão Social *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade_name">Nome Fantasia</Label>
              <Input
                id="trade_name"
                value={form.trade_name}
                onChange={(e) => setForm({ ...form, trade_name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpf_cnpj">CNPJ/CPF</Label>
              <Input
                id="cpf_cnpj"
                value={form.cpf_cnpj}
                onChange={(e) => setForm({ ...form, cpf_cnpj: formatCPFCNPJ(e.target.value) })}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
              <Input
                id="inscricao_estadual"
                value={form.inscricao_estadual}
                onChange={(e) => setForm({ ...form, inscricao_estadual: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <div className="flex gap-1">
                <Input
                  id="cep"
                  value={form.cep}
                  onChange={(e) => setForm({ ...form, cep: formatCEP(e.target.value) })}
                  placeholder="00000-000"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={() => searchCEP(form.cep)}
                  disabled={searchingCep}
                >
                  {searchingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="logradouro">Logradouro</Label>
              <Input
                id="logradouro"
                value={form.logradouro}
                onChange={(e) => setForm({ ...form, logradouro: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                value={form.numero}
                onChange={(e) => setForm({ ...form, numero: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complemento">Complemento</Label>
              <Input
                id="complemento"
                value={form.complemento}
                onChange={(e) => setForm({ ...form, complemento: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={form.bairro}
                onChange={(e) => setForm({ ...form, bairro: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                maxLength={2}
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_terms">Prazo de Pagamento</Label>
              <Input
                id="payment_terms"
                placeholder="Ex: 30/60/90 dias"
                value={form.payment_terms}
                onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
