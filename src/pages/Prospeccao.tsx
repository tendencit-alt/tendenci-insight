import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProspeccaoOverview } from "@/components/prospeccao/ProspeccaoOverview";
import { ProspeccaoCRM } from "@/components/prospeccao/ProspeccaoCRM";
import { ManageStagesDialog } from "@/components/prospeccao/ManageStagesDialog";
import { ProspeccaoTasksManager } from "@/components/prospeccao/ProspeccaoTasksManager";
import WhatsAppConnectionManager from "@/components/prospeccao/WhatsAppConnectionManager";
import { CampanhasManager } from "@/components/prospeccao/CampanhasManager";
import { CampaignProgressMonitor } from "@/components/prospeccao/CampaignProgressMonitor";
import { CampanhasKPIDashboard } from "@/components/prospeccao/CampanhasKPIDashboard";
import { EvolutionAPIStatus } from "@/components/prospeccao/EvolutionAPIStatus";
import { ArchitectProspeccaoSheet } from "@/components/prospeccao/ArchitectProspeccaoSheet";
import { UserSearch, LayoutGrid, CheckSquare, MessageSquare, Megaphone } from "lucide-react";

export default function Prospeccao() {
  const [activeTab, setActiveTab] = useState("overview");
  const [manageStagesOpen, setManageStagesOpen] = useState(false);
  
  // Estados para abrir sheet via evento global (do Dialog de campanhas - funciona de qualquer aba)
  const [eventArchitectId, setEventArchitectId] = useState<string | null>(null);
  const [isEventSheetOpen, setIsEventSheetOpen] = useState(false);
  
  // Listener para evento 'open-architect-sheet' - no nível da página para funcionar de qualquer aba
  useEffect(() => {
    const handleOpenArchitectSheet = (e: CustomEvent<{ architectId: string }>) => {
      setEventArchitectId(e.detail.architectId);
      setIsEventSheetOpen(true);
      setActiveTab("crm"); // Navegar para aba CRM ao abrir
    };
    
    window.addEventListener('open-architect-sheet', handleOpenArchitectSheet as EventListener);
    return () => {
      window.removeEventListener('open-architect-sheet', handleOpenArchitectSheet as EventListener);
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
            <UserSearch className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Prospecção de Profissionais Parceiros</h1>
            <p className="text-muted-foreground">CRM completo com IA, campanhas automáticas e agendamentos</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card border border-border p-1 h-auto flex-wrap">
            <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <LayoutGrid className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="crm" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <UserSearch className="h-4 w-4" />
              CRM de Arquitetos
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MessageSquare className="h-4 w-4" />
              WhatsApp API
            </TabsTrigger>
            <TabsTrigger value="campanhas" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Megaphone className="h-4 w-4" />
              Campanhas
            </TabsTrigger>
            <TabsTrigger value="progresso" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CheckSquare className="h-4 w-4" />
              Progresso
            </TabsTrigger>
            {/* Tabs ocultas temporariamente */}
            {/* <TabsTrigger value="campanhas" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Megaphone className="h-4 w-4" />
              Campanhas IA
            </TabsTrigger>
            <TabsTrigger value="segmentos" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <UsersIcon className="h-4 w-4" />
              Segmentos
            </TabsTrigger>
            <TabsTrigger value="sequencias" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Zap className="h-4 w-4" />
              Sequências IA
            </TabsTrigger> */}
            <TabsTrigger value="agendamentos" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" style={{ display: 'none' }}>
              <CheckSquare className="h-4 w-4" />
              Tarefas
            </TabsTrigger>
            {/* <TabsTrigger value="whatsapp" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Smartphone className="h-4 w-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="evolution-config" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings className="h-4 w-4" />
              Config Evolution
            </TabsTrigger>
            <TabsTrigger value="configuracoes" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings className="h-4 w-4" />
              Config n8n
            </TabsTrigger> */}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <ProspeccaoOverview />
          </TabsContent>

          <TabsContent value="crm" className="space-y-6">
            <ProspeccaoCRM onManageStages={() => setManageStagesOpen(true)} />
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-6">
            <WhatsAppConnectionManager />
          </TabsContent>

          <TabsContent value="campanhas" className="space-y-6">
            <EvolutionAPIStatus />
            <CampanhasKPIDashboard />
            <CampanhasManager />
          </TabsContent>

          <TabsContent value="progresso" className="space-y-6">
            <CampaignProgressMonitor />
          </TabsContent>

          {/* Tabs ocultas temporariamente */}
          {/* <TabsContent value="campanhas" className="space-y-6">
            <CampanhasManager />
          </TabsContent>

          <TabsContent value="segmentos" className="space-y-6">
            <SegmentosManager />
          </TabsContent>

          <TabsContent value="sequencias" className="space-y-6">
            <SequenciasManager />
          </TabsContent> */}

          <TabsContent value="agendamentos" className="space-y-6">
            <ProspeccaoTasksManager />
          </TabsContent>

          {/* <TabsContent value="whatsapp" className="space-y-6">
            <WhatsAppConnectionManager />
          </TabsContent>

          <TabsContent value="evolution-config" className="space-y-6">
            <EvolutionAPIGuide />
          </TabsContent>

          <TabsContent value="configuracoes" className="space-y-6">
            <N8nAgendamentoGuide />
          </TabsContent> */}
        </Tabs>

        {/* Dialog de Gerenciar Etapas */}
        <ManageStagesDialog 
          open={manageStagesOpen} 
          onOpenChange={setManageStagesOpen} 
        />
        
        {/* Sheet para abrir profissional parceiro via evento global - no nível da página */}
        {eventArchitectId && (
          <ArchitectProspeccaoSheet
            architectId={eventArchitectId}
            open={isEventSheetOpen}
            onOpenChange={setIsEventSheetOpen}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
