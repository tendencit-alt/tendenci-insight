import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useHRTimesheets, useHREmployees } from "@/hooks/useHRData";

const now = new Date();
const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

export function HRPerformanceTab() {
  const [month, setMonth] = useState(defaultMonth);
  const { data: timesheets = [] } = useHRTimesheets(month);
  const { data: employees = [] } = useHREmployees();

  const performance = useMemo(() => {
    const map: Record<string, { name: string; planned: number; worked: number; overtime: number; absence: number }> = {};
    timesheets.forEach((ts: any) => {
      if (!map[ts.employee_id]) map[ts.employee_id] = { name: ts.hr_employees?.name || "—", planned: 0, worked: 0, overtime: 0, absence: 0 };
      map[ts.employee_id].planned += ts.planned_hours || 0;
      map[ts.employee_id].worked += ts.worked_hours || 0;
      map[ts.employee_id].overtime += ts.overtime_hours || 0;
      map[ts.employee_id].absence += ts.absence_hours || 0;
    });
    return Object.entries(map)
      .map(([id, d]) => ({ id, ...d, efficiency: d.planned > 0 ? Math.round((d.worked / d.planned) * 100) : 0 }))
      .sort((a, b) => b.efficiency - a.efficiency);
  }, [timesheets]);

  const avgEff = performance.length > 0 ? Math.round(performance.reduce((s, p) => s + p.efficiency, 0) / performance.length) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Colaboradores</p><p className="text-xl font-bold">{performance.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Eficiência Média</p><p className="text-xl font-bold">{avgEff}%</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Horas Trabalhadas</p><p className="text-xl font-bold font-mono">{performance.reduce((s, p) => s + p.worked, 0)}h</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Horas Extras</p><p className="text-xl font-bold font-mono">{performance.reduce((s, p) => s + p.overtime, 0)}h</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Ranking Produtividade</CardTitle>
          <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-40" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead className="text-right">Previstas</TableHead>
                <TableHead className="text-right">Realizadas</TableHead>
                <TableHead className="text-right">Extras</TableHead>
                <TableHead className="text-right">Faltas</TableHead>
                <TableHead className="text-right">Eficiência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {performance.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>}
              {performance.map((p, i) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{i + 1}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{p.planned}h</TableCell>
                  <TableCell className="text-right font-mono text-sm">{p.worked}h</TableCell>
                  <TableCell className="text-right font-mono text-sm">{p.overtime}h</TableCell>
                  <TableCell className="text-right font-mono text-sm">{p.absence}h</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={p.efficiency >= 90 ? "default" : p.efficiency >= 70 ? "secondary" : "destructive"}>
                      {p.efficiency}%
                    </Badge>
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
