import { supabase } from "@/integrations/supabase/client";
import type { SearchResult, SearchEntityType } from "./types";

const STATIC_REPORTS: SearchResult[] = [
  { id: "rpt-dre", type: "report", title: "DRE Gerencial", subtitle: "Demonstrativo de Resultados", route: "/bi-dashboard?view=dre" },
  { id: "rpt-fluxo", type: "report", title: "Fluxo de Caixa", subtitle: "Realizado vs Previsto", route: "/bi-dashboard?view=cashflow" },
  { id: "rpt-pipeline", type: "report", title: "Pipeline Comercial", subtitle: "Funil de vendas", route: "/bi-dashboard?view=pipeline" },
  { id: "rpt-margem", type: "report", title: "Margem por Projeto", subtitle: "Custos e rentabilidade", route: "/relatorios?tab=margin" },
  { id: "rpt-aging", type: "report", title: "Aging de Receber", subtitle: "Inadimplência por faixa", route: "/relatorios?tab=aging" },
];

const STATIC_DASHBOARDS: SearchResult[] = [
  { id: "dash-owner", type: "dashboard", title: "Dashboard Owner", subtitle: "Visão executiva", route: "/bi-dashboard?profile=owner" },
  { id: "dash-fin", type: "dashboard", title: "Dashboard Financeiro", subtitle: "Caixa e contas", route: "/bi-dashboard?profile=financeiro" },
  { id: "dash-comercial", type: "dashboard", title: "Dashboard Comercial", subtitle: "Vendas e pipeline", route: "/bi-dashboard?profile=comercial" },
  { id: "dash-operacional", type: "dashboard", title: "Dashboard Operacional", subtitle: "Projetos e produção", route: "/bi-dashboard?profile=operacional" },
];

const STATIC_INTEGRATIONS: SearchResult[] = [
  { id: "int-bank", type: "integration", title: "Integrações Bancárias", subtitle: "OFX e Open Banking", route: "/settings?tab=integrations" },
  { id: "int-nfe", type: "integration", title: "Emissão NF-e", subtitle: "Notas fiscais eletrônicas", route: "/settings?tab=fiscal" },
  { id: "int-api", type: "integration", title: "API Pública", subtitle: "Tokens e webhooks", route: "/settings?tab=api" },
];

function score(text: string, query: string): number {
  if (!query) return 0;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 50;
  const words = q.split(/\s+/).filter(Boolean);
  let s = 0;
  for (const w of words) if (t.includes(w)) s += 15;
  return s;
}

export async function searchClients(query: string, limit = 5): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const { data } = await supabase
    .from("clients")
    .select("id, name, email, phone, city")
    .or(`name.ilike.%${query}%,email.ilike.%${query}%,cpf_cnpj.ilike.%${query}%`)
    .limit(limit);
  return (data || []).map((c: any) => ({
    id: c.id,
    type: "client" as SearchEntityType,
    title: c.name,
    subtitle: c.email || c.phone || c.city || "Cliente",
    route: `/pedidos?client=${c.id}`,
    score: score(c.name || "", query),
  }));
}

export async function searchOrders(query: string, limit = 5): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const numeric = query.match(/\d+/)?.[0];
  let q = supabase.from("orders").select("id, order_number, status, total_amount, client_name").limit(limit);
  if (numeric) {
    q = q.ilike("order_number", `%${numeric}%`);
  } else {
    q = q.ilike("client_name", `%${query}%`);
  }
  const { data } = await q;
  return (data || []).map((o: any) => ({
    id: o.id,
    type: "order" as SearchEntityType,
    title: `Pedido #${o.order_number || o.id.slice(0, 8)}`,
    subtitle: o.client_name || "Sem cliente",
    badge: o.status,
    description: o.total_amount ? `R$ ${Number(o.total_amount).toLocaleString("pt-BR")}` : undefined,
    route: `/pedidos?id=${o.id}`,
    score: score(o.client_name || o.order_number || "", query),
  }));
}

export async function searchProjects(query: string, limit = 5): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const { data } = await supabase
    .from("project_budgets" as any)
    .select("id, project_name, status, total_amount")
    .ilike("project_name", `%${query}%`)
    .limit(limit);
  return (data || []).map((p: any) => ({
    id: p.id,
    type: "project" as SearchEntityType,
    title: p.project_name,
    subtitle: "Projeto",
    badge: p.status,
    route: `/producao-operacoes?project=${p.id}`,
    score: score(p.project_name || "", query),
  }));
}

export async function searchPayables(query: string, limit = 5): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const { data } = await supabase
    .from("financial_entries" as any)
    .select("id, description, amount, due_date, status, type")
    .eq("type", "payable")
    .ilike("description", `%${query}%`)
    .limit(limit);
  return (data || []).map((e: any) => ({
    id: e.id,
    type: "payable" as SearchEntityType,
    title: e.description || "Conta a pagar",
    subtitle: e.due_date ? `Vence em ${new Date(e.due_date).toLocaleDateString("pt-BR")}` : "Sem vencimento",
    description: e.amount ? `R$ ${Number(e.amount).toLocaleString("pt-BR")}` : undefined,
    badge: e.status,
    route: `/financeiro?entry=${e.id}`,
    score: score(e.description || "", query),
  }));
}

export async function searchReceivables(query: string, limit = 5): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const { data } = await supabase
    .from("financial_entries" as any)
    .select("id, description, amount, due_date, status, type")
    .eq("type", "receivable")
    .ilike("description", `%${query}%`)
    .limit(limit);
  return (data || []).map((e: any) => ({
    id: e.id,
    type: "receivable" as SearchEntityType,
    title: e.description || "Conta a receber",
    subtitle: e.due_date ? `Vence em ${new Date(e.due_date).toLocaleDateString("pt-BR")}` : "Sem vencimento",
    description: e.amount ? `R$ ${Number(e.amount).toLocaleString("pt-BR")}` : undefined,
    badge: e.status,
    route: `/financeiro?entry=${e.id}`,
    score: score(e.description || "", query),
  }));
}

export async function searchSuppliers(query: string, limit = 5): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const { data } = await supabase
    .from("suppliers" as any)
    .select("id, name, email, phone")
    .ilike("name", `%${query}%`)
    .limit(limit);
  return (data || []).map((s: any) => ({
    id: s.id,
    type: "supplier" as SearchEntityType,
    title: s.name,
    subtitle: s.email || s.phone || "Fornecedor",
    route: `/fornecedores?id=${s.id}`,
    score: score(s.name || "", query),
  }));
}

export function searchStatic(query: string): SearchResult[] {
  if (!query.trim()) return [];
  const all = [...STATIC_REPORTS, ...STATIC_DASHBOARDS, ...STATIC_INTEGRATIONS];
  return all
    .map((r) => ({ ...r, score: score(`${r.title} ${r.subtitle || ""}`, query) }))
    .filter((r) => (r.score || 0) > 0);
}
