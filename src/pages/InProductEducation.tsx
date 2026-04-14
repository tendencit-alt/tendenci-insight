import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Award, Lightbulb, BarChart3 } from 'lucide-react';
import { EducationTracksTab } from '@/components/education/EducationTracksTab';
import { EducationCertificationsTab } from '@/components/education/EducationCertificationsTab';
import { EducationRecommendationsTab } from '@/components/education/EducationRecommendationsTab';
import { EducationAnalyticsTab } from '@/components/education/EducationAnalyticsTab';

const InProductEducation = () => (
  <DashboardLayout>
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
          🎓 Educação In-Product
        </h1>
        <p className="text-muted-foreground text-lg">Trilhas de aprendizado, certificações e recomendações educacionais</p>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-4 w-4" />Analytics</TabsTrigger>
          <TabsTrigger value="tracks" className="gap-1.5"><BookOpen className="h-4 w-4" />Trilhas</TabsTrigger>
          <TabsTrigger value="certifications" className="gap-1.5"><Award className="h-4 w-4" />Certificações</TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-1.5"><Lightbulb className="h-4 w-4" />Recomendações</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="pt-6"><EducationAnalyticsTab /></TabsContent>
        <TabsContent value="tracks" className="pt-6"><EducationTracksTab /></TabsContent>
        <TabsContent value="certifications" className="pt-6"><EducationCertificationsTab /></TabsContent>
        <TabsContent value="recommendations" className="pt-6"><EducationRecommendationsTab /></TabsContent>
      </Tabs>
    </div>
  </DashboardLayout>
);

export default InProductEducation;
