import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Rocket, Heart, Activity, ShieldAlert, TrendingUp, BarChart3 } from 'lucide-react';
import { LifecycleOnboardingTab } from '@/components/lifecycle/LifecycleOnboardingTab';
import { LifecycleHealthTab } from '@/components/lifecycle/LifecycleHealthTab';
import { LifecycleAdoptionTab } from '@/components/lifecycle/LifecycleAdoptionTab';
import { LifecycleRetentionTab } from '@/components/lifecycle/LifecycleRetentionTab';
import { LifecycleExpansionTab } from '@/components/lifecycle/LifecycleExpansionTab';
import { LifecycleAnalyticsTab } from '@/components/lifecycle/LifecycleAnalyticsTab';

const CustomerLifecycle = () => (
  <DashboardLayout>
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
          🔄 Customer Lifecycle
        </h1>
        <p className="text-muted-foreground text-lg">Gestão completa do ciclo de vida das empresas clientes</p>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-4 w-4" />Indicadores</TabsTrigger>
          <TabsTrigger value="onboarding" className="gap-1.5"><Rocket className="h-4 w-4" />Onboarding</TabsTrigger>
          <TabsTrigger value="adoption" className="gap-1.5"><Activity className="h-4 w-4" />Adoção</TabsTrigger>
          <TabsTrigger value="health" className="gap-1.5"><Heart className="h-4 w-4" />Health Score</TabsTrigger>
          <TabsTrigger value="retention" className="gap-1.5"><ShieldAlert className="h-4 w-4" />Retenção</TabsTrigger>
          <TabsTrigger value="expansion" className="gap-1.5"><TrendingUp className="h-4 w-4" />Expansão</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="pt-6"><LifecycleAnalyticsTab /></TabsContent>
        <TabsContent value="onboarding" className="pt-6"><LifecycleOnboardingTab /></TabsContent>
        <TabsContent value="adoption" className="pt-6"><LifecycleAdoptionTab /></TabsContent>
        <TabsContent value="health" className="pt-6"><LifecycleHealthTab /></TabsContent>
        <TabsContent value="retention" className="pt-6"><LifecycleRetentionTab /></TabsContent>
        <TabsContent value="expansion" className="pt-6"><LifecycleExpansionTab /></TabsContent>
      </Tabs>
    </div>
  </DashboardLayout>
);

export default CustomerLifecycle;
