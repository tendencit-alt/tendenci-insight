import { useState, useEffect } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Clock, CalendarDays, CheckCircle2, Timer } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { addBusinessDays } from '@/utils/businessDays';

interface EditPhasesSLADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: number;
  createdAt: string | null;
}

interface PhaseWithSLA {
  id: string;
  position: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  sla_dias_uteis_custom: number | null;
  phase_template: {
    id: string;
    name: string;
    sla_dias_uteis: number | null;
  } | null;
}

export function EditPhasesSLADialog({ 
  open, 
  onOpenChange, 
  orderId,
  orderNumber,
  createdAt
}: EditPhasesSLADialogProps) {
  const queryClient = useQueryClient();
  const [phaseSLAs, setPhaseSLAs] = useState<Record<string, number>>({});

  // Buscar fases da OP
  const { data: phases = [], isLoading } = useQuery({
    queryKey: ['production-phases-sla', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_phases')
        .select(`
          id,
          position,
          status,
          started_at,
          completed_at,
          sla_dias_uteis_custom,
          phase_template:production_phase_templates(
            id,
            name,
            sla_dias_uteis
          )
        `)
        .eq('production_order_id', orderId)
        .order('position');
      
      if (error) throw error;
      return (data || []) as PhaseWithSLA[];
    },
    enabled: open && !!orderId
  });

  // Inicializar valores quando phases carrega
  useEffect(() => {
    if (phases.length > 0) {
      const initialValues: Record<string, number> = {};
      phases.forEach(phase => {
        const effectiveSLA = phase.sla_dias_uteis_custom ?? phase.phase_template?.sla_dias_uteis ?? 0;
        initialValues[phase.id] = effectiveSLA;
      });
      setPhaseSLAs(initialValues);
    }
  }, [phases]);

  // Mutation para salvar
  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(phaseSLAs).map(([phaseId, sla]) => 
        supabase
          .from('production_phases')
          .update({ sla_dias_uteis_custom: sla })
          .eq('id', phaseId)
      );
      
      await Promise.all(updates);

      // Calcular prazo total
      const totalDias = Object.values(phaseSLAs).reduce((acc, val) => acc + (val || 0), 0);
      
      // Calcular nova data de entrega baseada nos dias úteis
      const baseDate = createdAt ? new Date(createdAt) : new Date();
      const newPlannedEndDate = addBusinessDays(baseDate, totalDias);
      
      // Atualizar prazo_customizado_dias E planned_end_date na OP
      await supabase
        .from('production_orders')
        .update({ 
          prazo_customizado_dias: totalDias,
          planned_end_date: newPlannedEndDate.toISOString()
        })
        .eq('id', orderId);
      
      // Log da alteração
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('production_logs')
        .insert({
          production_order_id: orderId,
          action_type: 'sla_update',
          description: `Prazos SLA das etapas atualizados. Prazo total: ${totalDias} dias úteis`,
          created_by: user?.id
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-phases-sla', orderId] });
      queryClient.invalidateQueries({ queryKey: ['production-order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast.success('Prazos das etapas atualizados!');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Erro ao salvar prazos');
    }
  });

  // Calcular total de dias e datas previstas
  const totalDiasUteis = Object.values(phaseSLAs).reduce((acc, val) => acc + (val || 0), 0);
  
  const calculatePhaseDates = () => {
    const dates: Record<string, Date> = {};
    const baseDate = createdAt ? new Date(createdAt) : new Date();
    let accumulatedDays = 0;
    
    phases.forEach(phase => {
      const phaseSLA = phaseSLAs[phase.id] || 0;
      accumulatedDays += phaseSLA;
      dates[phase.id] = addBusinessDays(baseDate, accumulatedDays);
    });
    
    return dates;
  };
  
  const phaseDates = calculatePhaseDates();
  const finalDate = addBusinessDays(createdAt ? new Date(createdAt) : new Date(), totalDiasUteis);

  const handleSLAChange = (phaseId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setPhaseSLAs(prev => ({ ...prev, [phaseId]: Math.max(0, numValue) }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluido':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'em_andamento':
        return <Timer className="h-4 w-4 text-primary animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Editar Prazos das Etapas
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            OP-{String(orderNumber).padStart(4, '0')}
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Defina o prazo em dias úteis para cada etapa. O sistema calculará automaticamente as datas previstas.
            </p>

            {/* Lista de etapas */}
            <div className="space-y-3">
              {phases.map((phase, index) => (
                <div 
                  key={phase.id}
                  className={`p-3 rounded-lg border ${
                    phase.status === 'em_andamento' 
                      ? 'border-primary bg-primary/5' 
                      : phase.status === 'concluido'
                      ? 'border-green-500/50 bg-green-50 dark:bg-green-950/20'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Número e status */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                      phase.status === 'concluido' 
                        ? 'bg-green-500 text-white'
                        : phase.status === 'em_andamento'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {phase.status === 'concluido' ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    
                    {/* Nome da etapa */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {phase.phase_template?.name || `Etapa ${index + 1}`}
                      </p>
                      {phase.status === 'concluido' && phase.completed_at && (
                        <p className="text-xs text-green-600">
                          Concluído em {format(new Date(phase.completed_at), 'dd/MM')}
                        </p>
                      )}
                    </div>

                    {/* Input SLA */}
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        className="w-16 h-8 text-center"
                        value={phaseSLAs[phase.id] || 0}
                        onChange={(e) => handleSLAChange(phase.id, e.target.value)}
                        disabled={phase.status === 'concluido'}
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">dias</span>
                    </div>
                  </div>

                  {/* Data prevista */}
                  {phase.status !== 'concluido' && phaseDates[phase.id] && (
                    <div className="mt-2 ml-10 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>
                        Previsão: {format(phaseDates[phase.id], "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Resumo */}
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="h-5 w-5 text-primary" />
                  <span className="font-medium">Prazo Total</span>
                </div>
                <span className="text-xl font-bold text-primary">
                  {totalDiasUteis} dias úteis
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <span>
                  Entrega prevista: {format(finalDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || isLoading}
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Prazos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
