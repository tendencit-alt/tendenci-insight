// Página "RH / PJ" do módulo Financeiro.
// Gating: PermissionGuard (admin OU módulo financeiro com can_admin/edit).
// Salário/CPF: backend protege via gatilho; UI mascara para quem não pode ver.

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleShell } from "@/components/layout/ModuleShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Users, Plus, FileText, Clock, AlertTriangle, Stethoscope, Eye, LogIn, LogOut, Calculator, MapPin } from "lucide-react";
import {
  useCanViewHrPii,
  useRhEmployees, useSaveEmployee,
  useTimeRecords, useCreateTimeRecord,
  useAbsences, useCreateAbsence,
  useMedicalCertificates, useCreateMedicalCertificate,
  useEmployeeMonthSummary,
  useServiceProviders, useSaveServiceProvider,
  useServiceProviderDocs, useUploadProviderDoc,
  useExpenseChartAccounts,
  useHrSettings, useSaveHrSettings,
  useWorkLocations, useSaveWorkLocation, useDeleteWorkLocation,
  getSignedUrl,
} from "@/hooks/useRhPj";


import { useActiveTenant } from "@/hooks/useActiveTenant";
import { CltProvisionDialog } from "@/components/hr/CltProvisionDialog";
import { TimeClockPunchDialog } from "@/components/hr/TimeClockPunchDialog";
import { computeVacationProvision, computeThirteenthProvision, brl } from "@/lib/clt-provisions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

function mask(v: any, can: boolean, placeholder = "•••") {
  if (can) return v ?? "—";
  return placeholder;
}

