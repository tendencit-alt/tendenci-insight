import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { getTailwindColor } from '@/utils/tailwindColors';
import { ProductionCardSimple } from './ProductionCardSimple';
import { memo, useCallback, useMemo } from 'react';

interface OptimizedDroppableColumnProps {
  id: string;
  title: string;
  color?: string;
  orders: any[];
  onCardClick: (orderId: string) => void;
  automationAlerts?: Map<string, any>;
  maxHeight?: string;
}

// Componente de card arrastável otimizado
const DraggableCard = memo(function DraggableCard({ 
  order, 
  onClick, 
  automationAlert 
}: { 
  order: any; 
  onClick: () => void;
  automationAlert?: any;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 999 : undefined,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "touch-none select-none",
        isDragging && "opacity-50 shadow-2xl"
      )}
    >
      <ProductionCardSimple 
        order={order}
        onClick={onClick}
        isDragging={isDragging}
        automationAlert={automationAlert}
      />
    </div>
  );
});

function OptimizedDroppableColumnComponent({ 
  id, 
  title, 
  color, 
  orders, 
  onCardClick,
  automationAlerts,
  maxHeight = "calc(100vh - 350px)"
}: OptimizedDroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${id}`,
  });

  const hexColor = getTailwindColor(color);
  
  // Calcular valor total da coluna
  const totalValue = useMemo(() => 
    orders.reduce((sum, order) => sum + (order.value || 0), 0),
    [orders]
  );

  const handleCardClick = useCallback((orderId: string) => {
    onCardClick(orderId);
  }, [onCardClick]);

  // Ordenar por prioridade e data
  const sortedOrders = useMemo(() => {
    const priorityOrder = { urgente: 0, alta: 1, normal: 2, baixa: 3 };
    return [...orders].sort((a, b) => {
      const priorityDiff = (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2) - 
                          (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [orders]);

  return (
    <div className="flex-shrink-0 w-[320px] flex flex-col">
      {/* Header fixo */}
      <div 
        className="flex items-center justify-between mb-2 p-2 rounded-lg sticky top-0 z-10"
        style={{ backgroundColor: `${hexColor}20` }}
      >
        <div className="flex items-center gap-2">
          <span 
            className="w-2.5 h-2.5 rounded-full" 
            style={{ backgroundColor: hexColor }}
          />
          <span className="font-medium text-sm">{title}</span>
        </div>
        <span className="text-xs font-medium bg-background px-2 py-0.5 rounded-full shadow-sm">
          {orders.length}
        </span>
      </div>
      
      {/* Valor total da coluna */}
      {totalValue > 0 && (
        <div className="mb-2 px-3 py-1.5 rounded-md bg-emerald-500/15 text-center">
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
          </span>
        </div>
      )}
      
      {/* Área de drop com scroll nativo */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-lg transition-all duration-200 border-2 border-dashed overflow-y-auto",
          isOver 
            ? "bg-primary/10 border-primary shadow-lg" 
            : "border-transparent hover:border-muted-foreground/20"
        )}
        style={{ maxHeight }}
      >
        <div className="space-y-2 p-2">
          {sortedOrders.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
              Arraste itens aqui
            </div>
          ) : (
            sortedOrders.map((order) => (
              <DraggableCard
                key={order.id}
                order={order}
                onClick={() => handleCardClick(order.id)}
                automationAlert={automationAlerts?.get(order.id)}
              />
            ))
          )}
        </div>
      </div>
      
      {/* Indicador de quantidade se tem muitos itens */}
      {orders.length > 5 && (
        <div className="text-center py-1">
          <span className="text-[10px] text-muted-foreground">
            Role para ver {orders.length} itens
          </span>
        </div>
      )}
    </div>
  );
}

export const OptimizedDroppableColumn = memo(OptimizedDroppableColumnComponent);
