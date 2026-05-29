import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, BarChart3 } from "lucide-react";
import { OpsCostsTab } from "./OpsCostsTab";
import { OpsAnalyticsTab } from "./OpsAnalyticsTab";

export function OpsInsightsTab() {
  const [sub, setSub] = useState("custos");
  return (
    <Tabs value={sub} onValueChange={setSub} className="space-y-3">
      <TabsList>
        <TabsTrigger value="custos" className="gap-1.5"><DollarSign className="h-4 w-4" />Custos</TabsTrigger>
        <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-4 w-4" />Analytics</TabsTrigger>
      </TabsList>
      <TabsContent value="custos"><OpsCostsTab /></TabsContent>
      <TabsContent value="analytics"><OpsAnalyticsTab /></TabsContent>
    </Tabs>
  );
}
