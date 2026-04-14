import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";

export interface ExecResultadoHoje {
  faturamentoHoje: number;
  despesasHoje: number;
  resultadoHoje: number;
  saldoCaixa: number;
  recebimentosPrevistos: number;
  pagamentosPrevistos: number;
}

export interface ExecResultadoMes {
  faturamentoMes: number;
  custosMes: number;
  despesasMes: number;
  margemContribuicao: number;
  lucroMes: number;
  metaReceita: number;
  forecastReceita: number;
}

export interface ExecReceitaPrevista {
  pipelineBruto: number;
  pipelinePonderado: number;
  receitaPrevistaMes: number;
  receitaPrevistaTrimestre: number;
  taxaConversao: number;
}

export interface ExecRiscoOperacional {
  ordensAtrasadas: number;
  projetosDesvio: number;
  comprasUrgentes: number;
  rupturaEstoque: number;
}

export interface ExecEficiencia {
  tempoMedioFechamento: number;
  totalOrdens: number;
  ordensFinalizadas: number;
}

export interface ExecSaudeEmpresa {
  saldoAtual: number;
  burnRate: number;
  caixaProjetado30: number;
  caixaProjetado90: number;
  margemLiquidaProjetada: number;
}

export function useExecResultadoHoje() {
  return useQuery({
    queryKey: ["exec-resultado-hoje"],
    queryFn: async (): Promise<ExecResultadoHoje> => {
      const today = format(new Date(), "yyyy-MM-dd");

      type AnyRes = { data: any[] | null };
      const [cashRes, recRes, expRes, recvRes, payRes]: AnyRes[] = await Promise.all([
        supabase.from("fin_bank_accounts").select("opening_balance").eq("active", true) as any,
        supabase.from("fin_ledger_entries").select("amount").eq("entry_type", "credit").eq("competence_date", today) as any,
        supabase.from("fin_ledger_entries").select("amount").eq("entry_type", "debit").eq("competence_date", today) as any,
        supabase.from("fin_receivables").select("amount").eq("due_date", today).in("status", ["ABERTO"]) as any,
        supabase.from("fin_payables").select("amount").eq("due_date", today).in("status", ["ABERTO"]) as any,
      ]);

      const saldoCaixa = (cashRes.data as any[])?.reduce((s, r) => s + Number(r.opening_balance || 0), 0) || 0;
      const faturamentoHoje = (recRes.data as any[])?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;
      const despesasHoje = (expRes.data as any[])?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;
      const recebimentosPrevistos = (recvRes.data as any[])?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;
      const pagamentosPrevistos = (payRes.data as any[])?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;

      return {
        faturamentoHoje, despesasHoje, resultadoHoje: faturamentoHoje - despesasHoje,
        saldoCaixa, recebimentosPrevistos, pagamentosPrevistos,
      };
    },
    staleTime: 60000,
  });
}

export function useExecResultadoMes() {
  return useQuery({
    queryKey: ["exec-resultado-mes"],
    queryFn: async (): Promise<ExecResultadoMes> => {
      const now = new Date();
      const ms = format(startOfMonth(now), "yyyy-MM-dd");
      const me = format(endOfMonth(now), "yyyy-MM-dd");

      const ledger = () => supabase.from("fin_ledger_entries").select("amount") as any;
      const [revRes, costRes, goalRes, forecastRes] = await Promise.all([
        ledger().eq("entry_type", "credit").gte("competence_date", ms).lte("competence_date", me),
        ledger().eq("entry_type", "debit").gte("competence_date", ms).lte("competence_date", me),
        supabase.from("plan_goals").select("target_value, current_value").eq("goal_type", "faturamento").gte("period_end", ms).lte("period_start", me).limit(1),
        supabase.from("crm_revenue_forecast").select("gross_value, weighted_value").gte("reference_month", ms).lte("reference_month", me),
      ]);

      const fat = (revRes.data as any[])?.reduce((s: number, r: any) => s + Number(r.amount || 0), 0) || 0;
      const custos = (costRes.data as any[])?.reduce((s: number, r: any) => s + Number(r.amount || 0), 0) || 0;
      const metaReceita = (goalRes.data as any[])?.[0]?.target_value || 0;
      const forecastReceita = (forecastRes.data as any[])?.reduce((s: number, r: any) => s + Number(r.weighted_value || 0), 0) || 0;

      return {
        faturamentoMes: fat, custosMes: custos, despesasMes: custos,
        margemContribuicao: fat > 0 ? ((fat - custos) / fat) * 100 : 0,
        lucroMes: fat - custos, metaReceita, forecastReceita,
      };
    },
    staleTime: 60000,
  });
}

