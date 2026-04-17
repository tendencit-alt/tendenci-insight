import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useModuleDetail } from "@/hooks/useIntegrationMap";
import { ArrowDownToLine, ArrowUpFromLine, Activity, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_BADGE: Record<string, { label: string; className: string; icon: any }> = {
  green: { label: "Saudável", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: CheckCircle2 },
  yellow: { label: "Atenção", className: "bg-amber-500/15 text-amber-600 border-amber-500/30", icon: Clock },
  red: { label: "Erro", className: "bg-destructive/15 text-destructive border-destructive/30", icon: AlertTriangle },
  gray: { label: "Sem dados", className: "bg-muted text-muted-foreground border-border", icon: Activity },
};

interface Props {
  moduleCode: string | null;
  onClose: () => void;
}

export function ModuleDetailDrawer({ moduleCode, onClose }: Props) {
  const { data, isLoading } = useModuleDetail(moduleCode);

  return (
    <Sheet open={!!moduleCode} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{(data as any)?.module?.name || "Módulo"}</SheetTitle>
          <SheetDescription>
            {(data as any)?.module?.description || "Detalhe das integrações"}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="mt-4 h-[calc(100vh-120px)] pr-3">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : data ? (
            <div className="space-y-5">
              <RelationList
                title="Alimenta (saída)"
                icon={<ArrowUpFromLine className="h-4 w-4 text-primary" />}
                relations={(data as any).outgoing || []}
                direction="out"
              />
              <RelationList
                title="Depende de (entrada)"
                icon={<ArrowDownToLine className="h-4 w-4 text-primary" />}
                relations={(data as any).incoming || []}
                direction="in"
              />

              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Activity className="h-4 w-4 text-primary" /> Eventos recentes
                </h3>
                <div className="space-y-1.5">
                  {((data as any).recent_events || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem eventos registrados.</p>
                  ) : (
                    ((data as any).recent_events || []).map((ev: any) => {
                      const cfg = STATUS_BADGE[ev.status] || STATUS_BADGE.gray;
                      const Icon = cfg.icon;
                      return (
                        <div key={ev.id} className="rounded border border-border/50 p-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Icon className="h-3 w-3" />
                              <span className="text-[11px] font-mono">{ev.source} → {ev.target}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true, locale: ptBR })}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{ev.message || ev.event_type}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function RelationList({ title, icon, relations, direction }: { title: string; icon: React.ReactNode; relations: any[]; direction: "in" | "out" }) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">{icon} {title}</h3>
      {relations.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma relação.</p>
      ) : (
        <div className="space-y-1.5">
          {relations.map((r: any, i: number) => {
            const cfg = STATUS_BADGE[r.status] || STATUS_BADGE.gray;
            const otherName = direction === "out" ? r.target_name : r.source_name;
            return (
              <div key={i} className="flex items-center justify-between rounded border border-border/50 p-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>{cfg.label}</Badge>
                  <span className="text-xs font-medium">{otherName}</span>
                  {r.criticality === "high" && (
                    <Badge variant="outline" className="text-[9px]">crítico</Badge>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono text-muted-foreground">score {r.health_score}</p>
                  {r.delay_minutes != null && (
                    <p className="text-[9px] text-muted-foreground">{r.delay_minutes}m atraso</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
