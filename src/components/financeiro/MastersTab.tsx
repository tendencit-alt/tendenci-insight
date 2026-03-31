import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BankAccountsManager } from "./masters/BankAccountsManager";
import { ChartAccountsManager } from "./masters/ChartAccountsManager";
import { CostCentersManager } from "./masters/CostCentersManager";
import { FinProjectsManager } from "./masters/FinProjectsManager";
import { OrderResponsiblesManager } from "./masters/OrderResponsiblesManager";
import { StrategicResourceCategoriesManager } from "./masters/StrategicResourceCategoriesManager";
import { CardRatesManager } from "./masters/CardRatesManager";
import { BriefcaseBusiness, Building2, FileSpreadsheet, Landmark, FolderCog, FolderKanban, CreditCard } from "lucide-react";

export function MastersTab() {
  const [activeTab, setActiveTab] = useState("bank_accounts");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Cadastros do Financeiro</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie contas bancárias, plano de contas, centros de custo, projetos, responsáveis avulsos e categorias dos recursos estratégicos
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="bank_accounts" className="gap-2">
            <Landmark className="h-4 w-4" />
            Contas Bancárias
          </TabsTrigger>
          <TabsTrigger value="chart_accounts" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Plano de Contas
          </TabsTrigger>
          <TabsTrigger value="cost_centers" className="gap-2">
            <Building2 className="h-4 w-4" />
            Centros de Custo
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <FolderKanban className="h-4 w-4" />
            Projetos
          </TabsTrigger>
          <TabsTrigger value="strategic_resource_categories" className="gap-2">
            <FolderCog className="h-4 w-4" />
            Recursos Estratégicos
          </TabsTrigger>
          <TabsTrigger value="responsibles" className="gap-2">
            <BriefcaseBusiness className="h-4 w-4" />
            Responsáveis
          </TabsTrigger>
          <TabsTrigger value="card_rates" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Taxas Cartão
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bank_accounts" className="mt-4">
          <BankAccountsManager />
        </TabsContent>

        <TabsContent value="chart_accounts" className="mt-4">
          <ChartAccountsManager />
        </TabsContent>

        <TabsContent value="cost_centers" className="mt-4">
          <CostCentersManager />
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <FinProjectsManager />
        </TabsContent>

        <TabsContent value="strategic_resource_categories" className="mt-4">
          <StrategicResourceCategoriesManager />
        </TabsContent>

        <TabsContent value="responsibles" className="mt-4">
          <OrderResponsiblesManager />
        </TabsContent>

        <TabsContent value="card_rates" className="mt-4">
          <CardRatesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
