import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArchitectKPIs } from "@/components/architects/ArchitectKPIs";
import { BirthdayAlerts } from "@/components/architects/BirthdayAlerts";
import { InactiveArchitects } from "@/components/architects/InactiveArchitects";
import { ArchitectsTable } from "@/components/architects/ArchitectsTable";
import { CreateArchitectDialog } from "@/components/architects/CreateArchitectDialog";

const Architects = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleCreateSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleEdit = (architect: any) => {
    // TODO: Implement edit functionality
    console.log("Edit architect:", architect);
  };

  const handleView = (architectId: string) => {
    // TODO: Implement view details functionality
    console.log("View architect:", architectId);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
            👷 Arquitetos
          </h1>
          <p className="text-muted-foreground text-lg">
            Cadastro, performance e relacionamento com parceiros arquitetos.
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex gap-3 justify-end">
          <Button onClick={handleRefresh} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-lg shadow-primary/25">
            <Plus className="w-4 h-4" />
            Novo Arquiteto
          </Button>
        </div>

        {/* KPIs */}
        <ArchitectKPIs refreshKey={refreshKey} />

        {/* Alerts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BirthdayAlerts refreshKey={refreshKey} />
          <InactiveArchitects refreshKey={refreshKey} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="table" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="table">Tabela</TabsTrigger>
            <TabsTrigger value="analytics">Análises</TabsTrigger>
          </TabsList>
          
          <TabsContent value="table" className="mt-6">
            <ArchitectsTable 
              refreshKey={refreshKey} 
              onEdit={handleEdit}
              onView={handleView}
            />
          </TabsContent>
          
          <TabsContent value="analytics" className="mt-6">
            <div className="text-center p-12 text-muted-foreground">
              Gráficos e análises em breve...
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Dialog */}
        <CreateArchitectDialog 
          open={isCreateOpen} 
          onOpenChange={setIsCreateOpen}
          onSuccess={handleCreateSuccess}
        />
      </div>
    </DashboardLayout>
  );
};

export default Architects;
