import { useExpansionSignals } from '@/hooks/useSuccessOpsData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Rocket } from 'lucide-react';

const statusMap: Record<string, { label: string; class: string }> = {
  detected: { label: 'Detectado', class: 'bg-blue-500/10 text-blue-500' },
  notified: { label: 'Notificado', class: 'bg-yellow-500/10 text-yellow-500' },
  converted: { label: 'Convertido', class: 'bg-green-500/10 text-green-500' },
  dismissed: { label: 'Descartado', class: 'bg-muted text-muted-foreground' },
};

export function SuccessExpansionTab() {
  const { data: signals, isLoading } = useExpansionSignals();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Sinais de Expansão</h2>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Empresa</TableHead><TableHead>Tipo</TableHead><TableHead>Uso / Limite</TableHead><TableHead>Ação Recomendada</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {!signals?.length ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum sinal detectado</TableCell></TableRow>
            ) : signals.map((s: any) => {
              const st = statusMap[s.status] || { label: s.status, class: '' };
              const pct = s.limit_value > 0 ? (s.current_value / s.limit_value) * 100 : 0;
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium"><div className="flex items-center gap-2"><Rocket className="h-4 w-4 text-muted-foreground" />{s.tenants?.name || '-'}</div></TableCell>
                  <TableCell>{s.signal_type}</TableCell>
                  <TableCell>
                    {s.limit_value > 0 ? (
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={Math.min(pct, 100)} className="h-2 flex-1" />
                        <span className="text-xs">{Number(s.current_value)}/{Number(s.limit_value)}</span>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-sm">{s.recommended_action || '-'}</TableCell>
                  <TableCell><Badge className={st.class}>{st.label}</Badge></TableCell>
                  <TableCell className="text-sm">{new Date(s.created_at).toLocaleDateString('pt-BR')}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
