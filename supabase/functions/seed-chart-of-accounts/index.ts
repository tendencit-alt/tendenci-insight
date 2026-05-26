// Seeds chart of accounts based on segment template
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Account = { code: string; name: string; nature?: string; in_dre?: boolean; in_cashflow?: boolean; children?: Account[] };

const COMMON_ROOTS: Account[] = [
  { code: "1", name: "Receitas", nature: "RECEITA", in_dre: true, in_cashflow: true },
  { code: "2", name: "Despesas sobre Vendas", nature: "DESPESA", in_dre: true, in_cashflow: true },
  { code: "2.3", name: "Compromissos sobre vendas", nature: "DESPESA", in_dre: true, in_cashflow: true },
  { code: "2.3.1", name: "Comissão vendedor", nature: "DESPESA", in_dre: true, in_cashflow: true },
  { code: "2.3.2", name: "Premiação de terceiros", nature: "DESPESA", in_dre: true, in_cashflow: true },
  { code: "2.3.3", name: "Comissão de parceiros", nature: "DESPESA", in_dre: true, in_cashflow: true },
  { code: "2.3.4", name: "Bônus comercial", nature: "DESPESA", in_dre: true, in_cashflow: true },
  { code: "2.3.5", name: "Comissão de representantes", nature: "DESPESA", in_dre: true, in_cashflow: true },
  { code: "2.3.6", name: "Afiliados e indicações", nature: "DESPESA", in_dre: true, in_cashflow: true },
  { code: "3", name: "Custos Variáveis", nature: "DESPESA", in_dre: true, in_cashflow: true },
  { code: "4", name: "Despesas Operacionais", nature: "DESPESA", in_dre: true, in_cashflow: true },
  { code: "5", name: "Despesas Financeiras", nature: "DESPESA", in_dre: true, in_cashflow: true },
  { code: "6", name: "Investimentos / Financiamentos", nature: "FINANCIAMENTO", in_dre: false, in_cashflow: true },
];

const TEMPLATES: Record<string, Account[]> = {
  servicos: [
    { code: "1.2", name: "Prestação de Serviços", nature: "RECEITA" },
    { code: "4.1", name: "Pessoal e Encargos", nature: "DESPESA" },
    { code: "4.2", name: "Estrutura e Administrativo", nature: "DESPESA" },
  ],
  comercio: [
    { code: "1.1", name: "Venda de Produtos", nature: "RECEITA" },
    { code: "3.1", name: "Custo da Mercadoria Vendida (CMV)", nature: "DESPESA" },
    { code: "2.1", name: "Impostos sobre Vendas", nature: "DESPESA" },
  ],
  industria: [
    { code: "1.1", name: "Venda de Produtos", nature: "RECEITA" },
    { code: "3.2", name: "Matéria-Prima", nature: "DESPESA" },
    { code: "3.3", name: "Mão de Obra Direta", nature: "DESPESA" },
  ],
  arquitetura: [
    { code: "1.2", name: "Projetos de Arquitetura", nature: "RECEITA" },
    { code: "1.3", name: "Consultoria", nature: "RECEITA" },
    { code: "4.1", name: "Equipe Técnica", nature: "DESPESA" },
  ],
  moveis_planejados: [
    { code: "1.1", name: "Venda de Móveis Planejados", nature: "RECEITA" },
    { code: "3.2", name: "Matéria-Prima (MDF, ferragens)", nature: "DESPESA" },
    { code: "3.4", name: "Montagem e Instalação", nature: "DESPESA" },
    { code: "2.4", name: "Comissões sobre venda", nature: "DESPESA" },
  ],
  personalizado: [],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const { template = "personalizado", overwrite = false } = await req.json();

    const { data: tenantId, error: tErr } = await supabase.rpc("get_user_tenant_id");
    if (tErr || !tenantId) throw new Error("Tenant não encontrado");

    if (overwrite) {
      await supabase.from("fin_chart_accounts").delete().eq("tenant_id", tenantId).eq("is_core", false);
    }

    const { data: existing } = await supabase.from("fin_chart_accounts").select("code").eq("tenant_id", tenantId);
    const existingCodes = new Set((existing || []).map((r: any) => r.code));

    const all = [...COMMON_ROOTS, ...(TEMPLATES[template] || [])];
    const toInsert = all.filter(a => !existingCodes.has(a.code)).map(a => ({
      tenant_id: tenantId,
      code: a.code,
      name: a.name,
      nature: a.nature ?? null,
      in_dre: a.in_dre ?? true,
      in_cashflow: a.in_cashflow ?? true,
      active: true,
      is_core: false,
    }));

    let inserted = 0;
    if (toInsert.length) {
      const { error, count } = await supabase.from("fin_chart_accounts").insert(toInsert, { count: "exact" });
      if (error) throw error;
      inserted = count ?? toInsert.length;
    }

    return new Response(JSON.stringify({ ok: true, inserted, template, total: all.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
