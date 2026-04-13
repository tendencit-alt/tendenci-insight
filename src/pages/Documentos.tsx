import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentCenter } from "@/components/documentos/DocumentCenter";
import { DocumentRulesPanel } from "@/components/documentos/DocumentRulesPanel";

export default function Documentos() {
  return (
    <PermissionGuard module="financeiro">
      <DashboardLayout>
        <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 md:p-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Central de Documentos</h1>
            <p className="text-xs text-muted-foreground">
              Gerencie anexos e documentos vinculados a todos os módulos do ERP.
            </p>
          </div>
          <Tabs defaultValue="documents">
            <TabsList>
              <TabsTrigger value="documents">Documentos</TabsTrigger>
              <TabsTrigger value="rules">Regras de Obrigatoriedade</TabsTrigger>
            </TabsList>
            <TabsContent value="documents" className="mt-4">
              <DocumentCenter />
            </TabsContent>
            <TabsContent value="rules" className="mt-4">
              <DocumentRulesPanel />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </PermissionGuard>
  );
}
