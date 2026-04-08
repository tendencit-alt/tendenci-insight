import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UsersTab } from "@/components/settings/UsersTab";
import { ProfileTypesManager } from "@/components/settings/ProfileTypesManager";
import { CompanySettingsTab } from "@/components/settings/CompanySettingsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/usePermissions";
import { Users, Tags, Building2 } from "lucide-react";

const ProjectSettings = () => {
  const navigate = useNavigate();
  const { isMaster } = usePermissions();

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/bi-dashboard")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              ⚙️ Configurações
            </h1>
            <p className="text-muted-foreground text-lg">
              Gerencie usuários e permissões do sistema
            </p>
          </div>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className={`grid w-full ${isMaster ? 'grid-cols-3' : 'grid-cols-1'}`}>
            <TabsTrigger value="users" className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            {isMaster && (
              <TabsTrigger value="types" className="flex items-center gap-1.5">
                <Tags className="h-4 w-4" />
                Tipos de Perfil
              </TabsTrigger>
            )}
            {isMaster && (
              <TabsTrigger value="empresa" className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                Empresa
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="users" className="space-y-6 pt-6">
            <UsersTab />
          </TabsContent>

          {isMaster && (
            <TabsContent value="types" className="space-y-6 pt-6">
              <ProfileTypesManager />
            </TabsContent>
          )}

          {isMaster && (
            <TabsContent value="empresa" className="space-y-6 pt-6">
              <CompanySettingsTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ProjectSettings;
