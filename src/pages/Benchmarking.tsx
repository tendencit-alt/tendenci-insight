import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Target, Layers, Lightbulb } from 'lucide-react';
import { BenchmarkOverviewTab } from '@/components/benchmark/BenchmarkOverviewTab';
import { BenchmarkMetricsTab } from '@/components/benchmark/BenchmarkMetricsTab';
import { BenchmarkPercentilesTab } from '@/components/benchmark/BenchmarkPercentilesTab';
import { BenchmarkRecommendationsTab } from '@/components/benchmark/BenchmarkRecommendationsTab';

const Benchmarking = () => (
  <DashboardLayout>
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
          📊 Benchmarking
        </h1>
        <p className="text-muted-foreground text-lg">Comparativo anonimizado entre empresas — financeiro, operacional, comercial e maturidade ERP</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="h-4 w-4" />Visão Geral</TabsTrigger>
          <TabsTrigger value="metrics" className="gap-1.5"><Layers className="h-4 w-4" />Métricas</TabsTrigger>
          <TabsTrigger value="percentiles" className="gap-1.5"><Target className="h-4 w-4" />Percentis</TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-1.5"><Lightbulb className="h-4 w-4" />Recomendações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-6"><BenchmarkOverviewTab /></TabsContent>
        <TabsContent value="metrics" className="pt-6"><BenchmarkMetricsTab /></TabsContent>
        <TabsContent value="percentiles" className="pt-6"><BenchmarkPercentilesTab /></TabsContent>
        <TabsContent value="recommendations" className="pt-6"><BenchmarkRecommendationsTab /></TabsContent>
      </Tabs>
    </div>
  </DashboardLayout>
);

export default Benchmarking;
