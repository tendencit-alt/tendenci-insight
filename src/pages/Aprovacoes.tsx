import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApprovalQueue } from "@/components/aprovacoes/ApprovalQueue";
import { ApprovalRulesPanel } from "@/components/aprovacoes/ApprovalRulesPanel";

export default function Aprovacoes() {
  return (
    <PermissionGuard module="financeiro">
      <DashboardLayout>
        <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 md:p-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Central de Aprovações</h1>
            <p className="text-xs text-muted-foreground">
              Gerencie workflows de aprovação financeira e operacional.
            </p>
          </div>

          <Tabs defaultValue="queue">
            <TabsList>
              <TabsTrigger value="queue">Fila de Aprovações</TabsTrigger>
              <TabsTrigger value="rules">Regras & Alçadas</TabsTrigger>
            </TabsList>
            <TabsContent value="queue" className="mt-4">
              <ApprovalQueue />
            </TabsContent>
            <TabsContent value="rules" className="mt-4">
              <ApprovalRulesPanel />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </PermissionGuard>
  );
}
