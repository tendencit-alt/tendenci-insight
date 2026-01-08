import { useDroppable } from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DroppableColumnProps {
  id: string;
  title: string;
  count: number;
  value: string;
  variant?: "default" | "won" | "lost";
  children: React.ReactNode;
}

export function DroppableColumn({ 
  id, 
  title, 
  count, 
  value, 
  variant = "default",
  children 
}: DroppableColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `column-${id}`,
  });

  const getVariantStyles = () => {
    switch (variant) {
      case "won":
        return {
          card: cn(
            "bg-gradient-to-br from-success/5 to-success/10 border-success/30 hover:border-success/50",
            isOver && "border-success ring-2 ring-success/30"
          ),
          title: "text-success",
          badge: "bg-success hover:bg-success/90",
          valueText: "text-success",
          emptyBorder: "border-success/20",
        };
      case "lost":
        return {
          card: cn(
            "bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/30 hover:border-destructive/50",
            isOver && "border-destructive ring-2 ring-destructive/30"
          ),
          title: "text-destructive",
          badge: "bg-destructive hover:bg-destructive/90",
          valueText: "text-destructive",
          emptyBorder: "border-destructive/20",
        };
      default:
        return {
          card: cn(
            "border-border/50",
            isOver && "border-primary ring-2 ring-primary/30"
          ),
          title: "",
          badge: "",
          valueText: "text-primary",
          emptyBorder: "border-muted",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Card 
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 hover:shadow-md transition-all duration-300 animate-fade-in w-[220px]",
        styles.card
      )}
    >
      <CardHeader className="pb-1.5 px-2 pt-2 space-y-0">
        <CardTitle className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-1.5">
            <span className={cn("truncate font-semibold text-xs", styles.title)}>{title}</span>
            <Badge 
              variant={variant === "default" ? "secondary" : undefined}
              className={cn("flex-shrink-0 font-bold text-[10px] h-4 px-1.5", styles.badge)}
            >
              {count}
            </Badge>
          </div>
          {(count > 0 || variant === "default") && (
            <span className={cn("text-[10px] font-semibold", styles.valueText)}>
              {variant === "won" && "💰 "}
              {variant === "lost" && "💸 "}
              {value}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent 
        className="space-y-1.5 px-2 pb-2 overflow-y-auto"
        style={{ maxHeight: '320px' }}
      >
        {children}
      </CardContent>
    </Card>
  );
}