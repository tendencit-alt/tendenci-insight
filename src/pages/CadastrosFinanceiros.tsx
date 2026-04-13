import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
import { Building2, FileSpreadsheet, Landmark, FolderKanban, Database, BriefcaseBusiness, FolderCog, CreditCard, Zap, Shield } from "lucide-react";
import { useState } from "react";

export default function CadastrosFinanceiros() {
  const [activeTab, setActiveTab] = useState("bank_accounts");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Cadastros Financeiros</h1>
          </div>
          <p className="text-muted-foreground">
            Gerencie contas bancárias, plano de contas, centros de custo, projetos, responsáveis avulsos e categorias dos compromissos sobre venda.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1.5">
            <TabsTrigger value="bank_accounts" className="flex items-center gap-2 px-4 py-2">
              <Landmark className="h-4 w-4" />
              Contas Bancárias
            </TabsTrigger>
            <TabsTrigger value="chart_accounts" className="flex items-center gap-2 px-4 py-2">
              <FileSpreadsheet className="h-4 w-4" />
              Plano de Contas
            </TabsTrigger>
            <TabsTrigger value="cost_centers" className="flex items-center gap-2 px-4 py-2">
              <Building2 className="h-4 w-4" />
              Centros de Custo
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2 px-4 py-2">
              <FolderKanban className="h-4 w-4" />
              Projetos
            </TabsTrigger>
            <TabsTrigger value="strategic_resource_categories" className="flex items-center gap-2 px-4 py-2">
              <FolderCog className="h-4 w-4" />
              Compromissos Sobre Venda
            </TabsTrigger>
            <TabsTrigger value="responsibles" className="flex items-center gap-2 px-4 py-2">
              <BriefcaseBusiness className="h-4 w-4" />
              Responsáveis
            </TabsTrigger>
            <TabsTrigger value="card_rates" className="flex items-center gap-2 px-4 py-2">
              <CreditCard className="h-4 w-4" />
              Taxas Cartão
            </TabsTrigger>
            <TabsTrigger value="origin_rules" className="flex items-center gap-2 px-4 py-2">
              <Zap className="h-4 w-4" />
              Automação por Origem
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bank_accounts" className="mt-6">
            <BankAccountsManager />
          </TabsContent>

          <TabsContent value="chart_accounts" className="mt-6">
            <ChartAccountsManager />
          </TabsContent>

          <TabsContent value="cost_centers" className="mt-6">
            <CostCentersManager />
          </TabsContent>

          <TabsContent value="projects" className="mt-6">
            <FinProjectsManager />
          </TabsContent>

          <TabsContent value="strategic_resource_categories" className="mt-6">
            <StrategicResourceCategoriesManager />
          </TabsContent>

          <TabsContent value="responsibles" className="mt-6">
            <OrderResponsiblesManager />
          </TabsContent>

          <TabsContent value="card_rates" className="mt-6">
            <CardRatesManager />
          </TabsContent>

          <TabsContent value="origin_rules" className="mt-6">
            <OriginRulesMatrix />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
