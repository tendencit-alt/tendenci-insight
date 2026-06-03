import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Check, Lock, Loader2, CreditCard, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Plan = {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  preco_mensal: number;
  features_jsonb: Record<string, boolean>;
  modules_jsonb: Record<string, boolean>;
};

type Subscription = {
  id: string;
  tenant_id: string;
  plan_slug: string;
  status: "trialing" | "active" | "past_due" | "canceled";
  trial_ends_at: string | null;
  current_period_end: string | null;
  asaas_customer_id: string | null;
  asaas_subscription_id: string | null;
};

const FEATURE_LABELS: Record<string, string> = {
  contatos: "Contatos e CRM",
  pedidos: "Pedidos",
  financeiro_basico: "Financeiro básico",
  catalogo: "Catálogo público",
  rh_basico: "RH básico",
  kpis_avancados: "KPIs avançados",
  producao: "Produção",
  entregas: "Entregas e montagem",
  visao_consolidada: "Visão consolidada multi-empresa",
  automacoes_avancadas: "Automações avançadas",
  bi_completo: "BI completo",
  executive: "Centro executivo",
  
};

export default function Assinatura() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const upgradeFeature = searchParams.get("upgrade");

  const load = async () => {
    setLoading(true);
    const [{ data: plansData }, { data: subData }] = await Promise.all([
      supabase.from("subscription_plans").select("*").eq("is_active", true).order("preco_mensal"),
      supabase.from("tenant_subscriptions").select("*").maybeSingle(),
    ]);
    setPlans((plansData as any) ?? []);
    setSub((subData as any) ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const currentPlan = plans.find((p) => p.slug === sub?.plan_slug);
  const upgradePlan = plans.find((p) => p.slug !== sub?.plan_slug && p.preco_mensal > (currentPlan?.preco_mensal ?? 0));

  const trialDaysLeft = sub?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null;

  const statusBadge = () => {
    if (!sub) return null;
    const map: Record<string, { label: string; variant: any }> = {
      trialing: { label: "Trial", variant: "secondary" },
      active: { label: "Ativa", variant: "default" },
      past_due: { label: "Em atraso", variant: "destructive" },
      canceled: { label: "Cancelada", variant: "outline" },
    };
    const cfg = map[sub.status] ?? { label: sub.status, variant: "outline" };
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  const handleUpgrade = async (plan_slug: string) => {
    setActionLoading(true);
    try {
      // 1) cria cliente Asaas (idempotente)
      const c = await supabase.functions.invoke("asaas-create-customer", { body: {} });
      if (c.error) throw c.error;
      if ((c.data as any)?.error === "ASAAS_API_KEY_MISSING") {
        toast.error("Pagamento ainda não configurado", { description: "Configure ASAAS_API_KEY nos Secrets para ativar cobrança." });
        return;
      }
      // 2) cria assinatura
      const s = await supabase.functions.invoke("asaas-create-subscription", { body: { plan_slug, billing_type: "BOLETO" } });
      if (s.error) throw s.error;
      if ((s.data as any)?.error === "ASAAS_API_KEY_MISSING") {
        toast.error("Pagamento ainda não configurado");
        return;
      }
      toast.success("Plano atualizado!");
      await load();
    } catch (e: any) {
      toast.error("Erro no upgrade", { description: String(e?.message ?? e) });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      const r = await supabase.functions.invoke("asaas-cancel-subscription", { body: {} });
      if (r.error) throw r.error;
      toast.success("Assinatura cancelada");
      await load();
    } catch (e: any) {
      toast.error("Erro ao cancelar", { description: String(e?.message ?? e) });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container max-w-5xl py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Assinatura</h1>
          <p className="text-muted-foreground">Gerencie seu plano e cobranças</p>
        </div>

        {upgradeFeature && (
          <Card className="border-yellow-500/40 bg-yellow-500/5">
            <CardContent className="pt-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium">Faça upgrade para acessar</p>
                <p className="text-sm text-muted-foreground">
                  A feature <code className="px-1 py-0.5 rounded bg-muted text-xs">{upgradeFeature}</code> não está incluída no seu plano atual.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plano atual */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-3">
                  Seu plano: {currentPlan?.nome ?? "—"} {statusBadge()}
                </CardTitle>
                <CardDescription>
                  {currentPlan ? `R$ ${Number(currentPlan.preco_mensal).toFixed(2)} / mês` : ""}
                </CardDescription>
              </div>
              {sub?.status === "trialing" && trialDaysLeft !== null && (
                <Badge variant="outline">{trialDaysLeft} dias restantes de trial</Badge>
              )}
              {sub?.status === "active" && sub.current_period_end && (
                <Badge variant="outline">Próxima cobrança: {new Date(sub.current_period_end).toLocaleDateString("pt-BR")}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {currentPlan && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                  const has = !!currentPlan.features_jsonb?.[key];
                  return (
                    <div key={key} className={`flex items-center gap-2 text-sm ${has ? "" : "text-muted-foreground"}`}>
                      {has ? <Check className="w-4 h-4 text-green-600" /> : <Lock className="w-4 h-4" />}
                      <span className={has ? "" : "line-through"}>{label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {upgradePlan && (
                <Button onClick={() => handleUpgrade(upgradePlan.slug)} disabled={actionLoading}>
                  {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Fazer upgrade para {upgradePlan.nome} (R$ {Number(upgradePlan.preco_mensal).toFixed(2)}/mês)
                </Button>
              )}
              {sub && !sub.asaas_subscription_id && currentPlan && (
                <Button variant="outline" onClick={() => handleUpgrade(currentPlan.slug)} disabled={actionLoading}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Adicionar método de pagamento
                </Button>
              )}
              {sub && sub.status !== "canceled" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="text-destructive">Cancelar assinatura</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Você perderá acesso aos recursos premium ao fim do período já pago. Esta ação pode ser revertida iniciando uma nova assinatura.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Voltar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancel}>Confirmar cancelamento</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Comparativo de planos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((p) => (
            <Card key={p.id} className={p.slug === sub?.plan_slug ? "border-primary" : ""}>
              <CardHeader>
                <CardTitle>{p.nome}</CardTitle>
                <CardDescription>R$ {Number(p.preco_mensal).toFixed(2)} / mês</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm mb-4">
                  {Object.entries(FEATURE_LABELS).map(([k, label]) => (
                    <li key={k} className={`flex items-center gap-2 ${p.features_jsonb?.[k] ? "" : "text-muted-foreground line-through"}`}>
                      {p.features_jsonb?.[k] ? <Check className="w-4 h-4 text-green-600" /> : <Lock className="w-3 h-3" />}
                      {label}
                    </li>
                  ))}
                </ul>
                {p.slug !== sub?.plan_slug && (
                  <Button className="w-full" onClick={() => handleUpgrade(p.slug)} disabled={actionLoading}>
                    Escolher {p.nome}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
