import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Users, BarChart3, FileText, Zap, Database } from 'lucide-react';
import { BillingPlansTab } from '@/components/billing/BillingPlansTab';
import { BillingSubscriptionsTab } from '@/components/billing/BillingSubscriptionsTab';
import { BillingUsageTab } from '@/components/billing/BillingUsageTab';
import { BillingInvoicesTab } from '@/components/billing/BillingInvoicesTab';
import { BillingEventsTab } from '@/components/billing/BillingEventsTab';
import { BillingAnalyticsTab } from '@/components/billing/BillingAnalyticsTab';

const Billing = () => (
  <DashboardLayout>
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
          💳 Billing & Subscriptions
        </h1>
        <p className="text-muted-foreground text-lg">Gestão de planos, assinaturas, consumo e cobrança</p>
      </div>

      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="plans" className="gap-1.5"><CreditCard className="h-4 w-4" />Planos</TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-1.5"><Users className="h-4 w-4" />Assinaturas</TabsTrigger>
          <TabsTrigger value="usage" className="gap-1.5"><Database className="h-4 w-4" />Consumo</TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5"><FileText className="h-4 w-4" />Faturas</TabsTrigger>
          <TabsTrigger value="events" className="gap-1.5"><Zap className="h-4 w-4" />Eventos</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-4 w-4" />Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="pt-6"><BillingPlansTab /></TabsContent>
        <TabsContent value="subscriptions" className="pt-6"><BillingSubscriptionsTab /></TabsContent>
        <TabsContent value="usage" className="pt-6"><BillingUsageTab /></TabsContent>
        <TabsContent value="invoices" className="pt-6"><BillingInvoicesTab /></TabsContent>
        <TabsContent value="events" className="pt-6"><BillingEventsTab /></TabsContent>
        <TabsContent value="analytics" className="pt-6"><BillingAnalyticsTab /></TabsContent>
      </Tabs>
    </div>
  </DashboardLayout>
);

export default Billing;
