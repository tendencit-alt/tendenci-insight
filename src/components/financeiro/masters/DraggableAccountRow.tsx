import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronRight, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface DraggableAccountRowProps {
  account: any;
  isSelected: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onToggleExpand: (id: string) => void;
  onEdit: (account: any) => void;
  onDelete: (account: any) => void;
  getLevelBadge: (depth: number) => React.ReactNode;
  getNatureBadge: (nature: string) => React.ReactNode;
  isDragOverlay?: boolean;
}

export function DraggableAccountRow({
  account,
  isSelected,
  isExpanded,
  hasChildren,
  onSelect,
  onToggleExpand,
  onEdit,
  onDelete,
  getLevelBadge,
  getNatureBadge,
  isDragOverlay = false,
}: DraggableAccountRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: account.id,
    disabled: isDragOverlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const paddingLeft = account.depth * 24;

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        isSelected && "bg-muted/50",
        hasChildren && "bg-muted/30",
        isDragging && "z-50 shadow-lg bg-background",
        isDragOverlay && "shadow-2xl bg-background border-2 border-primary"
      )}
    >
      <TableCell className="w-8 p-0">
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "flex items-center justify-center h-full w-8 cursor-grab active:cursor-grabbing",
            "text-muted-foreground hover:text-foreground transition-colors"
          )}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      </TableCell>
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(account.id, !!checked)}
          aria-label={`Selecionar ${account.name}`}
        />
      </TableCell>
      <TableCell
        className="font-medium"
        style={{ paddingLeft: `${paddingLeft + 16}px` }}
      >
        <div className="flex items-center gap-1">
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-muted"
              onClick={() => onToggleExpand(account.id)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <span className="w-6" />
          )}
          <span
            className={cn(
              account.depth === 0 && "text-foreground font-bold",
              account.depth === 1 && "text-foreground/90 font-semibold",
              account.depth >= 2 && "text-muted-foreground"
            )}
          >
            {account.code}
          </span>
        </div>
      </TableCell>
      <TableCell>{getLevelBadge(account.depth)}</TableCell>
      <TableCell>
        <span
          className={cn(
            account.depth === 0 && "font-bold",
            account.depth === 1 && "font-semibold",
            account.depth >= 2 && "text-muted-foreground"
          )}
        >
          {account.name}
        </span>
      </TableCell>
      <TableCell>{getNatureBadge(account.nature)}</TableCell>
      <TableCell>
        {account.in_dre ? (
          <Badge variant="outline" className="text-green-600 border-green-600">
            Sim
          </Badge>
        ) : (
          <Badge variant="outline">Não</Badge>
        )}
      </TableCell>
      <TableCell>
        {account.in_cashflow ? (
          <Badge variant="outline" className="text-green-600 border-green-600">
            Sim
          </Badge>
        ) : (
          <Badge variant="outline">Não</Badge>
        )}
      </TableCell>
      <TableCell>
        {account.active ? (
          <Badge className="bg-green-600">Ativa</Badge>
        ) : (
          <Badge variant="secondary">Inativa</Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(account)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(account)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
