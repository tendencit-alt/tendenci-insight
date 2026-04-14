import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useActivityFeed, type ActivitySector, type ActivityScope } from "@/hooks/useActivityFeed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity, Filter, User, Users, Building2,
  DollarSign, ShoppingCart, Factory, BookOpen, Settings,
  AlertTriangle, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// ── Sector config ──
const SECTOR_CONFIG: Record<ActivitySector, { label: string; icon: any; color: string }> = {
  all: { label: "Todos", icon: Activity, color: "text-muted-foreground" },
  financeiro: { label: "Financeiro", icon: DollarSign, color: "text-emerald-400" },
  comercial: { label: "Comercial", icon: ShoppingCart, color: "text-blue-400" },
  operacoes: { label: "Operações", icon: Factory, color: "text-orange-400" },
  controladoria: { label: "Controladoria", icon: BookOpen, color: "text-purple-400" },
  sistema: { label: "Sistema", icon: Settings, color: "text-muted-foreground" },
};

const SCOPE_OPTIONS: { value: ActivityScope; label: string; icon: any }[] = [
  { value: "mine", label: "Minhas", icon: User },
  { value: "company", label: "Empresa", icon: Building2 },
];

interface ActivityFeedProps {
  compact?: boolean;
  maxItems?: number;
  showFilters?: boolean;
  className?: string;
  initialSector?: ActivitySector;
}

export function ActivityFeed({
  compact = false,
  maxItems = 20,
  showFilters = true,
  className,
  initialSector = "all",
}: ActivityFeedProps) {
  const [sector, setSector] = useState<ActivitySector>(initialSector);
  const [scope, setScope] = useState<ActivityScope>("company");
  const { events, isLoading } = useActivityFeed({ sector, scope, limit: maxItems });

  const displayEvents = useMemo(() => events.slice(0, maxItems), [events, maxItems]);

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: compact ? 3 : 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Filters */}
      {showFilters && !compact && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border/50">
          {/* Sector filters */}
          <div className="flex items-center gap-1">
            {(Object.keys(SECTOR_CONFIG) as ActivitySector[]).map(s => {
              const cfg = SECTOR_CONFIG[s];
              const Icon = cfg.icon;
              return (
                <Button
                  key={s}
                  variant={sector === s ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-[11px] gap-1 px-2"
                  onClick={() => setSector(s)}
                >
                  <Icon className={cn("h-3 w-3", sector === s ? cfg.color : "text-muted-foreground")} />
                  {cfg.label}
                </Button>
              );
            })}
          </div>
          {/* Scope */}
          <div className="flex items-center gap-1 ml-auto">
            {SCOPE_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <Button
                  key={opt.value}
                  variant={scope === opt.value ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-[11px] gap-1 px-2"
                  onClick={() => setScope(opt.value)}
                >
                  <Icon className="h-3 w-3" />
                  {opt.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Events list */}
      <ScrollArea className={compact ? "max-h-[280px]" : "max-h-[500px]"}>
        <div className="divide-y divide-border/30">
          {displayEvents.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma atividade encontrada.
            </div>
          )}
          {displayEvents.map(event => {
            const sectorCfg = SECTOR_CONFIG[event.sector];
            const SectorIcon = sectorCfg.icon;
            const timeAgo = formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: ptBR });

            return (
              <div
                key={event.id}
                className={cn(
                  "flex items-start gap-3 px-3 py-2 transition-colors hover:bg-muted/30",
                  event.isCritical && "bg-destructive/5 border-l-2 border-l-destructive/40"
                )}
              >
                {/* Icon */}
                <div className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full bg-muted/60 flex-shrink-0 mt-0.5",
                  event.isCritical && "bg-destructive/10"
                )}>
                  {event.isCritical ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  ) : (
                    <SectorIcon className={cn("h-3.5 w-3.5", sectorCfg.color)} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[13px] truncate",
                      event.isCritical ? "font-semibold text-foreground" : "text-foreground/80"
                    )}>
                      {event.label}
                    </span>
                    {event.isCritical && (
                      <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                        Crítico
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {timeAgo}
                    </span>
                    {event.financialImpact !== null && event.financialImpact !== 0 && (
                      <span className={cn(
                        "text-[10px] font-mono font-medium px-1.5 rounded",
                        event.financialImpact > 0 ? "text-emerald-500 bg-emerald-500/10" : "text-destructive bg-destructive/10"
                      )}>
                        {event.financialImpact > 0 ? "+" : ""}
                        {event.financialImpact.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    )}
                    {!compact && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-border/50">
                        {sectorCfg.label}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

/** Compact mini feed for HomeLauncher */
export function MiniActivityFeed({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border/50 bg-card overflow-hidden", className)}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-muted/20">
        <Activity className="h-3.5 w-3.5 text-primary" />
        <span className="text-[12px] font-semibold text-foreground/80">Atividade Recente</span>
      </div>
      <ActivityFeed compact maxItems={8} showFilters={false} />
    </div>
  );
}
