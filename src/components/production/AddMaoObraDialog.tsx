import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Users, Plus } from 'lucide-react';

interface AddMaoObraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productionProductId: string;
  onSuccess: () => void;
}

export function AddMaoObraDialog({ 
  open, 
  onOpenChange, 
  productionProductId,
  onSuccess 
}: AddMaoObraDialogProps) {
  const queryClient = useQueryClient();
  const [selectedLaborTypeId, setSelectedLaborTypeId] = useState<string>('');
  const [newLaborTypeName, setNewLaborTypeName] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [quantidade, setQuantidade] = useState('1');
  const [unidade, setUnidade] = useState('h');
  const [custoUnitario, setCustoUnitario] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Buscar tipos de mão de obra existentes
  const { data: laborTypes = [] } = useQuery({
    queryKey: ['labor-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('labor_types')
        .select('*')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  // Quando seleciona um tipo existente, preenche o custo padrão
  useEffect(() => {
    if (selectedLaborTypeId && selectedLaborTypeId !== 'new') {
      const laborType = laborTypes.find(lt => lt.id === selectedLaborTypeId);
      if (laborType) {
        setCustoUnitario(String(laborType.default_cost || 0));
        setUnidade(laborType.unit || 'h');
      }
    }
  }, [selectedLaborTypeId, laborTypes]);

  // Reset form
  const resetForm = () => {
    setSelectedLaborTypeId('');
    setNewLaborTypeName('');
    setIsCreatingNew(false);
    setQuantidade('1');
    setUnidade('h');
    setCustoUnitario('');
    setNotes('');
  };

  // Mutation para criar novo tipo de mão de obra
  const createLaborTypeMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('labor_types')
        .insert({ name, unit: unidade, default_cost: parseFloat(custoUnitario) || 0 })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-types'] });
    }
  });

  const handleSubmit = async () => {
    let laborTypeName = '';

    if (isCreatingNew || selectedLaborTypeId === 'new') {
      if (!newLaborTypeName.trim()) {
        toast.error('Informe o nome do tipo de mão de obra');
        return;
      }
      laborTypeName = newLaborTypeName.trim();
      
      // Criar novo tipo se não existe
      try {
        await createLaborTypeMutation.mutateAsync(laborTypeName);
      } catch (error: any) {
        // Se já existe, ignora o erro de duplicata
        if (!error.message?.includes('duplicate')) {
          toast.error('Erro ao criar tipo de mão de obra');
          return;
        }
      }
    } else {
      if (!selectedLaborTypeId) {
        toast.error('Selecione um tipo de mão de obra');
        return;
      }
      const laborType = laborTypes.find(lt => lt.id === selectedLaborTypeId);
      laborTypeName = laborType?.name || '';
    }

    if (!quantidade || parseFloat(quantidade) <= 0) {
      toast.error('Informe uma quantidade válida');
      return;
    }
    if (!custoUnitario || parseFloat(custoUnitario) < 0) {
      toast.error('Informe o custo unitário');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('production_product_bom')
        .insert({
          production_product_id: productionProductId,
          insumo_id: null,
          insumo_nome: laborTypeName,
          quantidade: parseFloat(quantidade),
          unidade: unidade.trim() || 'h',
          custo_unitario: parseFloat(custoUnitario),
          cor: null,
          notes: notes.trim() || null,
          tipo: 'mao_obra'
        });

      if (error) throw error;

      toast.success('Mão de obra adicionada com sucesso');
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao adicionar mão de obra:', error);
      toast.error('Erro ao adicionar mão de obra');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = (parseFloat(quantidade) || 0) * (parseFloat(custoUnitario) || 0);

  const handleLaborTypeChange = (value: string) => {
    if (value === 'new') {
      setIsCreatingNew(true);
      setSelectedLaborTypeId('new');
      setCustoUnitario('');
    } else {
      setIsCreatingNew(false);
      setSelectedLaborTypeId(value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Adicionar Mão de Obra
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seleção de tipo de mão de obra */}
          <div className="space-y-2">
            <Label>Tipo de Mão de Obra *</Label>
            <Select value={selectedLaborTypeId} onValueChange={handleLaborTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione ou crie um tipo" />
              </SelectTrigger>
              <SelectContent>
                {laborTypes.map((lt) => (
                  <SelectItem key={lt.id} value={lt.id}>
                    {lt.name}
                  </SelectItem>
                ))}
                <SelectItem value="new">
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Criar novo tipo...
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campo para novo tipo */}
          {isCreatingNew && (
            <div className="space-y-2">
              <Label htmlFor="new-labor-type">Nome do Novo Tipo *</Label>
              <Input
                id="new-labor-type"
                value={newLaborTypeName}
                onChange={(e) => setNewLaborTypeName(e.target.value)}
                placeholder="Ex: Soldagem, Costura, Polimento..."
              />
              <p className="text-xs text-muted-foreground">
                Este tipo será salvo para uso futuro
              </p>
            </div>
          )}

          {/* Quantidade e Unidade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade *</Label>
              <Input
                id="quantidade"
                type="number"
                step="0.01"
                min="0"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade</Label>
              <Select value={unidade} onValueChange={setUnidade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="h">Hora(s)</SelectItem>
                  <SelectItem value="d">Dia(s)</SelectItem>
                  <SelectItem value="srv">Serviço</SelectItem>
                  <SelectItem value="UN">Unidade</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custo Unitário */}
          <div className="space-y-2">
            <Label htmlFor="custo-unitario">Custo por {unidade === 'h' ? 'Hora' : unidade === 'd' ? 'Dia' : 'Unidade'} (R$) *</Label>
            <Input
              id="custo-unitario"
              type="number"
              step="0.01"
              min="0"
              value={custoUnitario}
              onChange={(e) => setCustoUnitario(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Subtotal Preview */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="font-semibold text-lg">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}
              </span>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes sobre esta mão de obra..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Adicionando...' : 'Adicionar Mão de Obra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
