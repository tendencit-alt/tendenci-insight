import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Package, GripVertical } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProductionCardProps {
  order: {
    id: string;
    order_number: number;
    title: string;
    status: string;
    priority: string;
    planned_end_date?: string | null;
    production_type?: { name: string; color: string; icon?: string } | null;
    responsible?: { full_name: string } | null;
    client?: { name: string } | null;
    value?: number | null;
  };
  onClick: () => void;
  isDragging?: boolean;
}

const priorityColors: Record<string, string> = {
  baixa: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  alta: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  urgente: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
};

const priorityLabels: Record<string, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente'
};

export function ProductionCard({ order, onClick, isDragging }: ProductionCardProps) {
  const isOverdue = order.planned_end_date && isPast(new Date(order.planned_end_date));
  const daysRemaining = order.planned_end_date 
    ? differenceInDays(new Date(order.planned_end_date), new Date())
    : null;

  return (
    <Card 
      className={cn(
        "cursor-grab active:cursor-grabbing hover:shadow-md transition-all",
        isDragging && "shadow-lg ring-2 ring-primary rotate-2",
        isOverdue && "border-destructive/50"
      )}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-mono text-muted-foreground block">
                OP-{String(order.order_number).padStart(4, '0')}
              </span>
              <p className="font-medium text-sm truncate">{order.title}</p>
            </div>
          </div>
          <Badge className={cn("shrink-0 text-xs", priorityColors[order.priority])}>
            {priorityLabels[order.priority] || order.priority}
          </Badge>
        </div>

        {order.production_type && (
          <Badge variant="outline" className="text-xs">
            <span 
              className="w-1.5 h-1.5 rounded-full mr-1" 
              style={{ backgroundColor: order.production_type.color }}
            />
            {order.production_type.name}
          </Badge>
        )}

        <div className="space-y-1 text-xs text-muted-foreground">
          {order.client && (
            <div className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              <span className="truncate">{order.client.name}</span>
            </div>
          )}

          {order.responsible && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate">{order.responsible.full_name}</span>
            </div>
          )}

          {order.planned_end_date && (
            <div className={cn(
              "flex items-center gap-1",
              isOverdue && "text-destructive font-medium",
              daysRemaining !== null && daysRemaining <= 3 && daysRemaining > 0 && "text-amber-600 font-medium"
            )}>
              <Calendar className="h-3 w-3" />
              <span>
                {format(new Date(order.planned_end_date), 'dd/MM/yyyy')}
                {daysRemaining !== null && (
                  <span className="ml-1">
                    {isOverdue 
                      ? `(${Math.abs(daysRemaining)}d atrasado)` 
                      : daysRemaining === 0 
                      ? '(Hoje)'
                      : `(${daysRemaining}d)`
                    }
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {order.value && order.value > 0 && (
          <div className="text-sm font-medium text-primary">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.value)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
