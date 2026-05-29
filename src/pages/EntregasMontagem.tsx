import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, Wrench, CalendarDays } from "lucide-react";
import { DeliveriesTab } from "@/components/entregas/DeliveriesTab";
import { InstallationsTab } from "@/components/entregas/InstallationsTab";
import { DeliveryKPIs } from "@/components/entregas/DeliveryKPIs";
import { DeliveryCalendar } from "@/components/entregas/DeliveryCalendar";
import { useCan } from "@/hooks/useCan";
import { NoAccess } from "@/components/auth/NoAccess";

export default function EntregasMontagem() {
  const canView = useCan("operacional", "view");
  if (!canView) return <DashboardLayout><NoAccess module="operacional" /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-4 p-4 md:p-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6" /> Entregas & Montagem
          </h1>
          <p className="text-sm text-muted-foreground">
            Expedição/logística e montagem/instalação dos pedidos.
          </p>
        </header>

        <DeliveryKPIs />

        <Tabs defaultValue="entregas" className="space-y-3">
          <TabsList>
            <TabsTrigger value="entregas"><Truck className="h-4 w-4 mr-1" />Entregas</TabsTrigger>
            <TabsTrigger value="calendario"><CalendarDays className="h-4 w-4 mr-1" />Calendário</TabsTrigger>
            <TabsTrigger value="montagem"><Wrench className="h-4 w-4 mr-1" />Montagem</TabsTrigger>
          </TabsList>
          <TabsContent value="entregas"><DeliveriesTab /></TabsContent>
          <TabsContent value="calendario"><DeliveryCalendar /></TabsContent>
          <TabsContent value="montagem"><InstallationsTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
