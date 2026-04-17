import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Plus } from "lucide-react";
import {
  useOfferCatalog,
  useOfferPriorityRules,
  useOfferDeliveryEvents,
  useOfferAnalytics,
  useUpsertOffer,
  useUpsertPriorityRule,
} from "@/hooks/useOfferOrchestration";

export default function OwnerOfferCenter() {
  const { data: catalog } = useOfferCatalog();
  const { data: rules } = useOfferPriorityRules();
  const { data: events } = useOfferDeliveryEvents({ limit: 50 });
  const { data: analytics } = useOfferAnalytics();
  const upsertOffer = useUpsertOffer();
  const upsertRule = useUpsertPriorityRule();

  const totals = analytics?.totals ?? {};
  const conversionRate = totals.shown > 0 ? ((totals.converted / totals.shown) * 100).toFixed(1) : "0";

  return (
    <div className="container mx-auto space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Smart Offer Orchestration
          </h1>
          <p className="text-sm text-muted-foreground">
            Motor central de ofertas, priorização, elegibilidade e supressão.
          </p>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard label="Exibições (90d)" value={totals.shown ?? 0} />
        <KpiCard label="Conversões" value={totals.converted ?? 0} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} />
        <KpiCard label="Taxa de conversão" value={`${conversionRate}%`} icon={<TrendingUp className="h-4 w-4 text-primary" />} />
        <KpiCard label="Suprimidas" value={totals.suppressed ?? 0} icon={<XCircle className="h-4 w-4 text-amber-500" />} />
      </div>

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Catálogo</TabsTrigger>
          <TabsTrigger value="priority">Prioridades</TabsTrigger>
          <TabsTrigger value="events">Eventos recentes</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-3">
          <div className="flex justify-end">
            <OfferDialog onSave={(p) => upsertOffer.mutate(p)} />
          </div>
          <Card className="divide-y">
            {(catalog ?? []).map((o: any) => (
              <div key={o.id} className="flex items-center justify-between p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{o.name}</span>
                    <Badge variant="outline" className="text-xs">{o.offer_type}</Badge>
                    <Badge variant={o.status === "active" ? "default" : "secondary"} className="text-xs">{o.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{o.offer_code} · prioridade {o.priority_base} · {o.default_channel}</p>
                </div>
                <Switch
                  checked={o.status === "active"}
                  onCheckedChange={(v) => upsertOffer.mutate({ ...o, status: v ? "active" : "paused" })}
                />
              </div>
            ))}
            {(!catalog || catalog.length === 0) && (
              <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma oferta cadastrada.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="priority" className="space-y-3">
          <Card className="divide-y">
            {(rules ?? []).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.rule_name}</span>
                    <Badge variant="outline" className="text-xs">{r.signal_category}</Badge>
                    {r.offer_type && <Badge variant="secondary" className="text-xs">{r.offer_type}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{r.notes ?? "—"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    defaultValue={r.priority_weight}
                    className="h-8 w-20"
                    onBlur={(e) =>
                      upsertRule.mutate({ ...r, priority_weight: parseInt(e.target.value || "0", 10) })
                    }
                  />
                  <Switch
                    checked={r.active}
                    onCheckedChange={(v) => upsertRule.mutate({ ...r, active: v })}
                  />
                </div>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-3">
          <Card className="divide-y">
            {(events ?? []).map((e: any) => (
              <div key={e.id} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{e.offer_catalog?.name ?? e.offer_code}</span>
                    <EventTypeBadge type={e.event_type} />
                    <Badge variant="outline" className="text-xs">{e.channel}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {e.tenants?.name ?? "—"} · {new Date(e.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
            {(!events || events.length === 0) && (
              <p className="p-6 text-center text-sm text-muted-foreground">Nenhum evento ainda.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold">Top conversões</h3>
              <div className="space-y-2">
                {(analytics?.top_converted ?? []).map((o: any) => (
                  <div key={o.offer_code} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{o.name}</span>
                    <span className="font-medium">{o.converted}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Mais ignoradas
              </h3>
              <div className="space-y-2">
                {(analytics?.top_ignored ?? []).map((o: any) => (
                  <div key={o.offer_code} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{o.name}</span>
                    <span className="font-medium">{o.ignored}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-4 md:col-span-2">
              <h3 className="mb-3 text-sm font-semibold">Por tipo de oferta</h3>
              <div className="space-y-2">
                {(analytics?.per_type ?? []).map((t: any) => (
                  <div key={t.offer_type} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.offer_type}</span>
                    <span className="font-medium">
                      {t.converted}/{t.shown} ({t.conversion_rate}%)
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ label, value, icon }: { label: string; value: any; icon?: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </Card>
  );
}

function EventTypeBadge({ type }: { type: string }) {
  const map: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    shown: "outline",
    clicked: "secondary",
    converted: "default",
    ignored: "secondary",
    dismissed: "secondary",
    suppressed: "destructive",
  };
  return <Badge variant={map[type] ?? "outline"} className="text-xs">{type}</Badge>;
}

function OfferDialog({ onSave }: { onSave: (p: any) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    offer_code: "",
    offer_type: "upgrade_plano",
    name: "",
    description: "",
    priority_base: 50,
    default_channel: "in_app_contextual",
    message_template: "",
    cta_label: "Saiba mais",
    status: "active",
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Nova oferta</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova oferta</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Código</Label><Input value={form.offer_code} onChange={(e) => setForm({ ...form, offer_code: e.target.value })} /></div>
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Mensagem</Label><Input value={form.message_template} onChange={(e) => setForm({ ...form, message_template: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Prioridade base</Label><Input type="number" value={form.priority_base} onChange={(e) => setForm({ ...form, priority_base: parseInt(e.target.value || "0", 10) })} /></div>
            <div><Label>CTA</Label><Input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} /></div>
          </div>
          <Button onClick={() => { onSave(form); setOpen(false); }} className="w-full">Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