// ───────────────────────── RH ─────────────────────────
function EmployeesSection() {
  const { data: employees = [] } = useRhEmployees();
  const { data: canPii } = useCanViewHrPii();
  const save = useSaveEmployee();
  const { data: settings } = useHrSettings();

  const { activeTenantId } = useActiveTenant();
  const [costCenters, setCostCenters] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (!activeTenantId) return;
    supabase.from("fin_cost_centers").select("id, name").eq("tenant_id", activeTenantId).eq("active", true).order("name")
      .then(({ data }) => setCostCenters(data ?? []));
  }, [activeTenantId]);
  const { data: chartAccounts = [] } = useExpenseChartAccounts();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [provDlg, setProvDlg] = useState<{ kind: "vacation" | "thirteenth"; emp: any } | null>(null);
  const [form, setForm] = useState<any>({
    name: "", cpf: "", contract_type: "CLT", admission_date: "", termination_date: "",
    base_salary: 0, dependents_count: 0, status: "active", notes: "",
    cost_center_id: "", chart_account_id: "",
  });

  const summary = useEmployeeMonthSummary(selected ?? undefined, month);
  const times = useTimeRecords(selected ?? undefined, month);
  const absences = useAbsences(selected ?? undefined);
  const certs = useMedicalCertificates(selected ?? undefined);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Colaboradores (CLT)</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo colaborador</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Novo colaborador</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              {canPii && (
                <div><Label>CPF</Label><Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></div>
              )}
              <div>
                <Label>Tipo de contrato</Label>
                <Select value={form.contract_type} onValueChange={(v) => setForm({ ...form, contract_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLT">CLT</SelectItem>
                    <SelectItem value="Estágio">Estágio</SelectItem>
                    <SelectItem value="Jovem Aprendiz">Jovem Aprendiz</SelectItem>
                    <SelectItem value="Temporário">Temporário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Admissão</Label><Input type="date" value={form.admission_date} onChange={(e) => setForm({ ...form, admission_date: e.target.value })} /></div>
              <div><Label>Demissão</Label><Input type="date" value={form.termination_date} onChange={(e) => setForm({ ...form, termination_date: e.target.value })} /></div>
              {canPii && (
                <div><Label>Salário base</Label><Input type="number" step="0.01" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: Number(e.target.value) })} /></div>
              )}
              <div><Label>Nº dependentes</Label><Input type="number" value={form.dependents_count} onChange={(e) => setForm({ ...form, dependents_count: Number(e.target.value) })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="leave">Afastado</SelectItem>
                    <SelectItem value="terminated">Desligado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Centro de Custo</Label>
                <Select value={form.cost_center_id || "none"} onValueChange={(v) => setForm({ ...form, cost_center_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Sem CC —</SelectItem>
                    {costCenters.map((cc: any) => <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria contábil (despesa de folha)</Label>
                <Select value={form.chart_account_id || "none"} onValueChange={(v) => setForm({ ...form, chart_account_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Sem categoria —</SelectItem>
                    {chartAccounts.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={async () => {
                const payload: any = { ...form };
                Object.keys(payload).forEach(k => payload[k] === "" && (payload[k] = null));
                await save.mutateAsync(payload);
                setOpen(false);
              }}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead><TableHead>CPF</TableHead><TableHead>Cargo</TableHead>
              <TableHead>Admissão</TableHead><TableHead>Salário</TableHead>
              <TableHead>Férias (saldo)</TableHead><TableHead>13º (saldo)</TableHead>
              <TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((e: any) => {
              const vac = computeVacationProvision({ baseSalary: Number(e.base_salary || 0), admissionDate: e.admission_date });
              const th = computeThirteenthProvision({ baseSalary: Number(e.base_salary || 0), admissionDate: e.admission_date });
              return (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.name}</TableCell>
                <TableCell className="font-mono text-xs">{mask(e.cpf, !!canPii)}</TableCell>
                <TableCell>{e.hr_positions?.title ?? "—"}</TableCell>
                <TableCell>{e.admission_date ?? "—"}</TableCell>
                <TableCell>{canPii ? brl(Number(e.base_salary)) : "•••"}</TableCell>
                <TableCell>
                  {canPii ? (
                    <button className="underline-offset-2 hover:underline text-left" onClick={() => setProvDlg({ kind: "vacation", emp: e })}>
                      <span className="tabular-nums">{brl(vac.accruedBalance)}</span>
                      <Calculator className="inline h-3 w-3 ml-1 opacity-60" />
                    </button>
                  ) : "•••"}
                </TableCell>
                <TableCell>
                  {canPii ? (
                    <button className="underline-offset-2 hover:underline text-left" onClick={() => setProvDlg({ kind: "thirteenth", emp: e })}>
                      <span className="tabular-nums">{brl(th.accruedBalance)}</span>
                      <Calculator className="inline h-3 w-3 ml-1 opacity-60" />
                    </button>
                  ) : "•••"}
                </TableCell>
                <TableCell><Badge variant="secondary">{e.status}</Badge></TableCell>
                <TableCell><Button size="sm" variant="ghost" onClick={() => setSelected(e.id)}><Eye className="h-4 w-4" /></Button></TableCell>
              </TableRow>
              );
            })}
            {!employees.length && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Nenhum colaborador.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      {selected && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Detalhe — {employees.find((e: any) => e.id === selected)?.name}</h4>
            <div className="flex gap-2 items-center">
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
              <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Fechar</Button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <SummaryBox icon={Clock} label="Horas mês" value={summary.data?.totalHours?.toFixed(1) ?? "0.0"} />
            <SummaryBox icon={AlertTriangle} label="Faltas" value={String(summary.data?.faltas ?? 0)} />
            <SummaryBox icon={Clock} label="Atrasos" value={String(summary.data?.atrasos ?? 0)} />
            <SummaryBox icon={Stethoscope} label="Dias atestado" value={String(summary.data?.atestadoDias ?? 0)} />
          </div>

          <Tabs defaultValue="ponto">
            <TabsList>
              <TabsTrigger value="ponto">Ponto</TabsTrigger>
              <TabsTrigger value="faltas">Faltas</TabsTrigger>
              <TabsTrigger value="atestados">Atestados</TabsTrigger>
            </TabsList>
            <TabsContent value="ponto"><TimeRecordsPanel employeeId={selected} records={times.data ?? []} /></TabsContent>
            <TabsContent value="faltas"><AbsencesPanel employeeId={selected} records={absences.data ?? []} certs={certs.data ?? []} /></TabsContent>
            <TabsContent value="atestados"><CertificatesPanel employeeId={selected} records={certs.data ?? []} /></TabsContent>
          </Tabs>
        </Card>
      )}

      {provDlg && (
        <CltProvisionDialog
          open={!!provDlg}
          onOpenChange={(v) => !v && setProvDlg(null)}
          kind={provDlg.kind}
          employeeName={provDlg.emp.name}
          baseSalary={Number(provDlg.emp.base_salary || 0)}
          admissionDate={provDlg.emp.admission_date}
        />
      )}
    </div>
  );
}

function SummaryBox({ icon: Icon, label, value }: any) {
  return (
    <Card className="p-3 flex items-center gap-3">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <div><div className="text-xs text-muted-foreground">{label}</div><div className="text-lg font-semibold">{value}</div></div>
    </Card>
  );
}

function TimeRecordsPanel({ employeeId, records }: any) {
  const create = useCreateTimeRecord();
  const [form, setForm] = useState({ work_date: "", time_in: "", time_out: "", notes: "" });
  const [punch, setPunch] = useState<"in" | "out" | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button size="sm" variant="default" onClick={() => setPunch("in")}><LogIn className="h-4 w-4 mr-1" />Bater entrada</Button>
        <Button size="sm" variant="secondary" onClick={() => setPunch("out")}><LogOut className="h-4 w-4 mr-1" />Bater saída</Button>
      </div>
      <div className="grid grid-cols-5 gap-2 items-end">
        <Input type="date" value={form.work_date} onChange={(e) => setForm({ ...form, work_date: e.target.value })} />
        <Input type="time" value={form.time_in} onChange={(e) => setForm({ ...form, time_in: e.target.value })} />
        <Input type="time" value={form.time_out} onChange={(e) => setForm({ ...form, time_out: e.target.value })} />
        <Input placeholder="Obs." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <Button variant="outline" onClick={async () => {
          if (!form.work_date) return toast.error("Data obrigatória");
          await create.mutateAsync({ employee_id: employeeId, ...form, notes: form.notes || null });
          setForm({ work_date: "", time_in: "", time_out: "", notes: "" });
        }}>Lançamento manual</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Entrada</TableHead><TableHead>Saída</TableHead><TableHead>Horas</TableHead><TableHead>Local / Foto</TableHead></TableRow></TableHeader>
        <TableBody>
          {records.map((r: any) => (
            <TableRow key={r.id}>
              <TableCell>{r.work_date}</TableCell>
              <TableCell>{r.time_in ?? "—"}</TableCell>
              <TableCell>{r.time_out ?? "—"}</TableCell>
              <TableCell>{Number(r.worked_hours).toFixed(2)}</TableCell>
              <TableCell className="text-xs">
                <PunchEvidence r={r} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {punch && (
        <TimeClockPunchDialog
          open={!!punch}
          onOpenChange={(v) => !v && setPunch(null)}
          employeeId={employeeId}
          employeeName=""
          kind={punch}
        />
      )}
    </div>
  );
}

function PunchEvidence({ r }: { r: any }) {
  const items: JSX.Element[] = [];
  const render = (label: string, lat?: number, lng?: number, acc?: number, path?: string) => {
    if (!lat && !path) return null;
    return (
      <div className="flex items-center gap-1">
        <span className="font-medium">{label}:</span>
        {lat != null && lng != null && (
          <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer" className="underline">
            <MapPin className="inline h-3 w-3" /> {lat.toFixed(4)},{lng.toFixed(4)}
            {acc != null && <span className="text-muted-foreground"> ±{Math.round(acc)}m</span>}
          </a>
        )}
        {path && (
          <button className="underline" onClick={async () => window.open(await getSignedUrl("hr-time-photos", path), "_blank")}>
            foto
          </button>
        )}
      </div>
    );
  };
  const a = render("E", r.time_in_lat, r.time_in_lng, r.time_in_accuracy, r.time_in_photo_path);
  const b = render("S", r.time_out_lat, r.time_out_lng, r.time_out_accuracy, r.time_out_photo_path);
  if (a) items.push(<div key="a">{a}</div>);
  if (b) items.push(<div key="b">{b}</div>);
  return items.length ? <div className="space-y-0.5">{items}</div> : <span className="text-muted-foreground">—</span>;
}

function AbsencesPanel({ employeeId, records, certs }: any) {
  const create = useCreateAbsence();
  const [form, setForm] = useState({ absence_date: "", absence_type: "falta", justified: false, certificate_id: "", notes: "" });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-6 gap-2 items-end">
        <Input type="date" value={form.absence_date} onChange={(e) => setForm({ ...form, absence_date: e.target.value })} />
        <Select value={form.absence_type} onValueChange={(v) => setForm({ ...form, absence_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="falta">Falta</SelectItem><SelectItem value="atraso">Atraso</SelectItem>
            <SelectItem value="atestado">Atestado</SelectItem><SelectItem value="folga">Folga</SelectItem>
          </SelectContent>
        </Select>
        <Select value={form.justified ? "1" : "0"} onValueChange={(v) => setForm({ ...form, justified: v === "1" })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="0">Não justificada</SelectItem><SelectItem value="1">Justificada</SelectItem></SelectContent>
        </Select>
        <Select value={form.certificate_id || "none"} onValueChange={(v) => setForm({ ...form, certificate_id: v === "none" ? "" : v })}>
          <SelectTrigger><SelectValue placeholder="Atestado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem atestado</SelectItem>
            {certs.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.start_date} → {c.end_date}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Obs." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <Button onClick={async () => {
          if (!form.absence_date) return toast.error("Data obrigatória");
          await create.mutateAsync({
            employee_id: employeeId, absence_date: form.absence_date, absence_type: form.absence_type,
            justified: form.justified, certificate_id: form.certificate_id || null, notes: form.notes || null,
          });
          setForm({ absence_date: "", absence_type: "falta", justified: false, certificate_id: "", notes: "" });
        }}>Adicionar</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Justificada</TableHead><TableHead>Obs.</TableHead></TableRow></TableHeader>
        <TableBody>
          {records.map((r: any) => (
            <TableRow key={r.id}>
              <TableCell>{r.absence_date}</TableCell><TableCell><Badge variant="outline">{r.absence_type}</Badge></TableCell>
              <TableCell>{r.justified ? "Sim" : "Não"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{r.notes ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CertificatesPanel({ employeeId, records }: any) {
  const create = useCreateMedicalCertificate();
  const [form, setForm] = useState<any>({ start_date: "", end_date: "", cid: "", notes: "", file: null });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2 items-end">
        <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
        <Input placeholder="CID (opc.)" value={form.cid} onChange={(e) => setForm({ ...form, cid: e.target.value })} />
        <Input type="file" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} />
        <Button onClick={async () => {
          if (!form.start_date || !form.end_date) return toast.error("Datas obrigatórias");
          await create.mutateAsync({
            employee_id: employeeId, start_date: form.start_date, end_date: form.end_date,
            cid: form.cid || null, notes: form.notes || null, file: form.file,
          });
          setForm({ start_date: "", end_date: "", cid: "", notes: "", file: null });
        }}>Adicionar</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Início</TableHead><TableHead>Fim</TableHead><TableHead>Dias</TableHead><TableHead>CID</TableHead><TableHead>Arquivo</TableHead></TableRow></TableHeader>
        <TableBody>
          {records.map((r: any) => (
            <TableRow key={r.id}>
              <TableCell>{r.start_date}</TableCell><TableCell>{r.end_date}</TableCell><TableCell>{r.days_count}</TableCell><TableCell>{r.cid ?? "—"}</TableCell>
              <TableCell>{r.file_path ? <Button size="sm" variant="link" onClick={async () => window.open(await getSignedUrl("hr-medical-certificates", r.file_path), "_blank")}>abrir</Button> : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ───────────────────────── PJ ─────────────────────────
function ProvidersSection() {
  const { data: providers = [] } = useServiceProviders();
  const save = useSaveServiceProvider();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<any>({
    legal_name: "", cnpj: "", service_type: "", contract_value: 0,
    start_date: "", end_date: "", status: "active", notes: "",
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Prestadores (PJ)</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo prestador</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Novo prestador</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Razão social / Nome</Label><Input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} /></div>
              <div><Label>CNPJ</Label><Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></div>
              <div><Label>Tipo de serviço</Label><Input value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} /></div>
              <div><Label>Valor do contrato</Label><Input type="number" step="0.01" value={form.contract_value} onChange={(e) => setForm({ ...form, contract_value: Number(e.target.value) })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem><SelectItem value="inactive">Inativo</SelectItem><SelectItem value="terminated">Encerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Início</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>Fim</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              <div className="col-span-2"><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={async () => {
                const payload: any = { ...form };
                Object.keys(payload).forEach(k => payload[k] === "" && (payload[k] = null));
                await save.mutateAsync(payload); setOpen(false);
              }}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Razão Social</TableHead><TableHead>CNPJ</TableHead><TableHead>Serviço</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {providers.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.legal_name}</TableCell>
                <TableCell className="font-mono text-xs">{p.cnpj ?? "—"}</TableCell>
                <TableCell>{p.service_type ?? "—"}</TableCell>
                <TableCell>{Number(p.contract_value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                <TableCell><Badge variant="secondary">{p.status}</Badge></TableCell>
                <TableCell><Button size="sm" variant="ghost" onClick={() => setSelected(p.id)}><FileText className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
            {!providers.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhum prestador.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      {selected && <ProviderDocs providerId={selected} onClose={() => setSelected(null)} name={providers.find((p: any) => p.id === selected)?.legal_name} />}
    </div>
  );
}

function ProviderDocs({ providerId, onClose, name }: any) {
  const { data: docs = [] } = useServiceProviderDocs(providerId);
  const upload = useUploadProviderDoc();
  const [form, setForm] = useState<any>({ doc_type: "contrato", description: "", file: null });
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Documentos — {name}</h4>
        <Button size="sm" variant="ghost" onClick={onClose}>Fechar</Button>
      </div>
      <div className="grid grid-cols-4 gap-2 items-end">
        <Select value={form.doc_type} onValueChange={(v) => setForm({ ...form, doc_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="contrato">Contrato</SelectItem><SelectItem value="aditivo">Aditivo</SelectItem>
            <SelectItem value="nota">Nota</SelectItem><SelectItem value="outro">Outro</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Input type="file" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} />
        <Button onClick={async () => {
          if (!form.file) return toast.error("Selecione um arquivo");
          await upload.mutateAsync({ provider_id: providerId, ...form });
          setForm({ doc_type: "contrato", description: "", file: null });
        }}>Enviar</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead><TableHead>Data</TableHead><TableHead>Arquivo</TableHead></TableRow></TableHeader>
        <TableBody>
          {docs.map((d: any) => (
            <TableRow key={d.id}>
              <TableCell><Badge variant="outline">{d.doc_type}</Badge></TableCell>
              <TableCell>{d.description ?? "—"}</TableCell>
              <TableCell>{new Date(d.created_at).toLocaleDateString("pt-BR")}</TableCell>
              <TableCell><Button size="sm" variant="link" onClick={async () => window.open(await getSignedUrl("service-provider-documents", d.file_path), "_blank")}>abrir</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

// ───────────────────────── Painel reutilizável ─────────────────────────
// Usado tanto pela rota /financeiro/rh-pj quanto como aba na página Financeiro.
export function RhPjPanel() {
  const generatePayroll = async () => {
    const month = new Date().toISOString().slice(0, 7) + "-01";
    const { data, error } = await supabase.rpc("generate_hr_payroll_payables", { _month: month });
    if (error) return toast.error(error.message);
    const r = (data as any)?.[0] ?? data;
    toast.success(`Folha gerada: ${r?.created ?? 0} criados, ${r?.updated ?? 0} atualizados`);
  };
  const generatePj = async () => {
    const month = new Date().toISOString().slice(0, 7) + "-01";
    const { data, error } = await supabase.rpc("generate_pj_contract_payables", { _month: month });
    if (error) return toast.error(error.message);
    const r = (data as any)?.[0] ?? data;
    toast.success(`PJ gerado: ${r?.created ?? 0} criados, ${r?.updated ?? 0} atualizados`);
  };

  return (
    <Tabs defaultValue="rh" className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <TabsList>
          <TabsTrigger value="rh" className="gap-1.5"><Users className="h-4 w-4" />RH (CLT)</TabsTrigger>
          <TabsTrigger value="pj" className="gap-1.5"><Briefcase className="h-4 w-4" />PJ (Prestadores)</TabsTrigger>
        </TabsList>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={generatePayroll}>Gerar folha do mês</Button>
          <Button size="sm" variant="outline" onClick={generatePj}>Gerar PJ do mês</Button>
        </div>
      </div>
      <TabsContent value="rh"><EmployeesSection /></TabsContent>
      <TabsContent value="pj"><ProvidersSection /></TabsContent>
    </Tabs>
  );
}

// ───────────────────────── Página standalone ─────────────────────────
export default function FinanceiroRhPj() {
  return (
    <DashboardLayout>
      <ModuleShell
        moduleKey="financeiro"
        title="RH / PJ"
        description="Gestão de colaboradores CLT e prestadores PJ — acesso restrito a Administradores e Financeiro/RH/PJ."
        icon={<Briefcase className="h-5 w-5" />}
        records={<RhPjPanel />}
      />
    </DashboardLayout>
  );
}
