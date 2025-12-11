import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Package, AlertTriangle } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProductionCardProps {
  order: {
    id: string;
    order_number: number;
    title: string;
    status: string;
    priority: string;
    value: number | null;
    planned_end_date: string | null;
    production_type?: { name: string; color: string; icon: string | null } | null;
    responsible?: { full_name: string | null } | null;
    client?: { name: string } | null;
  };
  onClick: () => void;
}

const priorityColors = {
  baixa: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  alta: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  urgente: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
};

const priorityLabels = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente'
};

export function ProductionCard({ order, onClick }: ProductionCardProps) {
  const isOverdue = order.planned_end_date && isPast(new Date(order.planned_end_date));
  const daysRemaining = order.planned_end_date 
    ? differenceInDays(new Date(order.planned_end_date), new Date())
    : null;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
      style={{ borderLeftColor: order.production_type?.color || '#6b7280' }}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">
                OP-{String(order.order_number).padStart(4, '0')}
              </span>
              {order.production_type && (
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {order.production_type.name}
                </Badge>
              )}
            </div>
            <p className="font-medium text-sm truncate mt-1">{order.title}</p>
          </div>
          <Badge className={`text-xs shrink-0 ${priorityColors[order.priority as keyof typeof priorityColors] || priorityColors.normal}`}>
            {priorityLabels[order.priority as keyof typeof priorityLabels] || order.priority}
          </Badge>
        </div>

        {/* Cliente */}
        {order.client && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Package className="h-3 w-3" />
            <span className="truncate">{order.client.name}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          {/* Responsável */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[100px]">
              {order.responsible?.full_name || 'Sem responsável'}
            </span>
          </div>

          {/* Prazo */}
          {order.planned_end_date && (
            <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-destructive' : daysRemaining !== null && daysRemaining <= 3 ? 'text-orange-600' : 'text-muted-foreground'}`}>
              {isOverdue && <AlertTriangle className="h-3 w-3" />}
              <Calendar className="h-3 w-3" />
              <span>
                {format(new Date(order.planned_end_date), 'dd/MM', { locale: ptBR })}
              </span>
            </div>
          )}
        </div>

        {/* Valor */}
        {order.value && order.value > 0 && (
          <div className="text-xs font-medium text-primary">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.value)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
