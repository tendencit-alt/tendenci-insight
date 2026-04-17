import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MetricWidget, ListWidget } from "./BaseWidgets";

// ── Caixa hoje ──
export function CaixaHojeWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["dash:caixa-hoje"],
    queryFn: async () => {
      const { data } = await supabase.from("fin_bank_accounts").select("balance");
      const total = (data || []).reduce((sum, a: any) => sum + (Number(a.balance) || 0), 0);
      return total;
    },
    staleTime: 60_000,
  });
  return <MetricWidget value={data ?? 0} format="currency" loading={isLoading} label="Saldo consolidado" />;
}

// ── Contas vencendo ──
export function ContasVencendoWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["dash:contas-vencendo"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const in7 = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
      const { count } = await supabase
        .from("fin_payables")
        .select("id", { count: "exact", head: true })
        .gte("due_date", today)
        .lte("due_date", in7)
        .not("status", "in", '("pago","cancelado")');
      return count || 0;
    },
    staleTime: 60_000,
  });
  return <MetricWidget value={data ?? 0} format="number" loading={isLoading} label="Próximos 7 dias" />;
}

// ── Contas vencidas ──
export function ContasVencidasWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["dash:contas-vencidas"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, count } = await supabase
        .from("fin_payables")
        .select("amount", { count: "exact" })
        .lt("due_date", today)
        .not("status", "in", '("pago","cancelado")');
      const total = (data || []).reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
      return { count: count || 0, total };
    },
    staleTime: 60_000,
  });
  return (
    <MetricWidget
      value={data?.total ?? 0}
      format="currency"
      critical={(data?.count ?? 0) > 0}
      loading={isLoading}
      label={`${data?.count ?? 0} título(s) vencido(s)`}
    />
  );
}

// ── Inadimplência ──
export function InadimplenciaWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["dash:inadimplencia"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, count } = await supabase
        .from("fin_receivables")
        .select("amount", { count: "exact" })
        .lt("due_date", today)
        .not("status", "in", '("recebido","cancelado")');
      const total = (data || []).reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
      return { count: count || 0, total };
    },
    staleTime: 60_000,
  });
  return (
    <MetricWidget
      value={data?.total ?? 0}
      format="currency"
      critical={(data?.count ?? 0) > 0}
      loading={isLoading}
      label={`${data?.count ?? 0} recebível(is) atrasado(s)`}
    />
  );
}

// ── Conciliação pendente ──
export function ConciliacaoPendenteWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["dash:conciliacao-pendente"],
    queryFn: async () => {
      const { count } = await supabase
        .from("fin_bank_transactions")
        .select("id", { count: "exact", head: true })
        .is("matched_at", null);
      return count || 0;
    },
    staleTime: 60_000,
  });
  return <MetricWidget value={data ?? 0} format="number" loading={isLoading} label="Movimentações" />;
}

// ── Pedidos aguardando ──
export function PedidosAguardandoWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["dash:pedidos-aguardando"],
    queryFn: async () => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["rascunho", "negociacao"]);
      return count || 0;
    },
    staleTime: 60_000,
  });
  return <MetricWidget value={data ?? 0} format="number" loading={isLoading} label="Pedidos ativos" />;
}

// ── Propostas abertas ──
export function PropostasAbertasWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["dash:propostas-abertas"],
    queryFn: async () => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "negociacao");
      return count || 0;
    },
    staleTime: 60_000,
  });
  return <MetricWidget value={data ?? 0} format="number" loading={isLoading} label="Em negociação" />;
}

// ── OPs atrasadas ──
export function OrdensAtrasadasWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["dash:ordens-atrasadas"],
    queryFn: async () => {
      const { count } = await supabase
        .from("production_orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["pendente", "atrasado"]);
      return count || 0;
    },
    staleTime: 60_000,
  });
  return <MetricWidget value={data ?? 0} format="number" critical={(data ?? 0) > 0} loading={isLoading} />;
}

// ── Projetos ativos ──
export function ProjetosAtivosWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["dash:projetos-ativos"],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");
      return count || 0;
    },
    staleTime: 60_000,
  });
  return <MetricWidget value={data ?? 0} format="number" loading={isLoading} />;
}

// ── Pipeline ──
export function PipelineWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["dash:pipeline"],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_deals")
        .select("estimated_value, stage")
        .not("stage", "in", '("ganho","perdido")');
      const total = (data || []).reduce((s: number, d: any) => s + (Number(d.estimated_value) || 0), 0);
      return { total, count: data?.length || 0 };
    },
    staleTime: 60_000,
  });
  return (
    <MetricWidget
      value={data?.total ?? 0}
      format="currency"
      loading={isLoading}
      label={`${data?.count ?? 0} oportunidade(s) ativa(s)`}
    />
  );
}

// ── Generic placeholder for advanced widgets ──
export function PlaceholderWidget({ message }: { message: string }) {
  return <p className="text-xs text-muted-foreground py-2">{message}</p>;
}
