import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleShell } from "@/components/layout/ModuleShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BankAccountsManager } from "@/components/financeiro/masters/BankAccountsManager";
import { ChartAccountsManager } from "@/components/financeiro/masters/ChartAccountsManager";
import { CostCentersManager } from "@/components/financeiro/masters/CostCentersManager";
import { FinProjectsManager } from "@/components/financeiro/masters/FinProjectsManager";
import { OrderResponsiblesManager } from "@/components/financeiro/masters/OrderResponsiblesManager";
import { StrategicResourceCategoriesManager } from "@/components/financeiro/masters/StrategicResourceCategoriesManager";
import { CardRatesManager } from "@/components/financeiro/masters/CardRatesManager";
import { OriginRulesMatrix } from "@/components/financeiro/masters/OriginRulesMatrix";
import { FinancePermissionsMatrix } from "@/components/financeiro/masters/FinancePermissionsMatrix";
import { EventAutomationRulesPanel } from "@/components/financeiro/masters/EventAutomationRulesPanel";
import { Building2, FileSpreadsheet, Landmark, FolderKanban, Database, BriefcaseBusiness, FolderCog, CreditCard, Zap, Shield, Bot } from "lucide-react";
import { useSearchParams } from "react-router-dom";

// Standardized URL slugs (?tab=...) → internal tab values
const RECORDS_TABS = new Set([
  "bank-accounts",
  "chart",
  "cost-centers",
  "projects",
  "commitments",
  "card-rates",
]);
const SETTINGS_TABS = new Set(["origin-rules", "event-automations", "permissions"]);

export default function CadastrosFinanceiros() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");

  // Legacy redirect: "responsibles" foi mesclada em "commitments"
  const normalizedTab = urlTab === "responsibles" ? "commitments" : urlTab;

  const recordsTab = normalizedTab && RECORDS_TABS.has(normalizedTab) ? normalizedTab : "bank-accounts";
  const settingsTab = normalizedTab && SETTINGS_TABS.has(normalizedTab) ? normalizedTab : "origin-rules";

  const updateTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  return (
    <DashboardLayout>
      <ModuleShell
        moduleKey="cadastros-financeiros"
        title="Cadastros Financeiros"
        description="Gerencie contas bancárias, plano de contas, centros de custo, projetos, responsáveis avulsos e categorias dos compromissos sobre venda."
        icon={<Database className="h-5 w-5" />}
        records={
          <Tabs value={recordsTab} onValueChange={updateTab}>
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1.5">
              <TabsTrigger value="bank-accounts" className="flex items-center gap-2 px-4 py-2">
                <Landmark className="h-4 w-4" />
                Contas Bancárias
              </TabsTrigger>
              <TabsTrigger value="chart" className="flex items-center gap-2 px-4 py-2">
                <FileSpreadsheet className="h-4 w-4" />
                Plano de Contas
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
                Taxas Cartão
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bank-accounts" className="mt-6"><BankAccountsManager /></TabsContent>
            <TabsContent value="chart" className="mt-6"><ChartAccountsManager /></TabsContent>
            <TabsContent value="cost-centers" className="mt-6"><CostCentersManager /></TabsContent>
            <TabsContent value="projects" className="mt-6"><FinProjectsManager /></TabsContent>
            <TabsContent value="commitments" className="mt-6"><StrategicResourceCategoriesManager /></TabsContent>
            <TabsContent value="responsibles" className="mt-6"><OrderResponsiblesManager /></TabsContent>
            <TabsContent value="card-rates" className="mt-6"><CardRatesManager /></TabsContent>
          </Tabs>
        }
        settings={
          <Tabs value={settingsTab} onValueChange={updateTab}>
            <TabsList className="flex flex-wrap gap-1">
              <TabsTrigger value="origin-rules" className="gap-2"><Zap className="h-4 w-4" />Automação por Origem</TabsTrigger>
              <TabsTrigger value="event-automations" className="gap-2"><Bot className="h-4 w-4" />Automações por Evento</TabsTrigger>
              <TabsTrigger value="permissions" className="gap-2"><Shield className="h-4 w-4" />Permissões</TabsTrigger>
            </TabsList>
            <TabsContent value="origin-rules" className="mt-6"><OriginRulesMatrix /></TabsContent>
            <TabsContent value="event-automations" className="mt-6"><EventAutomationRulesPanel /></TabsContent>
            <TabsContent value="permissions" className="mt-6"><FinancePermissionsMatrix /></TabsContent>
          </Tabs>
        }
      />
    </DashboardLayout>
  );
}
