import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, ShieldAlert } from 'lucide-react';
import { ControlTowerFinancialStatus } from '@/components/control-tower/FinancialStatus';
import { DiagnosticoTab } from '@/components/permission-debug/DiagnosticoTab';
import { DiffTab } from '@/components/permission-debug/DiffTab';

import { RecommendationsTab } from '@/components/permission-debug/RecommendationsTab';
import { HerancaTab } from '@/components/permission-debug/HerancaTab';
import { Tabs as InnerTabs, TabsContent as InnerTabsContent, TabsList as InnerTabsList, TabsTrigger as InnerTabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';
import { AdminQuickAccessCard } from '@/components/saas-admin/AdminQuickAccessCard';
import { BillingOpsQuickAccessCard } from '@/components/billing-ops/BillingOpsQuickAccessCard';

const ControlTower = () => {
  const { isOwner, isMaster } = usePermissions();
  const showDebug = isOwner || isMaster;

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
            🏢 Control Tower Estratégica
          </h1>
          <p className="text-muted-foreground text-lg">Cockpit executivo com visão integrada de finanças, operações, riscos e oportunidades</p>
        </div>

        {showDebug && <AdminQuickAccessCard />}

        <Tabs defaultValue="financial" className="w-full">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="financial" className="gap-1.5"><Activity className="h-4 w-4" />Financeiro</TabsTrigger>
            {showDebug && (
              <TabsTrigger value="permission-debug" className="gap-1.5"><ShieldAlert className="h-4 w-4" />Permission Debug</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="financial" className="pt-6"><ControlTowerFinancialStatus /></TabsContent>


          {showDebug && (
            <TabsContent value="permission-debug" className="pt-6">
              <InnerTabs defaultValue="diagnostico">
                <InnerTabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
                  <InnerTabsTrigger value="diagnostico">Diagnóstico</InnerTabsTrigger>
                  <InnerTabsTrigger value="heranca">Herança</InnerTabsTrigger>
                  <InnerTabsTrigger value="diff">Diff de perfis</InnerTabsTrigger>
                  <InnerTabsTrigger value="recs">Recomendações</InnerTabsTrigger>
                </InnerTabsList>
                <InnerTabsContent value="diagnostico" className="pt-6"><DiagnosticoTab /></InnerTabsContent>
                <InnerTabsContent value="heranca" className="pt-6"><HerancaTab /></InnerTabsContent>
                <InnerTabsContent value="diff" className="pt-6"><DiffTab /></InnerTabsContent>
                <InnerTabsContent value="recs" className="pt-6"><RecommendationsTab /></InnerTabsContent>
              </InnerTabs>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ControlTower;
