import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowRight,
  ArrowDown,
  AlertTriangle,
  Clock,
  Database,
  GitBranch,
  History,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LineageOrigin {
  origin_type: string;
  origin_id: string;
  impact_type: string;
  impact_layer: string;
  linked_at: string;
  status: string;
}

interface LineageDestination {
  financial_entry_id: string | null;
  payable_id: string | null;
  impact_type: string;
  impact_layer: string;
  linked_at: string;
}

interface AuditEntry {
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  event_type: string;
  user_id: string | null;
  created_at: string;
}

interface QualityWarning {
  id: string;
  warning_type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  status: string;
  created_at: string;
}

interface LineageData {
  entity_type: string;
  entity_id: string;
  origins: LineageOrigin[];
  destinations: LineageDestination[];
  audit_history: AuditEntry[];
  quality_warnings: QualityWarning[];
}

interface Props {
  entityType: string;
  entityId: string;
  compact?: boolean;
}

const ENTITY_LABELS: Record<string, string> = {
  order: "Pedido",
  fin_ledger_entry: "Lançamento Financeiro",
  financial_entry: "Lançamento Financeiro",
  payable: "Conta a Pagar",
  receivable: "Conta a Receber",
  invoice: "Nota Fiscal",
  manual: "Manual",
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-100 text-blue-800 border-blue-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

export function DataLineageTimeline({ entityType, entityId, compact = false }: Props) {
  const [data, setData] = useState<LineageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const { data: result, error: rpcError } = await supabase.rpc("get_record_lineage", {
        p_entity_type: entityType,
        p_entity_id: entityId,
      });
      if (cancelled) return;
      if (rpcError) {
        setError(rpcError.message);
      } else {
        setData(result as unknown as LineageData);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [entityType, entityId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-destructive/50 bg-destructive/5">
        <p className="text-sm text-destructive">Erro ao carregar linhagem: {error}</p>
      </Card>
    );
  }

  if (!data) return null;

  const hasAnyData =
    data.origins.length > 0 ||
    data.destinations.length > 0 ||
    data.audit_history.length > 0 ||
    data.quality_warnings.length > 0;

  if (!hasAnyData) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhum rastro de fluxo encontrado para este registro.</p>
      </Card>
    );
  }

  return (
    <ScrollArea className={compact ? "h-[500px]" : "h-auto"}>
      <div className="space-y-6 pr-4">
        {/* Avisos de qualidade */}
        {data.quality_warnings.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Avisos de Qualidade ({data.quality_warnings.length})
            </h3>
            <div className="space-y-2">
              {data.quality_warnings.map((w) => (
                <Card key={w.id} className={`p-3 border ${SEVERITY_COLORS[w.severity] || ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <Badge variant="outline" className="text-xs mb-1">
                        {w.warning_type}
                      </Badge>
                      <p className="text-sm">{w.message}</p>
                    </div>
                    <span className="text-xs opacity-70 whitespace-nowrap">
                      {format(new Date(w.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Origens (de onde veio) */}
        {data.origins.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <GitBranch className="h-4 w-4 text-primary rotate-180" />
              De onde veio ({data.origins.length})
            </h3>
            <div className="space-y-2">
              {data.origins.map((o, i) => (
                <Card key={i} className="p-3 border-l-4 border-l-primary/60">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">
                      {ENTITY_LABELS[o.origin_type] || o.origin_type}
                    </Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-mono text-xs">{o.origin_id.slice(0, 8)}…</span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {o.impact_layer}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {format(new Date(o.linked_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    <span>•</span>
                    <span>{o.impact_type}</span>
                    <span>•</span>
                    <span>status: {o.status}</span>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Destinos (para onde foi) */}
        {data.destinations.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <ArrowDown className="h-4 w-4 text-primary" />
              Para onde foi ({data.destinations.length})
            </h3>
            <div className="space-y-2">
              {data.destinations.map((d, i) => (
                <Card key={i} className="p-3 border-l-4 border-l-emerald-500/60">
                  <div className="flex items-center gap-2 flex-wrap">
                    {d.financial_entry_id && (
                      <Badge variant="secondary">Lançamento Financeiro</Badge>
                    )}
                    {d.payable_id && <Badge variant="secondary">Conta a Pagar</Badge>}
                    <Badge variant="outline" className="text-xs ml-auto">
                      {d.impact_layer}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {format(new Date(d.linked_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    <span>•</span>
                    <span>{d.impact_type}</span>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Auditoria */}
        {data.audit_history.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <History className="h-4 w-4 text-muted-foreground" />
              Histórico de alterações ({data.audit_history.length})
            </h3>
            <div className="space-y-2">
              {data.audit_history.map((a, i) => (
                <Card key={i} className="p-3 text-xs">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {a.event_type}
                    </Badge>
                    <span className="font-medium">{a.field_name}</span>
                    <span className="ml-auto text-muted-foreground">
                      {format(new Date(a.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {(a.old_value || a.new_value) && (
                    <div className="font-mono text-xs bg-muted/50 rounded p-2 space-y-0.5">
                      {a.old_value && (
                        <div>
                          <span className="text-red-600">−</span> {a.old_value}
                        </div>
                      )}
                      {a.new_value && (
                        <div>
                          <span className="text-green-600">+</span> {a.new_value}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </ScrollArea>
  );
}
