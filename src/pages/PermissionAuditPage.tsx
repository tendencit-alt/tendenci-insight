import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ShieldAlert } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionDenials } from "@/hooks/usePermissionDenials";
import { usePermissionCatalog } from "@/hooks/usePermissionCatalog";
import { PermissionAnalyticsCard } from "@/components/smart-permissions/PermissionAnalyticsCard";

const MODULES = [
  { value: "all", label: "Todos os módulos" },
  { value: "financeiro", label: "Financeiro" },
  { value: "dre", label: "DRE" },
  { value: "fluxo_caixa", label: "Fluxo de Caixa" },
  { value: "cadastros", label: "Cadastros" },
  { value: "pedidos", label: "Pedidos" },
  { value: "planning", label: "Planejamento" },
  { value: "integracoes", label: "Integrações" },
];

export default function PermissionAuditPage() {
  const [moduleFilter, setModuleFilter] = useState("all");
  const [sinceDays, setSinceDays] = useState("30");

  const { data = [], isLoading } = usePermissionDenials({
    module: moduleFilter === "all" ? undefined : moduleFilter,
    sinceDays: Number(sinceDays),
  });
  const { data: catalog } = usePermissionCatalog();

  const labelFor = (key: string) =>
    catalog?.find((c) => c.permission_key === key)?.label ?? key;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Auditoria de permissões
            </h1>
            <p className="text-sm text-muted-foreground">
              Tentativas de acesso bloqueadas, perfis mais restritos e módulos com mais negativas.
            </p>
          </div>

          <div className="flex gap-2">
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODULES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sinceDays} onValueChange={setSinceDays}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <PermissionAnalyticsCard sinceDays={Number(sinceDays)} />
          </div>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">Histórico de bloqueios</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : data.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nenhum bloqueio registrado no período selecionado.
                </p>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2 pr-3">
                    {data.map((d) => (
                      <div key={d.id} className="rounded-md border bg-card p-3 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="destructive" className="text-[10px]">
                            Bloqueado
                          </Badge>
                          <span className="font-medium">{labelFor(d.permission_key)}</span>
                          {d.module && (
                            <Badge variant="outline" className="text-[10px]">
                              {d.module}
                            </Badge>
                          )}
                          <span className="ml-auto text-[10px] text-muted-foreground">
                            {format(new Date(d.attempted_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {d.user_id && (
                          <p className="mt-1 text-[10px] text-muted-foreground font-mono">
                            usuário {d.user_id.slice(0, 8)}…
                          </p>
                        )}
                        {d.context && Object.keys(d.context).length > 0 && (
                          <pre className="mt-1.5 rounded bg-muted/50 p-1.5 text-[10px] font-mono overflow-x-auto">
                            {JSON.stringify(d.context, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
