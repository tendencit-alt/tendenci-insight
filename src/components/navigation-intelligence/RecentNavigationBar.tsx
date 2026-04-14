import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Star, ChevronRight } from "lucide-react";
import { useNavigationIntelligence } from "@/hooks/useNavigationIntelligence";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

export function RecentNavigationBar() {
  const navigate = useNavigate();
  const { recentHistory, adaptiveFavorites } = useNavigationIntelligence();

  if (recentHistory.length === 0 && adaptiveFavorites.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
      {/* Recent */}
      {recentHistory.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 rounded-md shrink-0 text-muted-foreground">
              <Clock className="h-3 w-3" /> Recentes
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-52 p-1.5">
            <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider px-2 py-1">Últimos Acessos</p>
            {recentHistory.map((r: any, i: number) => (
              <button
                key={`${r.label}-${i}`}
                onClick={() => navigate(r.route)}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs hover:bg-muted/60 transition-colors"
              >
                <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{r.label}</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
              </button>
            ))}
          </PopoverContent>
        </Popover>
      )}

      {/* Adaptive favorites as inline chips */}
      {adaptiveFavorites.slice(0, 4).map((path) => {
        const label = path.split("/").filter(Boolean).pop() || "Home";
        const formatted = label.charAt(0).toUpperCase() + label.slice(1).replace(/-/g, " ");
        return (
          <Badge
            key={path}
            variant="outline"
            className="text-[9px] h-5 cursor-pointer hover:bg-muted/60 transition-colors shrink-0 gap-1"
            onClick={() => navigate(path)}
          >
            <Star className="h-2.5 w-2.5 text-amber-500" />
            {formatted}
          </Badge>
        );
      })}
    </div>
  );
}
