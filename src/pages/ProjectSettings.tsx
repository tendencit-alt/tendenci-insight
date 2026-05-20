import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UsersTab } from "@/components/settings/UsersTab";
import { ProfileTypesManager } from "@/components/settings/ProfileTypesManager";
import { CompanySettingsTab } from "@/components/settings/CompanySettingsTab";
import { CustomizationSettings } from "@/components/settings/CustomizationSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Users, Tags, Building2, Palette, Landmark,
  FileSpreadsheet, FolderKanban, FolderCog, BriefcaseBusiness,
  CreditCard, Zap, Bot, Shield, Database,
} from "lucide-react";
import { BankAccountsManager } from "@/components/financeiro/masters/BankAccountsManager";
import { ChartAccountsManager } from "@/components/financeiro/masters/ChartAccountsManager";
import { CostCentersManager } from "@/components/financeiro/masters/CostCentersManager";
import { FinProjectsManager } from "@/components/financeiro/masters/FinProjectsManager";
import { StrategicResourceCategoriesManager } from "@/components/financeiro/masters/StrategicResourceCategoriesManager";
import { OrderResponsiblesManager } from "@/components/financeiro/masters/OrderResponsiblesManager";
import { CardRatesManager } from "@/components/financeiro/masters/CardRatesManager";
import { OriginRulesMatrix } from "@/components/financeiro/masters/OriginRulesMatrix";
import { EventAutomationRulesPanel } from "@/components/financeiro/masters/EventAutomationRulesPanel";
import { FinancePermissionsMatrix } from "@/components/financeiro/masters/FinancePermissionsMatrix";

const MAIN_TABS = new Set(["users", "types", "empresa", "customization", "financeiro"]);
const FIN_TABS = new Set([
  "bank-accounts", "chart", "cost-centers", "projects", "commitments",
  "responsibles", "card-rates", "origin-rules", "event-automations", "fin-permissions",
]);

const ProjectSettings = () => {
  const navigate = useNavigate();
  const { isMaster } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlTab = searchParams.get("tab");
  const urlSub = searchParams.get("sub");
  const mainTab = urlTab && MAIN_TABS.has(urlTab) ? urlTab : "users";
  const finTab = urlSub && FIN_TABS.has(urlSub) ? urlSub : "chart";

  const setMainTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    if (tab !== "financeiro") next.delete("sub");
    setSearchParams(next, { replace: true });
  };
  const setFinTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", "financeiro");
    next.set("sub", tab);
    setSearchParams(next, { replace: true });
  };

  const tabCount = isMaster ? 5 : 1;

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              ⚙️ Configurações
            </h1>
            <p className="text-muted-foreground text-lg">
              Gerencie usuários, permissões, financeiro e personalização do sistema
            </p>
          </div>
        </div>

        <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
          <TabsList className={`grid w-full grid-cols-${tabCount}`}>
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
            {isMaster && (
              <TabsTrigger value="financeiro" className="flex items-center gap-1.5">
                <Landmark className="h-4 w-4" />
                Financeiro
              </TabsTrigger>
            )}
            {isMaster && (
              <TabsTrigger value="customization" className="flex items-center gap-1.5">
                <Palette className="h-4 w-4" />
                Personalização
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

          {isMaster && (
            <TabsContent value="financeiro" className="space-y-6 pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Configurações Financeiras</h2>
                  <p className="text-sm text-muted-foreground">
                    Plano de Contas (Estrutura DRE/Fluxo de Caixa), centros de custo, projetos, taxas financeiras, automações e permissões.
                  </p>
                </div>
              </div>

              <Tabs value={finTab} onValueChange={setFinTab}>
                <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1.5">
                  <TabsTrigger value="chart" className="flex items-center gap-2 px-4 py-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Plano de Contas / DRE
                  </TabsTrigger>
                  <TabsTrigger value="bank-accounts" className="flex items-center gap-2 px-4 py-2">
                    <Landmark className="h-4 w-4" />
                    Contas Bancárias
                  </TabsTrigger>
                  <TabsTrigger value="cost-centers" className="flex items-center gap-2 px-4 py-2">
                    <Building2 className="h-4 w-4" />
                    Centros de Custo
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="flex items-center gap-2 px-4 py-2">
                    <FolderKanban className="h-4 w-4" />
                    Projetos
                  </TabsTrigger>
                  <TabsTrigger value="commitments" className="flex items-center gap-2 px-4 py-2">
                    <FolderCog className="h-4 w-4" />
                    Compromissos Sobre Venda
                  </TabsTrigger>
                  <TabsTrigger value="responsibles" className="flex items-center gap-2 px-4 py-2">
                    <BriefcaseBusiness className="h-4 w-4" />
                    Responsáveis
                  </TabsTrigger>
                  <TabsTrigger value="card-rates" className="flex items-center gap-2 px-4 py-2">
                    <CreditCard className="h-4 w-4" />
                    Taxas Financeiras
                  </TabsTrigger>
                  <TabsTrigger value="origin-rules" className="flex items-center gap-2 px-4 py-2">
                    <Zap className="h-4 w-4" />
                    Automação por Origem
                  </TabsTrigger>
                  <TabsTrigger value="event-automations" className="flex items-center gap-2 px-4 py-2">
                    <Bot className="h-4 w-4" />
                    Automações por Evento
                  </TabsTrigger>
                  <TabsTrigger value="fin-permissions" className="flex items-center gap-2 px-4 py-2">
                    <Shield className="h-4 w-4" />
                    Permissões Financeiras
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="chart" className="mt-6"><ChartAccountsManager /></TabsContent>
                <TabsContent value="bank-accounts" className="mt-6"><BankAccountsManager /></TabsContent>
                <TabsContent value="cost-centers" className="mt-6"><CostCentersManager /></TabsContent>
                <TabsContent value="projects" className="mt-6"><FinProjectsManager /></TabsContent>
                <TabsContent value="commitments" className="mt-6"><StrategicResourceCategoriesManager /></TabsContent>
                <TabsContent value="responsibles" className="mt-6"><OrderResponsiblesManager /></TabsContent>
                <TabsContent value="card-rates" className="mt-6"><CardRatesManager /></TabsContent>
                <TabsContent value="origin-rules" className="mt-6"><OriginRulesMatrix /></TabsContent>
                <TabsContent value="event-automations" className="mt-6"><EventAutomationRulesPanel /></TabsContent>
                <TabsContent value="fin-permissions" className="mt-6"><FinancePermissionsMatrix /></TabsContent>
              </Tabs>
            </TabsContent>
          )}

          {isMaster && (
            <TabsContent value="customization" className="space-y-6 pt-6">
              <CustomizationSettings />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ProjectSettings;
