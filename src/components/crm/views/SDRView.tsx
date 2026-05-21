import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, MessageSquare, Megaphone, CheckSquare, Sparkles } from "lucide-react";
import { useState } from "react";
import { ProspeccaoCRM } from "@/components/prospeccao/ProspeccaoCRM";
import { ProspeccaoTasksManager } from "@/components/prospeccao/ProspeccaoTasksManager";
import { CampanhasManager } from "@/components/prospeccao/CampanhasManager";
import { CampanhasKPIDashboard } from "@/components/prospeccao/CampanhasKPIDashboard";
import WhatsAppConnectionManager from "@/components/prospeccao/WhatsAppConnectionManager";
import { ManageStagesDialog } from "@/components/prospeccao/ManageStagesDialog";
import { LeadsContent } from "@/pages/Leads";

export function SDRView({ initialTab }: { initialTab?: string }) {
  const [manageStagesOpen, setManageStagesOpen] = useState(false);
  const allowed = ["leads", "prospeccao", "tarefas", "campanhas", "whatsapp"];
  const defaultTab = initialTab && allowed.includes(initialTab) ? initialTab : "leads";

  return (
    <Tabs defaultValue={defaultTab} className="space-y-4">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="leads" className="gap-1.5"><Sparkles className="h-4 w-4" />Leads</TabsTrigger>
        <TabsTrigger value="prospeccao" className="gap-1.5"><LayoutGrid className="h-4 w-4" />Prospecção</TabsTrigger>
        <TabsTrigger value="tarefas" className="gap-1.5"><CheckSquare className="h-4 w-4" />Tarefas do dia</TabsTrigger>
        <TabsTrigger value="campanhas" className="gap-1.5"><Megaphone className="h-4 w-4" />Campanhas</TabsTrigger>
        <TabsTrigger value="whatsapp" className="gap-1.5"><MessageSquare className="h-4 w-4" />WhatsApp</TabsTrigger>
      </TabsList>

      <TabsContent value="leads">
        <LeadsContent />
      </TabsContent>
      <TabsContent value="prospeccao">
        <ProspeccaoCRM onManageStages={() => setManageStagesOpen(true)} />
      </TabsContent>
      <TabsContent value="tarefas">
        <ProspeccaoTasksManager />
      </TabsContent>
      <TabsContent value="campanhas" className="space-y-4">
        <CampanhasKPIDashboard />
        <CampanhasManager />
      </TabsContent>
      <TabsContent value="whatsapp">
        <WhatsAppConnectionManager />
      </TabsContent>

      <ManageStagesDialog open={manageStagesOpen} onOpenChange={setManageStagesOpen} />
    </Tabs>
  );
}
