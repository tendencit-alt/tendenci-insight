import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pin, X, ChevronUp, ChevronDown, ExternalLink, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WIDGET_REGISTRY } from "./widgetRegistry";
import { useAuth } from "@/contexts/AuthContext";
import { trackWidgetClick, trackWidgetView } from "@/hooks/useDashboardLayout";
import { useEffect } from "react";
import type { WidgetInstance, WidgetSize } from "./types";

interface Props {
  instance: WidgetInstance;
  children: React.ReactNode;
  onRemove: (id: string) => void;
  onResize: (id: string, size: WidgetSize) => void;
  onPin: (id: string) => void;
  onMove: (id: string, dir: "up" | "down") => void;
  editing?: boolean;
}

export function WidgetContainer({ instance, children, onRemove, onResize, onPin, onMove, editing }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const def = WIDGET_REGISTRY[instance.widgetId];

  useEffect(() => {
    if (user?.id) trackWidgetView(user.id, instance.widgetId);
  }, [user?.id, instance.widgetId]);

  if (!def) return null;
  const Icon = def.icon;

  const handleDrillDown = () => {
    if (def.drillPath) {
      if (user?.id) trackWidgetClick(user.id, instance.widgetId);
      navigate(def.drillPath);
    }
  };

  return (
    <Card
      className={cn(
        "group relative transition-all hover:shadow-md",
        instance.pinned && "ring-1 ring-primary/30",
        editing && "border-dashed"
      )}
    >
      <CardHeader className="pb-2 pt-3 px-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {def.title}
          {instance.pinned && <Pin className="h-2.5 w-2.5 text-primary" />}
        </CardTitle>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {def.drillPath && !editing && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleDrillDown}
              title="Aprofundar"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">{def.title}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onPin(instance.widgetId)}>
                <Pin className="h-3.5 w-3.5 mr-2" />
                {instance.pinned ? "Desafixar" : "Fixar"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMove(instance.widgetId, "up")}>
                <ChevronUp className="h-3.5 w-3.5 mr-2" /> Mover acima
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMove(instance.widgetId, "down")}>
                <ChevronDown className="h-3.5 w-3.5 mr-2" /> Mover abaixo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] text-muted-foreground">Tamanho</DropdownMenuLabel>
              {(["sm", "md", "lg", "xl"] as WidgetSize[]).map((s) => (
                <DropdownMenuItem key={s} onClick={() => onResize(instance.widgetId, s)}>
                  <Maximize2 className="h-3.5 w-3.5 mr-2" />
                  {s === "sm" ? "Pequeno" : s === "md" ? "Médio" : s === "lg" ? "Grande" : "Largura total"}
                  {instance.size === s && <span className="ml-auto text-primary">✓</span>}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onRemove(instance.widgetId)} className="text-destructive">
                <X className="h-3.5 w-3.5 mr-2" /> Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent
        className={cn("px-3 pb-3 pt-0", def.drillPath && !editing && "cursor-pointer")}
        onClick={def.drillPath && !editing ? handleDrillDown : undefined}
      >
        {children}
      </CardContent>
    </Card>
  );
}
