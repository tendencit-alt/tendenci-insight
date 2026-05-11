import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, UserMinus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArchitectKPIs } from "@/components/architects/ArchitectKPIs";
import { BirthdayAlerts } from "@/components/architects/BirthdayAlerts";
import { InactiveArchitects } from "@/components/architects/InactiveArchitects";
import { ArchitectsTable } from "@/components/architects/ArchitectsTable";
import { CreateArchitectDialog } from "@/components/architects/CreateArchitectDialog";
import { EditArchitectDialog } from "@/components/architects/EditArchitectDialog";
import { ArchitectDetailSheet } from "@/components/architects/ArchitectDetailSheet";
import { ProjectTypesDashboard } from "@/components/architects/ProjectTypesDashboard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ProspeccaoOverview() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedArchitect, setSelectedArchitect] = useState<any>(null);
  const [selectedArchitectId, setSelectedArchitectId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [checkingInactive, setCheckingInactive] = useState(false);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleCreateSuccess = () => {
    setRefreshKey(prev => prev + 1);
    setIsCreateOpen(false);
  };

  const handleEditSuccess = () => {
    setRefreshKey(prev => prev + 1);
    setIsEditOpen(false);
  };

  const handleEdit = (architect: any) => {
    setSelectedArchitect(architect);
    setIsEditOpen(true);
  };

  const handleView = (architectId: string) => {
    setSelectedArchitectId(architectId);
    setIsDetailOpen(true);
  };

  const handleDeleteSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleCheckInactive = async () => {
    setCheckingInactive(true);
    try {
      const { data, error } = await supabase.rpc('run_inactive_architects_check');
      
      if (error) throw error;
      
      const result = data as { success: boolean; architects_moved: number; executed_at: string };
      
      if (result.architects_moved > 0) {
        toast.success(`${result.architects_moved} parceiro profissional(s) movido(s) para Inativo`);
      } else {
        toast.info('Nenhum parceiro profissional inativo encontrado');
      }
      
      handleRefresh();
    } catch (error) {
      console.error('Erro ao verificar inativos:', error);
      toast.error('Erro ao verificar parceiros profissionais inativos');
    } finally {
      setCheckingInactive(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button 
          onClick={handleCheckInactive} 
          variant="outline" 
          className="gap-2"
          disabled={checkingInactive}
        >
          <UserMinus className="w-4 h-4" />
          {checkingInactive ? 'Verificando...' : 'Verificar Inativos (60d)'}
        </Button>
        <Button onClick={handleRefresh} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </Button>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-lg shadow-primary/25">
          <Plus className="w-4 h-4" />
          Novo Parceiro Profissional
        </Button>
      </div>

      {/* KPIs */}
      <ArchitectKPIs refreshKey={refreshKey} />

      {/* Alerts Grid - Próximos Aniversários e Parceiros Profissionais Inativos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BirthdayAlerts refreshKey={refreshKey} />
        <InactiveArchitects refreshKey={refreshKey} />
      </div>

      {/* Tabs - Tabela de Parceiros Profissionais e Análises */}
      <Tabs defaultValue="table" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="table">Tabela de Parceiros Profissionais</TabsTrigger>
          <TabsTrigger value="analytics">Análises de Projetos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="table" className="mt-6">
          <ArchitectsTable 
            key={refreshKey}
            refreshKey={refreshKey}
            onEdit={handleEdit}
            onView={handleView}
            onDelete={handleDeleteSuccess}
          />
        </TabsContent>
        
        <TabsContent value="analytics" className="mt-6">
          <ProjectTypesDashboard key={refreshKey} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateArchitectDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={handleCreateSuccess}
      />

      {selectedArchitect && (
        <EditArchitectDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          architect={selectedArchitect}
          onSuccess={handleEditSuccess}
        />
      )}

      {selectedArchitectId && (
        <ArchitectDetailSheet
          architectId={selectedArchitectId}
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
        />
      )}
    </div>
  );
}
