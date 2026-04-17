import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useCompanyOverview, useFeatureFlagsWithOverrides } from "@/hooks/useSaasAdmin";
import { Boxes } from "lucide-react";
import { AdminActionDialog } from "./AdminActionDialog";

export function ModulesTab() {
  const { data: companies = [] } = useCompanyOverview();
  const [tenantId, setTenantId] = useState<string | undefined>();
  const { data: flags = [] } = useFeatureFlagsWithOverrides(tenantId);
  const [dialog, setDialog] = useState<{ flag_id: string; enabled: boolean; flag_name: string } | null>(null);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Boxes className="h-5 w-5" />Controle de Módulos e Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={tenantId} onValueChange={setTenantId}>
            <SelectTrigger className="max-w-md"><SelectValue placeholder="Selecione uma empresa..." /></SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.tenant_id} value={c.tenant_id}>{c.tenant_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {tenantId && (
            <div className="space-y-2 pt-2">
              {flags.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-3 rounded-md border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{f.flag_name}</span>
                      {f.category && <Badge variant="outline" className="text-xs">{f.category}</Badge>}
                      {f.override_enabled !== null && <Badge variant="secondary" className="text-xs">Override ativo</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.description ?? f.flag_key}</p>
                  </div>
                  <Switch
                    checked={f.effective_enabled}
                    onCheckedChange={(v) => setDialog({ flag_id: f.id, enabled: v, flag_name: f.flag_name })}
                  />
                </div>
              ))}
              {flags.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma feature flag cadastrada.</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {dialog && tenantId && (
        <AdminActionDialog
          open={!!dialog}
          onOpenChange={(v) => !v && setDialog(null)}
          action="toggle_module"
          title={`${dialog.enabled ? "Ativar" : "Desativar"} ${dialog.flag_name}`}
          description={`Esta alteração será aplicada como override de tenant.`}
          target_tenant_id={tenantId}
          payload={{ flag_id: dialog.flag_id, enabled: dialog.enabled }}
        />
      )}
    </div>
  );
}
