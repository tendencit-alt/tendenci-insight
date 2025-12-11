import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Address {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

interface AddressFormProps {
  address: Address;
  onAddressChange: (address: Address) => void;
}

const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function AddressForm({ address, onAddressChange }: AddressFormProps) {
  const [loadingCep, setLoadingCep] = useState(false);

  const handleCepSearch = async () => {
    const cep = address.cep.replace(/\D/g, '');
    if (cep.length !== 8) {
      toast.error('CEP inválido');
      return;
    }

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      onAddressChange({
        ...address,
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        uf: data.uf || '',
      });

      toast.success('Endereço preenchido automaticamente');
    } catch (error) {
      toast.error('Erro ao buscar CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length > 5) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    return digits;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>CEP</Label>
        <div className="flex gap-2">
          <Input
            value={address.cep}
            onChange={(e) => onAddressChange({ ...address, cep: formatCep(e.target.value) })}
            placeholder="00000-000"
            maxLength={9}
          />
          <Button type="button" variant="outline" size="icon" onClick={handleCepSearch} disabled={loadingCep}>
            {loadingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>UF</Label>
        <Select value={address.uf} onValueChange={(v) => onAddressChange({ ...address, uf: v })}>
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

      <div className="space-y-2 md:col-span-2">
        <Label>Logradouro</Label>
        <Input
          value={address.logradouro}
          onChange={(e) => onAddressChange({ ...address, logradouro: e.target.value })}
          placeholder="Rua, Avenida, etc."
        />
      </div>

      <div className="space-y-2">
        <Label>Número</Label>
        <Input
          value={address.numero}
          onChange={(e) => onAddressChange({ ...address, numero: e.target.value })}
          placeholder="Nº"
        />
      </div>

      <div className="space-y-2">
        <Label>Complemento</Label>
        <Input
          value={address.complemento}
          onChange={(e) => onAddressChange({ ...address, complemento: e.target.value })}
          placeholder="Apto, Sala, etc."
        />
      </div>

      <div className="space-y-2">
        <Label>Bairro</Label>
        <Input
          value={address.bairro}
          onChange={(e) => onAddressChange({ ...address, bairro: e.target.value })}
          placeholder="Bairro"
        />
      </div>

      <div className="space-y-2">
        <Label>Cidade</Label>
        <Input
          value={address.cidade}
          onChange={(e) => onAddressChange({ ...address, cidade: e.target.value })}
          placeholder="Cidade"
        />
      </div>
    </div>
  );
}
