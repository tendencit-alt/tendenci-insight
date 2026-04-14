import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Eye, History, Lock, UserCog } from "lucide-react";
import GovProfilesTab from "@/components/governance/GovProfilesTab";
import GovScopeTab from "@/components/governance/GovScopeTab";
import GovAuditTab from "@/components/governance/GovAuditTab";
import GovSecurityTab from "@/components/governance/GovSecurityTab";
import GovUsersTab from "@/components/governance/GovUsersTab";

export default function AccessGovernance() {
  const [activeTab, setActiveTab] = useState("profiles");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Access Governance</h1>
            <p className="text-xs text-muted-foreground">Controle de perfis, permissões, escopo de dados e segurança multi-tenant</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card border border-border p-1 h-auto flex-wrap">
            <TabsTrigger value="profiles" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <UserCog className="h-4 w-4" />Perfis & Permissões
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-4 w-4" />Usuários
            </TabsTrigger>
            <TabsTrigger value="scope" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Eye className="h-4 w-4" />Escopo & Críticas
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <History className="h-4 w-4" />Auditoria
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Lock className="h-4 w-4" />Segurança
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profiles"><GovProfilesTab /></TabsContent>
          <TabsContent value="users"><GovUsersTab /></TabsContent>
          <TabsContent value="scope"><GovScopeTab /></TabsContent>
          <TabsContent value="audit"><GovAuditTab /></TabsContent>
          <TabsContent value="security"><GovSecurityTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
