import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DraggableProductionCard } from './DraggableProductionCard';
import { cn } from '@/lib/utils';
import { getTailwindColor } from '@/utils/tailwindColors';

interface DroppableColumnProps {
  id: string;
  title: string;
  color?: string;
  orders: any[];
  onCardClick: (orderId: string) => void;
}

export function DroppableColumn({ id, title, color, orders, onCardClick }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${id}`,
  });

  const hexColor = getTailwindColor(color);
  
  // Calcular valor total da coluna
  const totalValue = orders.reduce((sum, order) => sum + (order.value || 0), 0);

  return (
    <div className="flex-shrink-0 w-[280px]">
      <div 
        className="flex items-center justify-between mb-3 p-2 rounded-lg"
        style={{ backgroundColor: `${hexColor}20` }}
      >
        <div className="flex items-center gap-2">
          <span 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: hexColor }}
          />
          <span className="font-medium text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded">
            {orders.length}
          </span>
        </div>
      </div>
      
      {/* Valor total da coluna */}
      {totalValue > 0 && (
        <div className="mb-2 px-3 py-1.5 rounded-md bg-emerald-500/15 text-center">
          <span className="text-sm font-bold text-emerald-500">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
          </span>
        </div>
      )}
      
      <div
        ref={setNodeRef}
        className={cn(
          "space-y-2 min-h-[200px] rounded-lg p-2 transition-colors",
          isOver && "bg-primary/10 ring-2 ring-primary/50"
        )}
      >
        <SortableContext 
          items={orders.map(o => o.id)}
          strategy={verticalListSortingStrategy}
        >
          {orders.map((order) => (
            <DraggableProductionCard 
              key={order.id} 
              order={order}
              onClick={() => onCardClick(order.id)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
