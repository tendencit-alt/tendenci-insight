import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { WebhookSettings } from "@/components/projects/WebhookSettings";
import { N8nIntegrationGuide } from "@/components/settings/N8nIntegrationGuide";
import { ImportDataGuide } from "@/components/settings/ImportDataGuide";
import { ImportArchitectsData } from "@/components/settings/ImportArchitectsData";
import { DeletedRecordsTab } from "@/components/settings/DeletedRecordsTab";
import { UsersTab } from "@/components/settings/UsersTab";
import { ProfileTypesManager } from "@/components/settings/ProfileTypesManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tags } from "lucide-react";

const ProjectSettings = () => {
  const navigate = useNavigate();
  const { isMaster } = usePermissions();

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/projects")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              ⚙️ Configurações de Projetos
            </h1>
            <p className="text-muted-foreground text-lg">
              Configure integrações e automações para o módulo de projetos
            </p>
          </div>
        </div>

        {/* Settings Sections */}
        <Tabs defaultValue="architects" className="w-full">
          <TabsList className={`grid w-full ${isMaster ? 'grid-cols-7' : 'grid-cols-5'}`}>
            <TabsTrigger value="architects">👥 Arquitetos</TabsTrigger>
            <TabsTrigger value="import">📥 Importar Dados</TabsTrigger>
            <TabsTrigger value="n8n">🤖 Integração n8n</TabsTrigger>
            <TabsTrigger value="n8n-tasks">⚡ n8n Tarefas</TabsTrigger>
            <TabsTrigger value="webhooks">🔗 Webhooks</TabsTrigger>
            {isMaster && <TabsTrigger value="users">🔐 Acessos</TabsTrigger>}
            {isMaster && <TabsTrigger value="deleted" className="flex items-center gap-1.5">
              <Trash2 className="h-4 w-4" />
              Excluídos
            </TabsTrigger>}
          </TabsList>

          <TabsContent value="architects" className="space-y-6 pt-6">
            <ImportArchitectsData />
          </TabsContent>

          <TabsContent value="import" className="space-y-6 pt-6">
            <ImportDataGuide />
          </TabsContent>

          <TabsContent value="n8n" className="space-y-6 pt-6">
            <N8nIntegrationGuide />
          </TabsContent>

          <TabsContent value="n8n-tasks" className="space-y-6 pt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  ⚡ Automação de Tarefas via n8n
                </CardTitle>
                <CardDescription>
                  Configure o fluxo n8n para envio automático de mensagens WhatsApp baseado em tarefas agendadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => window.open('/n8n-tarefas', '_blank')}
                  className="w-full sm:w-auto gap-2"
                >
                  📖 Abrir Documentação Completa
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-6 pt-6">
            <WebhookSettings />
          </TabsContent>

          {isMaster && (
            <TabsContent value="users" className="space-y-6 pt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Gerenciamento de Acessos e Permissões
                  </CardTitle>
                  <CardDescription>
                    Configure níveis de acesso, permissões por módulo e controle de usuários do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Recursos disponíveis:</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                      <li>Definir usuários como Master ou Vendedor</li>
                      <li>Limitar acesso a módulos específicos</li>
                      <li>Configurar visualização de dados por vendedor</li>
                      <li>Ativar/desativar usuários</li>
                      <li>Ver resumo completo de permissões</li>
                    </ul>
                  </div>
                  
                  <Button 
                    onClick={() => navigate('/settings/users')}
                    className="w-full sm:w-auto gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Acessar Gerenciamento Completo
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {isMaster && (
            <TabsContent value="deleted" className="space-y-6 pt-6">
              <DeletedRecordsTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ProjectSettings;
