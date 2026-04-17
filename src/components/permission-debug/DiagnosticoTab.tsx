import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, ShieldX, Info } from "lucide-react";
import {
  useEvaluatePermission,
  useAllProfileTypes,
  useTenantsList,
  useUsersByTenant,
} from "@/hooks/usePermissionDebug";
import { usePermissionCatalog } from "@/hooks/usePermissionCatalog";

const ACTIONS = ["view", "create", "edit", "approve", "delete", "configure"] as const;

export function DiagnosticoTab() {
  const { data: tenants } = useTenantsList();
  const { data: profileTypes } = useAllProfileTypes();
  const { data: catalog } = usePermissionCatalog();
  const evaluate = useEvaluatePermission();

  const [tenantId, setTenantId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [profileTypeId, setProfileTypeId] = useState<string>("");
  const [moduleName, setModuleName] = useState<string>("");
  const [action, setAction] = useState<string>("view");
  const [permKey, setPermKey] = useState<string>("");

  const { data: users } = useUsersByTenant(tenantId || null);

  const modules = useMemo(() => {
    const set = new Set<string>();
    catalog?.forEach((c) => c.module && set.add(c.module));
    return Array.from(set).sort();
  }, [catalog]);

  const handleEvaluate = () => {
    evaluate.mutate({
      tenant_id: tenantId || null,
      target_user_id: userId || null,
      target_profile_type_id: !userId ? profileTypeId || null : null,
      module: moduleName || null,
      action: action || null,
      permission_key: permKey || null,
    });
  };

  const result = evaluate.data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Diagnóstico por usuário ou perfil</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Empresa</label>
            <Select value={tenantId} onValueChange={(v) => { setTenantId(v); setUserId(""); }}>
              <SelectTrigger><SelectValue placeholder="Selecione empresa" /></SelectTrigger>
              <SelectContent>
                {tenants?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Usuário (opcional)</label>
            <Select value={userId} onValueChange={setUserId} disabled={!tenantId}>
              <SelectTrigger><SelectValue placeholder="Selecione usuário" /></SelectTrigger>
              <SelectContent>
                {users?.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Perfil (se sem usuário)</label>
            <Select value={profileTypeId} onValueChange={setProfileTypeId} disabled={!!userId}>
              <SelectTrigger><SelectValue placeholder="Selecione perfil" /></SelectTrigger>
              <SelectContent>
                {profileTypes?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.display_name ?? p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Módulo</label>
            <Select value={moduleName} onValueChange={setModuleName}>
              <SelectTrigger><SelectValue placeholder="Selecione módulo" /></SelectTrigger>
              <SelectContent>
                {modules.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Ação</label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Permissão crítica (opcional)</label>
            <Select value={permKey} onValueChange={setPermKey}>
              <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>
                {catalog?.filter((c) => c.is_critical).map((c) => (
                  <SelectItem key={c.permission_key} value={c.permission_key}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <Button
              onClick={handleEvaluate}
              disabled={evaluate.isPending || (!userId && !profileTypeId)}
            >
              {evaluate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Avaliar permissão
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.decision === "allowed" ? (
                <><ShieldCheck className="h-5 w-5 text-emerald-500" /> Permitido</>
              ) : (
                <><ShieldX className="h-5 w-5 text-destructive" /> Negado</>
              )}
              <Badge variant="outline">{result.profile_name}</Badge>
              {result.user_name && <Badge variant="secondary">{result.user_name}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{result.reason}</p>
            <div className="space-y-2">
              {result.trace.map((t, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-md border bg-card">
                  {t.outcome === "pass" && <ShieldCheck className="h-4 w-4 text-emerald-500 mt-0.5" />}
                  {t.outcome === "fail" && <ShieldX className="h-4 w-4 text-destructive mt-0.5" />}
                  {t.outcome === "info" && <Info className="h-4 w-4 text-muted-foreground mt-0.5" />}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t.step}</p>
                    <p className="text-xs text-muted-foreground">{t.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
