import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Check,
  X,
  Loader2,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { getTailwindColor } from '@/utils/tailwindColors';

interface ManageProductionStagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProductionType {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  position: number;
  active: boolean;
  slug: string;
}

interface PhaseTemplate {
  id: string;
  name: string;
  color: string;
  production_type_id: string;
  position: number;
  sla_hours: number | null;
  sla_dias_uteis: number | null;
  is_start_phase: boolean;
  is_end_phase: boolean;
  active: boolean;
  slug: string;
}

const AVAILABLE_COLORS = [
  { name: 'Roxo', value: 'purple-500' },
  { name: 'Vermelho', value: 'red-500' },
  { name: 'Azul', value: 'blue-500' },
  { name: 'Verde', value: 'green-500' },
  { name: 'Amarelo', value: 'yellow-500' },
  { name: 'Laranja', value: 'orange-500' },
  { name: 'Cinza', value: 'gray-500' },
  { name: 'Ciano', value: 'cyan-500' },
  { name: 'Índigo', value: 'indigo-500' },
  { name: 'Âmbar', value: 'amber-500' },
  { name: 'Teal', value: 'teal-500' },
  { name: 'Rosa', value: 'pink-500' },
];

const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

export function ManageProductionStagesDialog({ open, onOpenChange }: ManageProductionStagesDialogProps) {
  const queryClient = useQueryClient();
  
  // Types state
  const [types, setTypes] = useState<ProductionType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [loadingTypes, setLoadingTypes] = useState(false);
  
  // Type form state
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('blue-500');
  const [isCreatingType, setIsCreatingType] = useState(false);
  
  // Phases state
  const [phases, setPhases] = useState<PhaseTemplate[]>([]);
  const [loadingPhases, setLoadingPhases] = useState(false);
  
  // Phase form state
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [newPhaseColor, setNewPhaseColor] = useState('gray-500');
  const [newPhaseSLAHours, setNewPhaseSLAHours] = useState('24');
  const [newPhaseSLADias, setNewPhaseSLADias] = useState('1');
  const [newPhaseIsStart, setNewPhaseIsStart] = useState(false);
  const [newPhaseIsEnd, setNewPhaseIsEnd] = useState(false);
  const [isCreatingPhase, setIsCreatingPhase] = useState(false);
  
  const [saving, setSaving] = useState(false);

  // Fetch types
  const fetchTypes = async () => {
    setLoadingTypes(true);
    const { data, error } = await supabase
      .from('production_types')
      .select('*')
      .order('position');
    
    if (error) {
      toast.error('Erro ao carregar tipos de produção');
      console.error(error);
    } else {
      setTypes(data || []);
      if (data && data.length > 0 && !selectedTypeId) {
        setSelectedTypeId(data[0].id);
      }
    }
    setLoadingTypes(false);
  };

  // Fetch phases for selected type
  const fetchPhases = async (typeId: string) => {
    setLoadingPhases(true);
    const { data, error } = await supabase
      .from('production_phase_templates')
      .select('*')
      .eq('production_type_id', typeId)
      .order('position');
    
    if (error) {
      toast.error('Erro ao carregar fases');
      console.error(error);
    } else {
      setPhases(data || []);
    }
    setLoadingPhases(false);
  };

  useEffect(() => {
    if (open) {
      fetchTypes();
    }
  }, [open]);

  useEffect(() => {
    if (selectedTypeId) {
      fetchPhases(selectedTypeId);
    }
  }, [selectedTypeId]);

  // Type CRUD
  const handleCreateType = async () => {
    if (!newTypeName.trim()) {
      toast.error('Digite o nome do tipo');
      return;
    }
    
    setSaving(true);
    const maxPosition = types.length > 0 ? Math.max(...types.map(t => t.position)) : 0;
    
    const { error } = await supabase.from('production_types').insert({
      name: newTypeName.trim(),
      color: newTypeColor,
      slug: generateSlug(newTypeName),
      position: maxPosition + 1,
      active: true
    });
    
    if (error) {
      toast.error('Erro ao criar tipo de produção');
      console.error(error);
    } else {
      toast.success('Tipo criado com sucesso');
      setNewTypeName('');
      setNewTypeColor('blue-500');
      setIsCreatingType(false);
      fetchTypes();
      queryClient.invalidateQueries({ queryKey: ['production-types'] });
    }
    setSaving(false);
  };

  const handleUpdateType = async (typeId: string) => {
    if (!newTypeName.trim()) {
      toast.error('Digite o nome do tipo');
      return;
    }
    
    setSaving(true);
    const { error } = await supabase
      .from('production_types')
      .update({
        name: newTypeName.trim(),
        color: newTypeColor,
        slug: generateSlug(newTypeName)
      })
      .eq('id', typeId);
    
    if (error) {
      toast.error('Erro ao atualizar tipo');
      console.error(error);
    } else {
      toast.success('Tipo atualizado');
      setEditingTypeId(null);
      setNewTypeName('');
      setNewTypeColor('blue-500');
      fetchTypes();
      queryClient.invalidateQueries({ queryKey: ['production-types'] });
    }
    setSaving(false);
  };

  const handleDeleteType = async (typeId: string) => {
    // Check for linked orders
    const { count } = await supabase
      .from('production_orders')
      .select('id', { count: 'exact', head: true })
      .eq('production_type_id', typeId);
    
    if (count && count > 0) {
      toast.error(`Não é possível excluir: ${count} ordem(s) de produção vinculada(s)`);
      return;
    }
    
    setSaving(true);
    // Delete phases first
    await supabase
      .from('production_phase_templates')
      .delete()
      .eq('production_type_id', typeId);
    
    const { error } = await supabase
      .from('production_types')
      .delete()
      .eq('id', typeId);
    
    if (error) {
      toast.error('Erro ao excluir tipo');
      console.error(error);
    } else {
      toast.success('Tipo excluído');
      if (selectedTypeId === typeId) {
        setSelectedTypeId(types.find(t => t.id !== typeId)?.id || null);
      }
      fetchTypes();
      queryClient.invalidateQueries({ queryKey: ['production-types'] });
    }
    setSaving(false);
  };

  const startEditType = (type: ProductionType) => {
    setEditingTypeId(type.id);
    setNewTypeName(type.name);
    setNewTypeColor(type.color);
    setIsCreatingType(false);
  };

  const cancelEditType = () => {
    setEditingTypeId(null);
    setNewTypeName('');
    setNewTypeColor('blue-500');
    setIsCreatingType(false);
  };

  // Phase CRUD
  const handleCreatePhase = async () => {
    if (!newPhaseName.trim() || !selectedTypeId) {
      toast.error('Digite o nome da fase');
      return;
    }
    
    setSaving(true);
    const maxPosition = phases.length > 0 ? Math.max(...phases.map(p => p.position)) : 0;
    
    const { error } = await supabase.from('production_phase_templates').insert({
      name: newPhaseName.trim(),
      color: newPhaseColor,
      slug: generateSlug(newPhaseName),
      production_type_id: selectedTypeId,
      position: maxPosition + 1,
      sla_hours: parseInt(newPhaseSLAHours) || 24,
      sla_dias_uteis: parseInt(newPhaseSLADias) || 1,
      is_start_phase: newPhaseIsStart,
      is_end_phase: newPhaseIsEnd,
      active: true
    });
    
    if (error) {
      toast.error('Erro ao criar fase');
      console.error(error);
    } else {
      toast.success('Fase criada com sucesso');
      resetPhaseForm();
      fetchPhases(selectedTypeId);
      queryClient.invalidateQueries({ queryKey: ['production-phase-templates'] });
    }
    setSaving(false);
  };

  const handleUpdatePhase = async (phaseId: string) => {
    if (!newPhaseName.trim()) {
      toast.error('Digite o nome da fase');
      return;
    }
    
    setSaving(true);
    const { error } = await supabase
      .from('production_phase_templates')
      .update({
        name: newPhaseName.trim(),
        color: newPhaseColor,
        slug: generateSlug(newPhaseName),
        sla_hours: parseInt(newPhaseSLAHours) || 24,
        sla_dias_uteis: parseInt(newPhaseSLADias) || 1,
        is_start_phase: newPhaseIsStart,
        is_end_phase: newPhaseIsEnd
      })
      .eq('id', phaseId);
    
    if (error) {
      toast.error('Erro ao atualizar fase');
      console.error(error);
    } else {
      toast.success('Fase atualizada');
      resetPhaseForm();
      if (selectedTypeId) fetchPhases(selectedTypeId);
      queryClient.invalidateQueries({ queryKey: ['production-phase-templates'] });
    }
    setSaving(false);
  };

  const handleDeletePhase = async (phaseId: string) => {
    // Check for linked production_phases
    const { count } = await supabase
      .from('production_phases')
      .select('id', { count: 'exact', head: true })
      .eq('phase_template_id', phaseId);
    
    if (count && count > 0) {
      toast.error(`Não é possível excluir: ${count} ordem(s) usando esta fase`);
      return;
    }
    
    setSaving(true);
    const { error } = await supabase
      .from('production_phase_templates')
      .delete()
      .eq('id', phaseId);
    
    if (error) {
      toast.error('Erro ao excluir fase');
      console.error(error);
    } else {
      toast.success('Fase excluída');
      if (selectedTypeId) fetchPhases(selectedTypeId);
      queryClient.invalidateQueries({ queryKey: ['production-phase-templates'] });
    }
    setSaving(false);
  };

  const startEditPhase = (phase: PhaseTemplate) => {
    setEditingPhaseId(phase.id);
    setNewPhaseName(phase.name);
    setNewPhaseColor(phase.color);
    setNewPhaseSLAHours(String(phase.sla_hours || 24));
    setNewPhaseSLADias(String(phase.sla_dias_uteis || 1));
    setNewPhaseIsStart(phase.is_start_phase);
    setNewPhaseIsEnd(phase.is_end_phase);
    setIsCreatingPhase(false);
  };

  const resetPhaseForm = () => {
    setEditingPhaseId(null);
    setNewPhaseName('');
    setNewPhaseColor('gray-500');
    setNewPhaseSLAHours('24');
    setNewPhaseSLADias('1');
    setNewPhaseIsStart(false);
    setNewPhaseIsEnd(false);
    setIsCreatingPhase(false);
  };

  // Phase reordering
  const handleMovePhase = async (phaseId: string, direction: 'up' | 'down') => {
    const phaseIndex = phases.findIndex(p => p.id === phaseId);
    if (
      (direction === 'up' && phaseIndex === 0) ||
      (direction === 'down' && phaseIndex === phases.length - 1)
    ) {
      return;
    }
    
    const newIndex = direction === 'up' ? phaseIndex - 1 : phaseIndex + 1;
    const newPhases = [...phases];
    [newPhases[phaseIndex], newPhases[newIndex]] = [newPhases[newIndex], newPhases[phaseIndex]];
    
    setPhases(newPhases);
    
    // Update positions in DB
    setSaving(true);
    for (let i = 0; i < newPhases.length; i++) {
      await supabase
        .from('production_phase_templates')
        .update({ position: i + 1 })
        .eq('id', newPhases[i].id);
    }
    setSaving(false);
    queryClient.invalidateQueries({ queryKey: ['production-phase-templates'] });
    toast.success('Ordem atualizada');
  };

  const ColorSelector = ({ value, onChange }: { value: string; onChange: (color: string) => void }) => (
    <div className="flex flex-wrap gap-1">
      {AVAILABLE_COLORS.map(color => (
        <button
          key={color.value}
          type="button"
          onClick={() => onChange(color.value)}
          className={`w-6 h-6 rounded-full border-2 transition-all ${
            value === color.value ? 'border-foreground scale-110' : 'border-transparent'
          }`}
          style={{ backgroundColor: getTailwindColor(color.value) }}
          title={color.name}
        />
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ⚙️ Gerenciar Tipos e Etapas de Produção
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column - Production Types */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Tipos de Produção</h3>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  setIsCreatingType(true);
                  setEditingTypeId(null);
                  setNewTypeName('');
                  setNewTypeColor('blue-500');
                }}
                disabled={isCreatingType}
              >
                <Plus className="h-3 w-3 mr-1" />
                Novo
              </Button>
            </div>
            
            <ScrollArea className="h-[300px] border rounded-md p-2">
              {loadingTypes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Create Type Form */}
                  {isCreatingType && (
                    <div className="p-3 border rounded-lg bg-muted/50 space-y-2">
                      <Input
                        placeholder="Nome do tipo"
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        autoFocus
                      />
                      <div>
                        <Label className="text-xs">Cor</Label>
                        <ColorSelector value={newTypeColor} onChange={setNewTypeColor} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleCreateType} disabled={saving}>
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEditType}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {types.map(type => (
                    <div key={type.id}>
                      {editingTypeId === type.id ? (
                        <div className="p-3 border rounded-lg bg-muted/50 space-y-2">
                          <Input
                            value={newTypeName}
                            onChange={(e) => setNewTypeName(e.target.value)}
                            autoFocus
                          />
                          <div>
                            <Label className="text-xs">Cor</Label>
                            <ColorSelector value={newTypeColor} onChange={setNewTypeColor} />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleUpdateType(type.id)} disabled={saving}>
                              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEditType}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`
                            p-3 border rounded-lg cursor-pointer transition-all
                            ${selectedTypeId === type.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}
                          `}
                          onClick={() => setSelectedTypeId(type.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: getTailwindColor(type.color) }}
                              />
                              <span className="font-medium text-sm">{type.name}</span>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={(e) => { e.stopPropagation(); startEditType(type); }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={(e) => { e.stopPropagation(); handleDeleteType(type.id); }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right Column - Phases */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                Etapas {selectedTypeId && types.find(t => t.id === selectedTypeId)?.name ? `- ${types.find(t => t.id === selectedTypeId)?.name}` : ''}
              </h3>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  setIsCreatingPhase(true);
                  resetPhaseForm();
                  setIsCreatingPhase(true);
                }}
                disabled={!selectedTypeId || isCreatingPhase}
              >
                <Plus className="h-3 w-3 mr-1" />
                Nova
              </Button>
            </div>
            
            <ScrollArea className="h-[300px] border rounded-md p-2">
              {!selectedTypeId ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                  Selecione um tipo de produção
                </div>
              ) : loadingPhases ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Create Phase Form */}
                  {isCreatingPhase && (
                    <div className="p-3 border rounded-lg bg-muted/50 space-y-3">
                      <Input
                        placeholder="Nome da etapa"
                        value={newPhaseName}
                        onChange={(e) => setNewPhaseName(e.target.value)}
                        autoFocus
                      />
                      <div>
                        <Label className="text-xs">Cor</Label>
                        <ColorSelector value={newPhaseColor} onChange={setNewPhaseColor} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            SLA (horas)
                          </Label>
                          <Input
                            type="number"
                            value={newPhaseSLAHours}
                            onChange={(e) => setNewPhaseSLAHours(e.target.value)}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            SLA (dias úteis)
                          </Label>
                          <Input
                            type="number"
                            value={newPhaseSLADias}
                            onChange={(e) => setNewPhaseSLADias(e.target.value)}
                            className="h-8"
                          />
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <Switch checked={newPhaseIsStart} onCheckedChange={setNewPhaseIsStart} />
                          <Label className="text-xs">Fase Inicial</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={newPhaseIsEnd} onCheckedChange={setNewPhaseIsEnd} />
                          <Label className="text-xs">Fase Final</Label>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleCreatePhase} disabled={saving}>
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={resetPhaseForm}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {phases.map((phase, index) => (
                    <div key={phase.id}>
                      {editingPhaseId === phase.id ? (
                        <div className="p-3 border rounded-lg bg-muted/50 space-y-3">
                          <Input
                            value={newPhaseName}
                            onChange={(e) => setNewPhaseName(e.target.value)}
                            autoFocus
                          />
                          <div>
                            <Label className="text-xs">Cor</Label>
                            <ColorSelector value={newPhaseColor} onChange={setNewPhaseColor} />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                SLA (horas)
                              </Label>
                              <Input
                                type="number"
                                value={newPhaseSLAHours}
                                onChange={(e) => setNewPhaseSLAHours(e.target.value)}
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                SLA (dias úteis)
                              </Label>
                              <Input
                                type="number"
                                value={newPhaseSLADias}
                                onChange={(e) => setNewPhaseSLADias(e.target.value)}
                                className="h-8"
                              />
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                              <Switch checked={newPhaseIsStart} onCheckedChange={setNewPhaseIsStart} />
                              <Label className="text-xs">Fase Inicial</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch checked={newPhaseIsEnd} onCheckedChange={setNewPhaseIsEnd} />
                              <Label className="text-xs">Fase Final</Label>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleUpdatePhase(phase.id)} disabled={saving}>
                              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={resetPhaseForm}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 border rounded-lg hover:bg-muted/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: getTailwindColor(phase.color) }}
                              />
                              <span className="font-medium text-sm">{phase.name}</span>
                              {phase.is_start_phase && <Badge variant="outline" className="text-xs">Início</Badge>}
                              {phase.is_end_phase && <Badge variant="outline" className="text-xs">Fim</Badge>}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => handleMovePhase(phase.id, 'up')}
                                disabled={index === 0}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => handleMovePhase(phase.id, 'down')}
                                disabled={index === phases.length - 1}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => startEditPhase(phase)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={() => handleDeletePhase(phase.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            {phase.sla_hours && phase.sla_hours > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {phase.sla_hours}h
                              </span>
                            )}
                            {phase.sla_dias_uteis && phase.sla_dias_uteis > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {phase.sla_dias_uteis}d úteis
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}