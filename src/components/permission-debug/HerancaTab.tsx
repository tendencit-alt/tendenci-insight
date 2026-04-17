import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch } from "lucide-react";
import { usePermissionSimulation } from "@/contexts/PermissionSimulationContext";

/**
 * Mostra a árvore de composição da permissão para o perfil atualmente em simulação,
 * caso ativa, ou explica como funciona a herança.
 */
export function HerancaTab() {
  const sim = usePermissionSimulation();
  const eff = sim.effectivePermissions;
  const allowed = eff ? Object.entries(eff).filter(([, v]) => v).length : 0;
  const blocked = eff ? Object.entries(eff).filter(([, v]) => !v).length : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4" /> Composição de permissões
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 text-sm">
            <p className="font-medium">Camadas avaliadas, nesta ordem:</p>
            <ol className="list-decimal list-inside text-muted-foreground space-y-0.5">
              <li>Perfil base (profile_type)</li>
              <li>Permissões críticas concedidas (rbac_critical_permissions)</li>
              <li>Acesso ao módulo (permissions: view/create/edit/...)</li>
              <li>Restrições de escopo (rbac_scope_restrictions)</li>
              <li>Limites de valor / bloqueios estruturais</li>
              <li>Owner: bypass global implícito</li>
            </ol>
          </div>

          {sim.state.active && eff ? (
            <div className="border rounded-md p-3 bg-card space-y-2">
              <p className="text-sm font-medium">
                Simulação ativa: {sim.state.targetProfileName ?? sim.state.targetUserName ?? "perfil"}
              </p>
              <div className="flex gap-2">
                <Badge variant="default">{allowed} permitidas</Badge>
                <Badge variant="outline">{blocked} bloqueadas</Badge>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Inicie uma simulação ("Ver como…") para visualizar a árvore final efetiva.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
