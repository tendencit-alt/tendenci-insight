import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle, Circle } from "lucide-react";

interface SectionStatus {
  key: string;
  label: string;
  status: 'complete' | 'partial' | 'empty';
  icon: React.ComponentType<{ className?: string }>;
}

interface IAProgressIndicatorProps {
  sections: SectionStatus[];
  completed: number;
  total: number;
}

export function IAProgressIndicator({ sections, completed, total }: IAProgressIndicatorProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const getStatusColor = (status: 'complete' | 'partial' | 'empty') => {
    switch (status) {
      case 'complete': return 'text-green-500';
      case 'partial': return 'text-yellow-500';
      case 'empty': return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: 'complete' | 'partial' | 'empty') => {
    switch (status) {
      case 'complete': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'partial': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'empty': return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Progresso da Configuração</h3>
          <p className="text-xs text-muted-foreground">
            {completed} de {total} seções configuradas
          </p>
        </div>
        <div className="text-2xl font-bold text-primary">{percentage}%</div>
      </div>
      
      <Progress value={percentage} className="h-2" />
      
      <div className="flex flex-wrap gap-2 pt-2">
        {sections.map((section) => (
          <div 
            key={section.key}
            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-muted/50"
          >
            {getStatusIcon(section.status)}
            <span className={getStatusColor(section.status)}>{section.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
