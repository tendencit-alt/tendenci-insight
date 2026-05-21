import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, FileText, Users, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { PrjOverview } from "@/components/projects/PrjOverview";
import CRMProposalsTab from "@/components/crm-commercial/CRMProposalsTab";

export function ConsultorView({ initialTab }: { initialTab?: string } = {}) {
  const allowed = ["funil", "propostas", "clientes"];
  const defaultTab = initialTab && allowed.includes(initialTab) ? initialTab : "funil";
  return (
    <Tabs defaultValue={defaultTab} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="funil" className="gap-1.5"><Briefcase className="h-4 w-4" />Meu funil</TabsTrigger>
          <TabsTrigger value="propostas" className="gap-1.5"><FileText className="h-4 w-4" />Propostas</TabsTrigger>
          <TabsTrigger value="clientes" className="gap-1.5"><Users className="h-4 w-4" />Clientes</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="funil">
        <PrjOverview />
      </TabsContent>
      <TabsContent value="propostas">
        <CRMProposalsTab />
      </TabsContent>
      <TabsContent value="clientes">
        <div className="rounded-lg border bg-muted/30 p-8 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Sua carteira de clientes</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Veja, edite e crie novos clientes na tela completa de Clientes.
          </p>
          <Button asChild>
            <Link to="/clientes"><ExternalLink className="mr-1.5 h-4 w-4" />Abrir Clientes</Link>
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}
