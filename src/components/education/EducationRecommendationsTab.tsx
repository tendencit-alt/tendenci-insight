import { useEducationRecommendations } from '@/hooks/useEducationData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Lightbulb, BookOpen } from 'lucide-react';

export function EducationRecommendationsTab() {
  const { data: recs, isLoading } = useEducationRecommendations();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Recomendações Educacionais</h2>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Empresa</TableHead><TableHead>Trigger</TableHead><TableHead>Recomendação</TableHead><TableHead>Trilha Relacionada</TableHead><TableHead>Tela</TableHead><TableHead>Data</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {!recs?.length ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma recomendação ativa</TableCell></TableRow>
            ) : recs.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium"><div className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-yellow-500" />{r.tenants?.name || '-'}</div></TableCell>
                <TableCell><Badge variant="outline">{r.trigger_type}</Badge></TableCell>
                <TableCell className="max-w-[250px] truncate text-sm">{r.recommendation}</TableCell>
                <TableCell>{r.education_tracks?.title ? <div className="flex items-center gap-1 text-sm"><BookOpen className="h-3 w-3" />{r.education_tracks.title}</div> : '-'}</TableCell>
                <TableCell className="text-sm">{r.screen_key || '-'}</TableCell>
                <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString('pt-BR')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
