import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ProductionCard } from './ProductionCard';

interface DraggableProductionCardProps {
  order: any;
  onClick: () => void;
}

export function DraggableProductionCard({ order, onClick }: DraggableProductionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <ProductionCard 
        order={order}
        onClick={onClick}
        isDragging={isDragging}
      />
    </div>
  );
}
