import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useModulesConfig, useToggleModuleVisibility, CATEGORY_META, MODULE_ROUTE_MAP } from "@/hooks/useModulesConfig";
import { usePermissionsContext } from "@/contexts/PermissionsContext";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";
import { Crown } from "lucide-react";
import { toast } from "sonner";

export default function ConfiguracoesModulos() {
  const ctx = usePermissionsContext() as any;
  const { profile } = useAuth();
  const { data: modules = [], isLoading } = useModulesConfig();
  const toggle = useToggleModuleVisibility();

  const isMasterOwner = profile?.is_owner === true || ctx?.isOwner === true;
  if (ctx?.isLoading) return null;
  if (!isMasterOwner) return <Navigate to="/" replace />;

  const grouped = useMemo(() => {
    const map = new Map<string, typeof modules>();
    modules.forEach((m) => {
      if (!map.has(m.category)) map.set(m.category, [] as any);
      map.get(m.category)!.push(m as any);
    });
    return Array.from(map.entries())
      .map(([cat, items]) => ({
        category: cat,
        label: CATEGORY_META[cat]?.label ?? cat,
        order: CATEGORY_META[cat]?.order ?? 999,
        items: items.sort((a, b) => a.label.localeCompare(b.label)),
      }))
      .sort((a, b) => a.order - b.order);
  }, [modules]);

  const handleToggle = async (module_key: string, visible: boolean) => {
    try {
      await toggle.mutateAsync({ module_key, visible_in_menu: visible });
      toast.success(visible ? "Módulo ativado no menu" : "Módulo ocultado do menu");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e?.message ?? "desconhecido"));
    }
  };

  const visibleCount = modules.filter((m) => m.visible_in_menu).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Crown className="h-7 w-7 text-amber-500" />
              Módulos do Sistema
            </h1>
            <p className="text-muted-foreground mt-1">
              Controle quais módulos aparecem no menu. Rotas continuam acessíveis por URL direta — esconder aqui só limpa a navegação.
            </p>
          </div>
          <Badge variant="secondary" className="text-base px-3 py-1 whitespace-nowrap">
            {visibleCount} / {modules.length} visíveis
          </Badge>
        </div>

        {isLoading && <p className="text-muted-foreground">Carregando…</p>}

        {grouped.map((group) => (
          <Card key={group.category}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{group.label}</span>
                <Badge variant="outline">{group.items.filter((i) => i.visible_in_menu).length} ativos</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {group.items.map((m) => {
                const route = MODULE_ROUTE_MAP[m.module_key];
                return (
                  <div
                    key={m.module_key}
                    className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{m.label}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        {m.module_key} {route ? `→ ${route}` : "· (sem rota mapeada)"}
                      </div>
                    </div>
                    <Switch
                      checked={m.visible_in_menu}
                      onCheckedChange={(v) => handleToggle(m.module_key, v)}
                      disabled={toggle.isPending}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
