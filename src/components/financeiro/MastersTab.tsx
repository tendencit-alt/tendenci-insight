import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BankAccountsManager } from "./masters/BankAccountsManager";
import { ChartAccountsManager } from "./masters/ChartAccountsManager";
import { CostCentersManager } from "./masters/CostCentersManager";
import { FinProjectsManager } from "./masters/FinProjectsManager";
import { Building2, FileSpreadsheet, Landmark, FolderKanban } from "lucide-react";

export function MastersTab() {
  const [activeTab, setActiveTab] = useState("bank_accounts");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Cadastros do Financeiro</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie contas bancárias, plano de contas, centros de custo e projetos
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
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
      </Tabs>
    </div>
  );
}
