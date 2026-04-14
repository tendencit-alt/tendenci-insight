import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useHREmployees, useHRDepartments, useHRTimesheets } from "@/hooks/useHRData";
import { Users, DollarSign, Clock, AlertTriangle } from "lucide-react";

const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

export function HRAnalyticsTab() {
  const { data: employees = [] } = useHREmployees();
  const { data: departments = [] } = useHRDepartments();
  const { data: timesheets = [] } = useHRTimesheets(currentMonth);

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const activeEmps = employees.filter((e: any) => e.status === "active");
  const totalCost = activeEmps.reduce((s: number, e: any) => s + (e.monthly_cost || 0), 0);
  const avgCost = activeEmps.length > 0 ? totalCost / activeEmps.length : 0;

  const totalOvertime = timesheets.reduce((s: number, t: any) => s + (t.overtime_hours || 0), 0);
  const totalAbsence = timesheets.reduce((s: number, t: any) => s + (t.absence_hours || 0), 0);
  const totalPlanned = timesheets.reduce((s: number, t: any) => s + (t.planned_hours || 0), 0);
  const absenteeismRate = totalPlanned > 0 ? ((totalAbsence / totalPlanned) * 100).toFixed(1) : "0";

  const costByDept = useMemo(() => {
    const map: Record<string, { name: string; count: number; cost: number }> = {};
    activeEmps.forEach((e: any) => {
      const dName = e.hr_departments?.name || "Sem departamento";
      if (!map[dName]) map[dName] = { name: dName, count: 0, cost: 0 };
      map[dName].count += 1;
      map[dName].cost += e.monthly_cost || 0;
    });
    return Object.values(map).sort((a, b) => b.cost - a.cost);
  }, [activeEmps]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div><p className="text-xs text-muted-foreground">Headcount</p><p className="text-2xl font-bold">{activeEmps.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-primary" />
            <div><p className="text-xs text-muted-foreground">Custo Total Equipe</p><p className="text-xl font-bold font-mono">{fmt(totalCost)}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary" />
            <div><p className="text-xs text-muted-foreground">Horas Extras (mês)</p><p className="text-xl font-bold font-mono">{totalOvertime}h</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div><p className="text-xs text-muted-foreground">Absenteísmo</p><p className="text-xl font-bold">{absenteeismRate}%</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-lg">Custo por Área</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Departamento</TableHead><TableHead className="text-right">Colaboradores</TableHead><TableHead className="text-right">Custo Mensal</TableHead></TableRow></TableHeader>
              <TableBody>
                {costByDept.map(d => (
                  <TableRow key={d.name}><TableCell>{d.name}</TableCell><TableCell className="text-right font-mono">{d.count}</TableCell><TableCell className="text-right font-mono text-sm">{fmt(d.cost)}</TableCell></TableRow>
                ))}
                {costByDept.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Custo por Colaborador (Top 10)</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Colaborador</TableHead><TableHead className="text-right">Custo Mensal</TableHead><TableHead className="text-right">Custo/Hora</TableHead></TableRow></TableHeader>
              <TableBody>
                {activeEmps.sort((a: any, b: any) => (b.monthly_cost || 0) - (a.monthly_cost || 0)).slice(0, 10).map((e: any) => (
                  <TableRow key={e.id}><TableCell>{e.name}</TableCell><TableCell className="text-right font-mono text-sm">{fmt(e.monthly_cost)}</TableCell><TableCell className="text-right font-mono text-sm">{fmt(e.hourly_cost)}</TableCell></TableRow>
                ))}
                {activeEmps.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
