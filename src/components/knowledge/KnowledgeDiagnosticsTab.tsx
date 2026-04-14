import { useDiagnosticRules } from '@/hooks/useKnowledgeData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Stethoscope, BookOpen, GraduationCap } from 'lucide-react';

export function KnowledgeDiagnosticsTab() {
  const { data: rules, isLoading } = useDiagnosticRules();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Diagnóstico Automático</h2>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Regra</TableHead><TableHead>Módulo</TableHead><TableHead>Tipo Detecção</TableHead><TableHead>Causa Provável</TableHead><TableHead>Ação Recomendada</TableHead><TableHead>Recursos</TableHead><TableHead>Disparos</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {!rules?.length ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma regra diagnóstica</TableCell></TableRow>
            ) : rules.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium"><div className="flex items-center gap-2"><Stethoscope className="h-4 w-4 text-muted-foreground" /><div><div>{r.name}</div>{r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}</div></div></TableCell>
                <TableCell><Badge variant="outline">{r.module}</Badge></TableCell>
                <TableCell className="text-sm">{r.detection_type}</TableCell>
                <TableCell className="text-sm max-w-[150px] truncate">{r.probable_cause || '-'}</TableCell>
                <TableCell className="text-sm max-w-[150px] truncate">{r.recommended_action || '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {r.knowledge_articles?.title && <Badge variant="secondary" className="text-[10px] gap-1"><BookOpen className="h-3 w-3" />Artigo</Badge>}
                    {r.guided_tutorials?.title && <Badge variant="secondary" className="text-[10px] gap-1"><GraduationCap className="h-3 w-3" />Tutorial</Badge>}
                  </div>
                </TableCell>
                <TableCell>{r.trigger_count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
