import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, GraduationCap, HelpCircle, Stethoscope, BarChart3 } from 'lucide-react';
import { KnowledgeArticlesTab } from '@/components/knowledge/KnowledgeArticlesTab';
import { KnowledgeTutorialsTab } from '@/components/knowledge/KnowledgeTutorialsTab';
import { KnowledgeFaqTab } from '@/components/knowledge/KnowledgeFaqTab';
import { KnowledgeDiagnosticsTab } from '@/components/knowledge/KnowledgeDiagnosticsTab';
import { KnowledgeAnalyticsTab } from '@/components/knowledge/KnowledgeAnalyticsTab';

const SupportKnowledge = () => (
  <DashboardLayout>
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
          📚 Base de Conhecimento
        </h1>
        <p className="text-muted-foreground text-lg">Artigos, tutoriais, FAQ e diagnóstico automático</p>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-4 w-4" />Analytics</TabsTrigger>
          <TabsTrigger value="articles" className="gap-1.5"><BookOpen className="h-4 w-4" />Artigos</TabsTrigger>
          <TabsTrigger value="tutorials" className="gap-1.5"><GraduationCap className="h-4 w-4" />Tutoriais</TabsTrigger>
          <TabsTrigger value="faq" className="gap-1.5"><HelpCircle className="h-4 w-4" />FAQ</TabsTrigger>
          <TabsTrigger value="diagnostics" className="gap-1.5"><Stethoscope className="h-4 w-4" />Diagnóstico</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="pt-6"><KnowledgeAnalyticsTab /></TabsContent>
        <TabsContent value="articles" className="pt-6"><KnowledgeArticlesTab /></TabsContent>
        <TabsContent value="tutorials" className="pt-6"><KnowledgeTutorialsTab /></TabsContent>
        <TabsContent value="faq" className="pt-6"><KnowledgeFaqTab /></TabsContent>
        <TabsContent value="diagnostics" className="pt-6"><KnowledgeDiagnosticsTab /></TabsContent>
      </Tabs>
    </div>
  </DashboardLayout>
);

export default SupportKnowledge;
