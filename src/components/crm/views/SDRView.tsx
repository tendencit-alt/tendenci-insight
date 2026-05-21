import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, MessageSquare, Megaphone, CheckSquare, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState } from "react";
import { ProspeccaoCRM } from "@/components/prospeccao/ProspeccaoCRM";
import { ProspeccaoTasksManager } from "@/components/prospeccao/ProspeccaoTasksManager";
import { CampanhasManager } from "@/components/prospeccao/CampanhasManager";
import { CampanhasKPIDashboard } from "@/components/prospeccao/CampanhasKPIDashboard";
import WhatsAppConnectionManager from "@/components/prospeccao/WhatsAppConnectionManager";
import { ManageStagesDialog } from "@/components/prospeccao/ManageStagesDialog";

export function SDRView() {
  const [manageStagesOpen, setManageStagesOpen] = useState(false);

  return (
    <Tabs defaultValue="prospeccao" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="prospeccao" className="gap-1.5"><LayoutGrid className="h-4 w-4" />Prospecção</TabsTrigger>
          <TabsTrigger value="tarefas" className="gap-1.5"><CheckSquare className="h-4 w-4" />Tarefas do dia</TabsTrigger>
          <TabsTrigger value="campanhas" className="gap-1.5"><Megaphone className="h-4 w-4" />Campanhas</TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-1.5"><MessageSquare className="h-4 w-4" />WhatsApp</TabsTrigger>
        </TabsList>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link to="/leads"><ExternalLink className="h-3.5 w-3.5" />Abrir base de Leads</Link>
        </Button>
      </div>

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
