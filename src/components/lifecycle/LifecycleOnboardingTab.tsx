import { useCustomerOnboarding } from '@/hooks/useLifecycleData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle2, Circle } from 'lucide-react';

export function LifecycleOnboardingTab() {
  const { data: items, isLoading } = useCustomerOnboarding();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const milestones = [
    { key: 'setup_completed', label: 'Setup Inicial' },
    { key: 'first_import', label: '1ª Importação' },
    { key: 'first_reconciliation', label: '1ª Conciliação' },
    { key: 'first_dre', label: '1ª DRE Válida' },
    { key: 'first_dashboard', label: '1º Dashboard' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Onboarding por Empresa</h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                {milestones.map(m => <TableHead key={m.key} className="text-center">{m.label}</TableHead>)}
                <TableHead className="w-[180px]">Progresso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!items?.length ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum onboarding registrado</TableCell></TableRow>
              ) : items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.tenants?.name || '-'}</TableCell>
                  {milestones.map(m => (
                    <TableCell key={m.key} className="text-center">
                      {item[m.key] ? <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" /> : <Circle className="h-5 w-5 text-muted-foreground/30 mx-auto" />}
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Number(item.progress_pct || 0)} className="h-2 flex-1" />
                      <span className="text-xs font-medium w-8">{Number(item.progress_pct || 0)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