export function useExecReceitaPrevista() {
  return useQuery({
    queryKey: ["exec-receita-prevista"],
    queryFn: async (): Promise<ExecReceitaPrevista> => {
      const now = new Date();
      const ms = format(startOfMonth(now), "yyyy-MM-dd");
      const me = format(endOfMonth(now), "yyyy-MM-dd");
      const qe = format(endOfMonth(addMonths(now, 2)), "yyyy-MM-dd");

      const [dealsRes, leadsRes, forecastMRes, forecastQRes] = await Promise.all([
        supabase.from("crm_deals").select("value, status, crm_stages(probability_percent)").eq("status", "open").limit(500),
        supabase.from("leads").select("id, status").limit(500),
        supabase.from("crm_revenue_forecast").select("gross_value, weighted_value").gte("reference_month", ms).lte("reference_month", me),
        supabase.from("crm_revenue_forecast").select("gross_value, weighted_value").gte("reference_month", ms).lte("reference_month", qe),
      ]);

      const deals = (dealsRes.data as any[]) || [];
      const pipelineBruto = deals.reduce((s, d) => s + Number(d.value || 0), 0);
      const pipelinePonderado = deals.reduce((s, d) => {
        const prob = (d.crm_stages as any)?.probability_percent || 0;
        return s + Number(d.value || 0) * (prob / 100);
      }, 0);

      const leads = (leadsRes.data as any[]) || [];
      const totalLeads = leads.length;
      const wonLeads = leads.filter((l: any) => l.status === "convertido").length;
      const taxaConversao = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

      const receitaPrevistaMes = (forecastMRes.data as any[])?.reduce((s: number, r: any) => s + Number(r.weighted_value || 0), 0) || 0;
      const receitaPrevistaTrimestre = (forecastQRes.data as any[])?.reduce((s: number, r: any) => s + Number(r.weighted_value || 0), 0) || 0;

      return { pipelineBruto, pipelinePonderado, receitaPrevistaMes, receitaPrevistaTrimestre, taxaConversao };
    },
    staleTime: 120000,
  });
}

export function useExecRiscoOperacional() {
  return useQuery({
    queryKey: ["exec-risco-operacional"],
    queryFn: async (): Promise<ExecRiscoOperacional> => {
      const today = format(new Date(), "yyyy-MM-dd");

      const [ordensRes, projRes, purchRes, stockRes] = await Promise.all([
        supabase.from("ops_orders").select("id", { count: "exact", head: true }).in("status", ["em_producao", "planejada"]).lt("planned_end", today),
        supabase.from("prj_projects").select("id", { count: "exact", head: true }).in("status", ["em_andamento"]).lt("planned_end_date", today),
        supabase.from("purchase_orders").select("id, priority", { count: "exact" }).eq("priority", "urgente").in("status", ["aprovado", "pendente"]),
        supabase.from("products").select("id, quantity, min_stock").not("min_stock", "is", null),
      ]);

      const rupturaEstoque = (stockRes.data as any[])?.filter((p: any) => (p.quantity || 0) < (p.min_stock || 0)).length || 0;

      return {
        ordensAtrasadas: ordensRes.count || 0,
        projetosDesvio: projRes.count || 0,
        comprasUrgentes: purchRes.count || 0,
        rupturaEstoque,
      };
    },
    staleTime: 120000,
  });
}

export function useExecSaudeEmpresa() {
  return useQuery({
    queryKey: ["exec-saude-empresa"],
    queryFn: async (): Promise<ExecSaudeEmpresa> => {
      const now = new Date();
      const ms = format(startOfMonth(now), "yyyy-MM-dd");
      const me = format(endOfMonth(now), "yyyy-MM-dd");
      const pm = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
      const pme = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");

      const ledger = () => supabase.from("fin_ledger_entries").select("amount") as any;
      type AnyRes = { data: any[] | null };
      const [cashRes, revRes, expRes, prevExpRes]: AnyRes[] = await Promise.all([
        supabase.from("fin_bank_accounts").select("opening_balance").eq("active", true) as any,
        ledger().eq("entry_type", "credit").gte("competence_date", ms).lte("competence_date", me),
        ledger().eq("entry_type", "debit").gte("competence_date", ms).lte("competence_date", me),
        ledger().eq("entry_type", "debit").gte("competence_date", pm).lte("competence_date", pme),
      ]);

      const saldoAtual = (cashRes.data as any[])?.reduce((s, r) => s + Number(r.opening_balance || 0), 0) || 0;
      const revMes = (revRes.data as any[])?.reduce((s: number, r: any) => s + Number(r.amount || 0), 0) || 0;
      const expMes = (expRes.data as any[])?.reduce((s: number, r: any) => s + Number(r.amount || 0), 0) || 0;
      const prevExp = (prevExpRes.data as any[])?.reduce((s: number, r: any) => s + Number(r.amount || 0), 0) || 0;

      const burnRate = (expMes + prevExp) / 2;
      const caixaProjetado30 = saldoAtual + revMes - burnRate;
      const caixaProjetado90 = saldoAtual + revMes * 3 - burnRate * 3;
      const margemLiquidaProjetada = revMes > 0 ? ((revMes - expMes) / revMes) * 100 : 0;

      return { saldoAtual, burnRate, caixaProjetado30, caixaProjetado90, margemLiquidaProjetada };
    },
    staleTime: 120000,
  });
}
