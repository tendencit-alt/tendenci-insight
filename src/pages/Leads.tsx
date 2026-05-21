import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleShell } from "@/components/layout/ModuleShell";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Sparkles,
  Plus,
  Search,
  MoreHorizontal,
  ArrowRightLeft,
  Loader2,
} from "lucide-react";

type LeadStatus = "novo" | "qualificando" | "qualificado" | "descartado";

interface LeadRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  source_label: string | null;
  status: string;
  temperature: string | null;
  notes: string | null;
  created_at: string;
  client_id: string | null;
  converted_at: string | null;
  converted_deal_id: string | null;
}

const STATUS_META: Record<
  LeadStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  novo: { label: "Novo", variant: "default" },
  qualificando: { label: "Qualificando", variant: "secondary" },
  qualificado: { label: "Qualificado", variant: "outline" },
  descartado: { label: "Descartado", variant: "destructive" },
};

const SOURCES = [
  "Site",
  "Indicação",
  "WhatsApp",
  "Instagram",
  "Facebook",
  "Google Ads",
  "Evento",
  "Outro",
];

export default function Leads() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mx-auto w-full max-w-[1600px] p-4 md:p-6">
          <LeadsContent />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export function LeadsContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: "all", source: "all" });
  const [createOpen, setCreateOpen] = useState(false);
  const [convertingLead, setConvertingLead] = useState<LeadRow | null>(null);

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select(
          "id, name, email, phone, company, source_label, status, temperature, notes, created_at, client_id, converted_at, converted_deal_id"
        )
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as LeadRow[];
    },
  });

  const filtered = useMemo(() => {
    let rows = leads || [];
    if (filters.status !== "all") rows = rows.filter((r) => r.status === filters.status);
    if (filters.source !== "all")
      rows = rows.filter((r) => (r.source_label || "") === filters.source);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.phone?.toLowerCase().includes(q) ||
          r.company?.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [leads, filters, search]);

  const kpis = useMemo(() => {
    const total = leads?.length || 0;
    const novo = leads?.filter((l) => l.status === "novo").length || 0;
    const qualificando = leads?.filter((l) => l.status === "qualificando").length || 0;
    const qualificado = leads?.filter((l) => l.status === "qualificado").length || 0;
    return { total, novo, qualificando, qualificado };
  }, [leads]);

  const updateStatus = async (id: string, status: LeadStatus) => {
    const { error } = await supabase.from("leads").update({ status }).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar: " + error.message);
      return;
    }
    toast.success("Status atualizado");
    queryClient.invalidateQueries({ queryKey: ["leads-list"] });
  };

  return (
    <>
    <ModuleShell
            moduleKey="leads"
            title="Leads"
            description="Pré-qualificação de contatos antes de virarem clientes."
            icon={<Sparkles className="h-5 w-5" />}
            headerActions={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Novo Lead
              </Button>
            }
            overview={
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{kpis.total}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground">Novos</p>
                  <p className="text-2xl font-bold">{kpis.novo}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground">Qualificando</p>
                  <p className="text-2xl font-bold">{kpis.qualificando}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground">Qualificados</p>
                  <p className="text-2xl font-bold">{kpis.qualificado}</p>
                </Card>
              </div>
            }
            records={
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="md:col-span-2 relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome, e-mail, telefone..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <Select
                      value={filters.status}
                      onValueChange={(v) => setFilters({ ...filters, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        {(Object.keys(STATUS_META) as LeadStatus[]).map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_META[s].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={filters.source}
                      onValueChange={(v) => setFilters({ ...filters, source: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Origem" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as origens</SelectItem>
                        {SOURCES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Card>

                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criado</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={6}>
                              <Skeleton className="h-6 w-full" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : filtered.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-10 text-muted-foreground"
                          >
                            Nenhum lead encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((l) => {
                          const statusKey = (l.status as LeadStatus) || "novo";
                          const meta = STATUS_META[statusKey] || STATUS_META.novo;
                          const converted = !!l.converted_at;
                          return (
                            <TableRow key={l.id}>
                              <TableCell className="font-medium">
                                {l.name || l.company || "—"}
                                {l.company && l.name && (
                                  <p className="text-xs text-muted-foreground">
                                    {l.company}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">{l.email || "—"}</div>
                                <div className="text-xs text-muted-foreground">
                                  {l.phone || ""}
                                </div>
                              </TableCell>
                              <TableCell>{l.source_label || "—"}</TableCell>
                              <TableCell>
                                <Badge variant={meta.variant}>{meta.label}</Badge>
                                {converted && (
                                  <Badge variant="outline" className="ml-2">
                                    Convertido
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {new Date(l.created_at).toLocaleDateString("pt-BR")}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      disabled={converted}
                                      onClick={() => setConvertingLead(l)}
                                    >
                                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                                      Converter em Cliente
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {(Object.keys(STATUS_META) as LeadStatus[]).map(
                                      (s) => (
                                        <DropdownMenuItem
                                          key={s}
                                          disabled={l.status === s}
                                          onClick={() => updateStatus(l.id, s)}
                                        >
                                          Marcar como {STATUS_META[s].label}
                                        </DropdownMenuItem>
                                      )
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            }
          />

          <CreateLeadDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onCreated={() =>
              queryClient.invalidateQueries({ queryKey: ["leads-list"] })
            }
          />

          <ConvertLeadDialog
            lead={convertingLead}
            onOpenChange={(open) => !open && setConvertingLead(null)}
            onConverted={(dealId) => {
              queryClient.invalidateQueries({ queryKey: ["leads-list"] });
              setConvertingLead(null);
              toast.success("Lead convertido com sucesso!");
              if (dealId) navigate(`/crm-comercial?dealId=${dealId}`);
            }}
          />
    </>
  );
}



/* ----------------- Create Lead Dialog ----------------- */
function CreateLeadDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    source_label: "",
    notes: "",
  });

  const submit = async () => {
    if (!form.name.trim() && !form.phone.trim() && !form.email.trim()) {
      toast.error("Informe ao menos nome, telefone ou e-mail");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("leads").insert({
        name: form.name || null,
        email: form.email || null,
        phone: form.phone || null,
        company: form.company || null,
        source_label: form.source_label || null,
        notes: form.notes || null,
        status: "novo",
      } as any);
      if (error) throw error;
      toast.success("Lead criado");
      onCreated();
      onOpenChange(false);
      setForm({ name: "", email: "", phone: "", company: "", source_label: "", notes: "" });
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <Input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Origem</Label>
            <Select
              value={form.source_label}
              onValueChange={(v) => setForm({ ...form, source_label: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------- Convert Lead → Cliente + Oportunidade ----------------- */
async function ensureDefaultPipelineAndStage(): Promise<{
  pipeline_id: string;
  stage_id: string;
}> {
  // Find or create default pipeline
  let pipelineId: string | null = null;
  const { data: pipes } = await supabase
    .from("crm_pipelines")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1);
  if (pipes && pipes.length) pipelineId = pipes[0].id;
  else {
    const { data, error } = await supabase
      .from("crm_pipelines")
      .insert({ name: "Pipeline Comercial" } as any)
      .select("id")
      .single();
    if (error) throw error;
    pipelineId = data.id;
  }

  // Find or create "Qualificado" stage
  const { data: stages } = await supabase
    .from("crm_stages")
    .select("id, name, position")
    .eq("pipeline_id", pipelineId!)
    .order("position");
  let stage = stages?.find((s) =>
    s.name?.toLowerCase().includes("qualificado")
  );
  if (!stage) {
    const seed = [
      { name: "Qualificado", position: 1 },
      { name: "Proposta", position: 2 },
      { name: "Negociação", position: 3 },
      { name: "Fechado", position: 4 },
    ];
    const toCreate = seed.filter(
      (s) => !stages?.some((x) => x.name?.toLowerCase() === s.name.toLowerCase())
    );
    if (toCreate.length) {
      const { error } = await supabase.from("crm_stages").insert(
        toCreate.map((s) => ({
          pipeline_id: pipelineId!,
          name: s.name,
          position: s.position,
        })) as any
      );
      if (error) throw error;
    }
    const { data: refreshed } = await supabase
      .from("crm_stages")
      .select("id, name, position")
      .eq("pipeline_id", pipelineId!)
      .order("position");
    stage = refreshed?.find((s) =>
      s.name?.toLowerCase().includes("qualificado")
    );
  }
  if (!stage) throw new Error("Não foi possível criar a fase Qualificado");
  return { pipeline_id: pipelineId!, stage_id: stage.id };
}

function ConvertLeadDialog({
  lead,
  onOpenChange,
  onConverted,
}: {
  lead: LeadRow | null;
  onOpenChange: (o: boolean) => void;
  onConverted: (dealId?: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [dealTitle, setDealTitle] = useState("");
  const [dealValue, setDealValue] = useState("");

  const handleConvert = async () => {
    if (!lead) return;
    setLoading(true);
    try {
      // 1) Create or reuse client
      let clientId = lead.client_id;
      if (!clientId) {
        const { data: client, error: cErr } = await supabase
          .from("clients")
          .insert({
            name: lead.name || lead.company || "Cliente sem nome",
            email: lead.email || null,
            phone: lead.phone || null,
            tipo_pessoa: lead.company ? "PJ" : "PF",
            razao_social: lead.company || null,
          } as any)
          .select("id")
          .single();
        if (cErr) throw cErr;
        clientId = client.id;
      }

      // 2) Ensure pipeline + Qualificado stage
      const { pipeline_id, stage_id } = await ensureDefaultPipelineAndStage();

      // 3) Create deal (oportunidade)
      const { data: deal, error: dErr } = await supabase
        .from("crm_deals")
        .insert({
          pipeline_id,
          stage_id,
          lead_id: lead.id,
          title: dealTitle.trim() || `Oportunidade — ${lead.name || lead.company || "Lead"}`,
          value: Number(dealValue) || 0,
          status: "aberto",
        } as any)
        .select("id")
        .single();
      if (dErr) throw dErr;

      // 4) Update lead → qualificado + linked
      const { error: lErr } = await supabase
        .from("leads")
        .update({
          status: "qualificado",
          client_id: clientId,
          converted_at: new Date().toISOString(),
          converted_deal_id: deal.id,
        } as any)
        .eq("id", lead.id);
      if (lErr) throw lErr;

      onConverted(deal.id);
    } catch (e: any) {
      toast.error("Erro ao converter: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!lead} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Converter Lead em Cliente</DialogTitle>
        </DialogHeader>
        {lead && (
          <div className="space-y-3 py-2">
            <div className="rounded-md border p-3 bg-muted/30 text-sm">
              <div className="font-medium">
                {lead.name || lead.company || "Lead sem nome"}
              </div>
              <div className="text-xs text-muted-foreground">
                {[lead.email, lead.phone].filter(Boolean).join(" · ")}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Será criado um <strong>cliente</strong> e uma{" "}
              <strong>oportunidade</strong> no pipeline comercial (fase Qualificado).
            </p>
            <div className="space-y-1.5">
              <Label>Título da oportunidade</Label>
              <Input
                value={dealTitle}
                onChange={(e) => setDealTitle(e.target.value)}
                placeholder={`Oportunidade — ${lead.name || lead.company || "Lead"}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Valor estimado (R$)</Label>
              <Input
                type="number"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConvert} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Converter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
