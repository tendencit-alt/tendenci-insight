import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Bell, Ticket, Zap, Rocket, BarChart3 } from 'lucide-react';
import { SuccessPlaybooksTab } from '@/components/success-ops/SuccessPlaybooksTab';
import { SuccessAlertsTab } from '@/components/success-ops/SuccessAlertsTab';
import { SuccessTicketsTab } from '@/components/success-ops/SuccessTicketsTab';
import { SuccessInterventionsTab } from '@/components/success-ops/SuccessInterventionsTab';
import { SuccessExpansionTab } from '@/components/success-ops/SuccessExpansionTab';
import { SuccessAnalyticsTab } from '@/components/success-ops/SuccessAnalyticsTab';

const CustomerSuccessOps = () => (
  <DashboardLayout>
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
          🎯 Customer Success Ops
        </h1>
        <p className="text-muted-foreground text-lg">Playbooks, alertas, tickets e intervenções automáticas</p>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-4 w-4" />Analytics</TabsTrigger>
          <TabsTrigger value="playbooks" className="gap-1.5"><BookOpen className="h-4 w-4" />Playbooks</TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5"><Bell className="h-4 w-4" />Alertas</TabsTrigger>
          <TabsTrigger value="tickets" className="gap-1.5"><Ticket className="h-4 w-4" />Tickets</TabsTrigger>
          <TabsTrigger value="interventions" className="gap-1.5"><Zap className="h-4 w-4" />Intervenções</TabsTrigger>
          <TabsTrigger value="expansion" className="gap-1.5"><Rocket className="h-4 w-4" />Expansão</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="pt-6"><SuccessAnalyticsTab /></TabsContent>
        <TabsContent value="playbooks" className="pt-6"><SuccessPlaybooksTab /></TabsContent>
        <TabsContent value="alerts" className="pt-6"><SuccessAlertsTab /></TabsContent>
        <TabsContent value="tickets" className="pt-6"><SuccessTicketsTab /></TabsContent>
        <TabsContent value="interventions" className="pt-6"><SuccessInterventionsTab /></TabsContent>
        <TabsContent value="expansion" className="pt-6"><SuccessExpansionTab /></TabsContent>
      </Tabs>
    </div>
  </DashboardLayout>
);

export default CustomerSuccessOps;
