import { useEducationCertifications, CERTIFICATION_LEVELS } from '@/hooks/useEducationData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Award } from 'lucide-react';

export function EducationCertificationsTab() {
  const { data: certs, isLoading } = useEducationCertifications();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Certificação de Maturidade ERP</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {CERTIFICATION_LEVELS.map(l => (
          <Badge key={l.key} className={l.color}>{l.label} (≥{l.minScore})</Badge>
        ))}
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Empresa</TableHead><TableHead>Nível</TableHead><TableHead>Score</TableHead><TableHead>Progresso</TableHead><TableHead>Certificado em</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {!certs?.length ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma certificação</TableCell></TableRow>
            ) : certs.map((c: any) => {
              const lvl = CERTIFICATION_LEVELS.find(l => l.key === c.level) || CERTIFICATION_LEVELS[0];
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium"><div className="flex items-center gap-2"><Award className="h-4 w-4 text-primary" />{c.tenants?.name || '-'}</div></TableCell>
                  <TableCell><Badge className={lvl.color}>{lvl.label}</Badge></TableCell>
                  <TableCell className="font-bold">{c.score}</TableCell>
                  <TableCell><Progress value={c.score} className="h-2 w-24" /></TableCell>
                  <TableCell className="text-sm">{new Date(c.certified_at).toLocaleDateString('pt-BR')}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
