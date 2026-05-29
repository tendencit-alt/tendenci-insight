import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarRange, Play } from "lucide-react";
import { OpsPlanningTab } from "./OpsPlanningTab";
import { OpsExecutionTab } from "./OpsExecutionTab";

export function OpsCronogramaTab() {
  const [sub, setSub] = useState("planejamento");
  return (
    <Tabs value={sub} onValueChange={setSub} className="space-y-3">
      <TabsList>
        <TabsTrigger value="planejamento" className="gap-1.5"><CalendarRange className="h-4 w-4" />Planejamento</TabsTrigger>
        <TabsTrigger value="execucao" className="gap-1.5"><Play className="h-4 w-4" />Execução</TabsTrigger>
      </TabsList>
      <TabsContent value="planejamento"><OpsPlanningTab /></TabsContent>
      <TabsContent value="execucao"><OpsExecutionTab /></TabsContent>
    </Tabs>
  );
}
