import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ProspeccaoOverview } from "@/components/prospeccao/ProspeccaoOverview";
import { ProspeccaoCRM } from "@/components/prospeccao/ProspeccaoCRM";
import { ManageStagesDialog } from "@/components/prospeccao/ManageStagesDialog";
import { SegmentosManager } from "@/components/prospeccao/SegmentosManager";
import { SequenciasManager } from "@/components/prospeccao/SequenciasManager";
import { CampanhasManager } from "@/components/prospeccao/CampanhasManager";
import { UserSearch, LayoutGrid, Megaphone, Users as UsersIcon, Zap, Calendar, Settings, List } from "lucide-react";

export default function Prospeccao() {
  const [activeTab, setActiveTab] = useState("overview");
  const [manageStagesOpen, setManageStagesOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
            <UserSearch className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Prospecção de Arquitetos</h1>
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
            <TabsTrigger value="campanhas" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
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
            </TabsTrigger>
            <TabsTrigger value="agendamentos" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Calendar className="h-4 w-4" />
              Agendamentos
            </TabsTrigger>
            <TabsTrigger value="configuracoes" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings className="h-4 w-4" />
              Conexão n8n
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <ProspeccaoOverview />
          </TabsContent>

          <TabsContent value="crm" className="space-y-6">
            <ProspeccaoCRM onManageStages={() => setManageStagesOpen(true)} />
          </TabsContent>

          <TabsContent value="campanhas" className="space-y-6">
            <CampanhasManager />
          </TabsContent>

          <TabsContent value="segmentos" className="space-y-6">
            <SegmentosManager />
          </TabsContent>

          <TabsContent value="sequencias" className="space-y-6">
            <SequenciasManager />
          </TabsContent>

          <TabsContent value="agendamentos" className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Agendamentos</h3>
              <p className="text-muted-foreground">Em desenvolvimento - Fase 5</p>
            </div>
          </TabsContent>

          <TabsContent value="configuracoes" className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Conexão n8n / WhatsApp</h3>
              <p className="text-muted-foreground">Em desenvolvimento - Fase 6</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialog de Gerenciar Etapas */}
        <ManageStagesDialog 
          open={manageStagesOpen} 
          onOpenChange={setManageStagesOpen} 
        />
      </div>
    </DashboardLayout>
  );
}
