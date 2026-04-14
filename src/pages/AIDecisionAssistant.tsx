import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HeartPulse, Settings, Zap, AlertTriangle, FlaskConical, BarChart3 } from 'lucide-react';
import { AIFinancialDiagTab } from '@/components/ai-decision/AIFinancialDiagTab';
import { AIOperationalDiagTab } from '@/components/ai-decision/AIOperationalDiagTab';
import { AIPriorityActionsTab } from '@/components/ai-decision/AIPriorityActionsTab';
import { AIStrategyAlertsTab } from '@/components/ai-decision/AIStrategyAlertsTab';
import { AISimulationsTab } from '@/components/ai-decision/AISimulationsTab';
import { AIDecisionAnalyticsTab } from '@/components/ai-decision/AIDecisionAnalyticsTab';

const AIDecisionAssistant = () => (
  <DashboardLayout>
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
          🧠 AI Decision Assistant
        </h1>
        <p className="text-muted-foreground text-lg">Diagnóstico financeiro, ações prioritárias, alertas estratégicos e simulações</p>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-4 w-4" />Analytics</TabsTrigger>
          <TabsTrigger value="financial" className="gap-1.5"><HeartPulse className="h-4 w-4" />Financeiro</TabsTrigger>
          <TabsTrigger value="operational" className="gap-1.5"><Settings className="h-4 w-4" />Operacional</TabsTrigger>
          <TabsTrigger value="actions" className="gap-1.5"><Zap className="h-4 w-4" />Ações</TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5"><AlertTriangle className="h-4 w-4" />Alertas</TabsTrigger>
          <TabsTrigger value="simulations" className="gap-1.5"><FlaskConical className="h-4 w-4" />Simulações</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="pt-6"><AIDecisionAnalyticsTab /></TabsContent>
        <TabsContent value="financial" className="pt-6"><AIFinancialDiagTab /></TabsContent>
        <TabsContent value="operational" className="pt-6"><AIOperationalDiagTab /></TabsContent>
        <TabsContent value="actions" className="pt-6"><AIPriorityActionsTab /></TabsContent>
        <TabsContent value="alerts" className="pt-6"><AIStrategyAlertsTab /></TabsContent>
        <TabsContent value="simulations" className="pt-6"><AISimulationsTab /></TabsContent>
      </Tabs>
    </div>
  </DashboardLayout>
);

export default AIDecisionAssistant;
