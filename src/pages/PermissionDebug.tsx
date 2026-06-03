import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, ShieldAlert } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePermissions } from "@/hooks/usePermissions";
import { DiagnosticoTab } from "@/components/permission-debug/DiagnosticoTab";
import { DiffTab } from "@/components/permission-debug/DiffTab";

import { RecommendationsTab } from "@/components/permission-debug/RecommendationsTab";
import { HerancaTab } from "@/components/permission-debug/HerancaTab";
import { useToast } from "@/hooks/use-toast";

export default function PermissionDebugPage() {
  const { isOwner, isMaster, loading } = usePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (loading) return;
    if (!isOwner && !isMaster) {
      toast({ title: "Acesso restrito", description: "Apenas o Owner pode acessar o Permission Debug.", variant: "destructive" });
      navigate("/", { replace: true });
    }
  }, [isOwner, isMaster, loading, navigate, toast]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isOwner && !isMaster) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Permission Debug · Owner
            </CardTitle>
          </CardHeader>
        </Card>

        <Tabs defaultValue="diagnostico">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
            <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
            <TabsTrigger value="heranca">Herança</TabsTrigger>
            <TabsTrigger value="diff">Diff de perfis</TabsTrigger>
            <TabsTrigger value="recs">Recomendações</TabsTrigger>
          </TabsList>
          <TabsContent value="diagnostico" className="pt-6"><DiagnosticoTab /></TabsContent>
          <TabsContent value="heranca" className="pt-6"><HerancaTab /></TabsContent>
          <TabsContent value="diff" className="pt-6"><DiffTab /></TabsContent>
          <TabsContent value="recs" className="pt-6"><RecommendationsTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
