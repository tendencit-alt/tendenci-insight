import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, FolderKanban } from "lucide-react";
import { OpsOrdersTab } from "./OpsOrdersTab";
import { OpsProjectsTab } from "./OpsProjectsTab";

export function OpsWorkTab() {
  const [sub, setSub] = useState("ordens");
  return (
    <Tabs value={sub} onValueChange={setSub} className="space-y-3">
      <TabsList>
        <TabsTrigger value="ordens" className="gap-1.5"><ClipboardList className="h-4 w-4" />Por Ordem</TabsTrigger>
        <TabsTrigger value="projetos" className="gap-1.5"><FolderKanban className="h-4 w-4" />Por Projeto</TabsTrigger>
      </TabsList>
      <TabsContent value="ordens"><OpsOrdersTab /></TabsContent>
      <TabsContent value="projetos"><OpsProjectsTab /></TabsContent>
    </Tabs>
  );
}
