import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { WebhookSettings } from "@/components/projects/WebhookSettings";
import { N8nIntegrationGuide } from "@/components/settings/N8nIntegrationGuide";

const ProjectSettings = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/projects")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              ⚙️ Configurações de Projetos
            </h1>
            <p className="text-muted-foreground text-lg">
              Configure integrações e automações para o módulo de projetos
            </p>
          </div>
        </div>

        {/* Settings Sections */}
      <div className="space-y-6">
        <WebhookSettings />
        <N8nIntegrationGuide />
      </div>
      </div>
    </DashboardLayout>
  );
};

export default ProjectSettings;
