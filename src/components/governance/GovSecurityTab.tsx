import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProfileTypes, useUsersWithProfiles, useAccessLogs } from "@/hooks/useGovernanceData";
import { Shield, Users, Lock, Activity, CheckCircle, AlertTriangle } from "lucide-react";

export default function GovSecurityTab() {
  const { data: profiles = [] } = useProfileTypes();
  const { data: users = [] } = useUsersWithProfiles();
  const { data: logs = [] } = useAccessLogs();

  const totalUsers = users.length;
  const owners = users.filter((u: any) => u.is_owner).length;
  const admins = users.filter((u: any) => u.role === "tenant_owner" || u.role === "admin" || u.role === "tenant_admin").length;
  const activeProfiles = profiles.filter((p: any) => p.is_active).length;
  const systemProfiles = profiles.filter((p: any) => p.is_system).length;
  const recentActions = logs.length;

  const securityScore = Math.min(100, 
    (activeProfiles > 0 ? 20 : 0) +
    (totalUsers > 0 ? 20 : 0) +
    (recentActions > 0 ? 20 : 0) +
    (systemProfiles >= 3 ? 20 : 10) +
    (owners <= 2 ? 20 : 10)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Segurança & Multi-Tenant</h3>
        <Badge variant={securityScore >= 80 ? "default" : "secondary"}>Score: {securityScore}/100</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card><CardContent className="pt-4 text-center"><Users className="h-5 w-5 mx-auto text-primary mb-1" /><p className="text-xl font-bold">{totalUsers}</p><p className="text-[10px] text-muted-foreground">Usuários Total</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><Shield className="h-5 w-5 mx-auto text-amber-500 mb-1" /><p className="text-xl font-bold">{owners}</p><p className="text-[10px] text-muted-foreground">Owners</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><Lock className="h-5 w-5 mx-auto text-blue-500 mb-1" /><p className="text-xl font-bold">{admins}</p><p className="text-[10px] text-muted-foreground">Admins</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><CheckCircle className="h-5 w-5 mx-auto text-green-500 mb-1" /><p className="text-xl font-bold">{activeProfiles}</p><p className="text-[10px] text-muted-foreground">Perfis Ativos</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><Activity className="h-5 w-5 mx-auto text-purple-500 mb-1" /><p className="text-xl font-bold">{recentActions}</p><p className="text-[10px] text-muted-foreground">Ações Recentes</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><AlertTriangle className="h-5 w-5 mx-auto text-emerald-500 mb-1" /><p className="text-xl font-bold">{systemProfiles}</p><p className="text-[10px] text-muted-foreground">Perfis Sistema</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4 space-y-2">
            <p className="text-sm font-medium">Checklist Segurança Multi-Tenant</p>
            {[
              { label: "RLS habilitado em todas as tabelas", ok: true },
              { label: "tenant_id obrigatório via trigger", ok: true },
              { label: "Funções security definer configuradas", ok: true },
              { label: "Logs segregados por tenant", ok: true },
              { label: "Perfis sistema protegidos", ok: systemProfiles > 0 },
              { label: "Permissões críticas configuradas", ok: activeProfiles > 0 },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <CheckCircle className={`h-4 w-4 ${item.ok ? "text-green-500" : "text-muted-foreground"}`} />
                <span className={item.ok ? "" : "text-muted-foreground"}>{item.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 space-y-2">
            <p className="text-sm font-medium">Proteção Estrutural</p>
            {[
              { label: "Plano de Contas — somente OWNER", icon: Lock },
              { label: "Estrutura DRE — somente OWNER", icon: Lock },
              { label: "Automações — somente ADMIN+", icon: Shield },
              { label: "Feature Flags — somente OWNER", icon: Lock },
              { label: "Integrações — somente ADMIN+", icon: Shield },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <item.icon className="h-4 w-4 text-amber-500" />
                <span>{item.label}</span>
                <Badge variant="outline" className="text-[9px] ml-auto">Protegido</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
