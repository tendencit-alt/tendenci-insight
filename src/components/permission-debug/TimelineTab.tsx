import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle } from "lucide-react";
import { useDenialAnalytics } from "@/hooks/usePermissionDenials";

export function TimelineTab() {
  const { isLoading, total, topPermissions, topModules, raw } = useDenialAnalytics(30);

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin mx-auto" />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Total negações (30d)</CardTitle></CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{total}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Top permissões</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {topPermissions.map(([k, n]) => (
            <div key={k} className="flex justify-between text-sm">
              <span className="truncate">{k}</span>
              <Badge variant="secondary">{n}</Badge>
            </div>
          ))}
          {topPermissions.length === 0 && <p className="text-xs text-muted-foreground">Sem dados.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Top módulos</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {topModules.map(([k, n]) => (
            <div key={k} className="flex justify-between text-sm">
              <span>{k}</span>
              <Badge variant="secondary">{n}</Badge>
            </div>
          ))}
          {topModules.length === 0 && <p className="text-xs text-muted-foreground">Sem dados.</p>}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader><CardTitle className="text-base">Tentativas recentes</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
          {raw.slice(0, 30).map((d) => (
            <div key={d.id} className="flex items-center gap-3 p-2 rounded border bg-card text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <div className="flex-1">
                <p className="font-medium">{d.permission_key}</p>
                <p className="text-xs text-muted-foreground">
                  {d.module ?? "—"} • {new Date(d.attempted_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          {raw.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma tentativa registrada.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
