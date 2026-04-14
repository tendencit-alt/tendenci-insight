import { useExpansionOpportunities } from '@/hooks/useLifecycleData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Rocket } from 'lucide-react';

const statusMap: Record<string, { label: string; class: string }> = {
  detected: { label: 'Detectada', class: 'bg-blue-500/10 text-blue-500' },
  contacted: { label: 'Contatado', class: 'bg-yellow-500/10 text-yellow-500' },
  converted: { label: 'Convertido', class: 'bg-green-500/10 text-green-500' },
  dismissed: { label: 'Descartado', class: 'bg-muted text-muted-foreground' },
};

export function LifecycleExpansionTab() {
  const { data: items, isLoading } = useExpansionOpportunities();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Oportunidades de Expansão</h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor Estimado</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!items?.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma oportunidade detectada</TableCell></TableRow>
              ) : items.map((item: any) => {
                const st = statusMap[item.status] || { label: item.status, class: '' };
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2"><Rocket className="h-4 w-4 text-muted-foreground" />{item.tenants?.name || '-'}</div>
                    </TableCell>
                    <TableCell>{item.opportunity_type}</TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm">{item.description || '-'}</TableCell>
                    <TableCell>R$ {Number(item.estimated_value || 0).toFixed(2)}</TableCell>
                    <TableCell><Badge className={st.class}>{st.label}</Badge></TableCell>
                    <TableCell className="text-sm">{new Date(item.created_at).toLocaleDateString('pt-BR')}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
