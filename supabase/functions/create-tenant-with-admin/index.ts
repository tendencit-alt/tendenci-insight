import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Universal Core Template defaults ──
const SYSTEM_DEFAULT_COST_CENTERS = [
  { name: "Comercial", code: "CC-COM" },
  { name: "Produção", code: "CC-PRD" },
  { name: "Administrativo", code: "CC-ADM" },
  { name: "Financeiro", code: "CC-FIN" },
  { name: "Marketing", code: "CC-MKT" },
  { name: "Estrutura", code: "CC-EST" },
  { name: "Projetos", code: "CC-PRJ" },
  { name: "Planejados", code: "CC-PLA" },
];

const SYSTEM_DEFAULT_AUTOMATIONS = [
  {
    name: "Pedido aprovado → Gerar Contas a Receber",
    event_module: "financeiro",
    event_type: "pedido.aprovado",
    actions: [{ type: "gerar_contas_receber" }, { type: "gerar_projeto_financeiro" }],
    is_system: true,
    active: true,
    priority: 1,
  },
  {
    name: "Pedido aprovado → Gerar Comissão Vendedor",
    event_module: "financeiro",
    event_type: "pedido.aprovado",
    actions: [{ type: "gerar_comissao_vendedor" }],
    is_system: true,
    active: true,
    priority: 2,
  },
  {
    name: "Pedido aprovado → Vincular Centro de Custo",
    event_module: "pedidos",
    event_type: "pedido.aprovado",
    actions: [{ type: "vincular_centro_custo" }],
    is_system: true,
    active: true,
    priority: 3,
  },
  {
    name: "Pedido aprovado → Vincular Projeto",
    event_module: "pedidos",
    event_type: "pedido.aprovado",
    actions: [{ type: "vincular_projeto" }],
    is_system: true,
    active: true,
    priority: 4,
  },
  {
    name: "Pagamento recebido → Atualizar Fluxo de Caixa",
    event_module: "financeiro",
    event_type: "financeiro.pago_recebido",
    actions: [{ type: "atualizar_fluxo_caixa" }],
    is_system: true,
    active: true,
    priority: 5,
  },
  {
    name: "Produção concluída → Liberar Faturamento",
    event_module: "pedidos",
    event_type: "producao.concluida",
    actions: [{ type: "liberar_faturamento" }],
    is_system: true,
    active: true,
    priority: 6,
  },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify requester is owner
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Não autorizado');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) throw new Error('Usuário não autenticado');

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_owner')
      .eq('id', user.id)
      .single();

    if (!profile?.is_owner) {
      throw new Error('Acesso negado. Apenas o OWNER pode criar empresas.');
    }

    const { name, slug, plan_id, max_users, active, admin_email, admin_name, admin_password } = await req.json();

    if (!name || !slug) throw new Error('Nome e slug são obrigatórios');
    if (!admin_email || !admin_password) throw new Error('Email e senha do administrador são obrigatórios');
    if (admin_password.length < 6) throw new Error('Senha deve ter no mínimo 6 caracteres');

    // 1. Create tenant
    const { data: newTenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({ name, slug, plan_id: plan_id || null, max_users: max_users || 5, active: active !== false })
      .select()
      .single();

    if (tenantError) throw new Error(`Erro ao criar empresa: ${tenantError.message}`);

    // 2. Create company_settings
    await supabaseAdmin.from('company_settings').insert({
      company_name: name,
      trade_name: name,
      tenant_id: newTenant.id,
    });

    // 3. Create admin user
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: admin_email,
      password: admin_password,
      email_confirm: true,
      user_metadata: { full_name: admin_name || admin_email.split('@')[0] }
    });

    if (createUserError) {
      // Rollback: delete tenant if user creation fails
      await supabaseAdmin.from('company_settings').delete().eq('tenant_id', newTenant.id);
      await supabaseAdmin.from('tenants').delete().eq('id', newTenant.id);
      throw new Error(`Erro ao criar usuário admin: ${createUserError.message}`);
    }

    // 4. Update profile with tenant_id, role=admin
    if (newUser.user) {
      const finalName = admin_name || admin_email.split('@')[0];
      const username = admin_email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          tenant_id: newTenant.id,
          role: 'admin',
          full_name: finalName,
          username,
          email: admin_email,
        })
        .eq('id', newUser.user.id);

      if (updateError) {
        console.error('Erro ao atualizar perfil do admin:', updateError);
      }

      // 5. Create default menu_items for the new tenant
      const defaultMenuItems = [
        { label: 'BI / Dashboard', icon: 'LayoutDashboard', route: '/bi-dashboard', module: 'dashboard', position: 1, category: 'direct' },
        { label: 'Pedidos', icon: 'ShoppingCart', route: '/pedidos', module: 'pedidos', position: 2, category: 'direct' },
        { label: 'Fase Produtiva', icon: 'TrendingUp', route: '/producao', module: 'producao', position: 3, category: 'direct' },
        { label: 'Financeiro', icon: 'Wallet', route: '/financeiro', module: 'financeiro', position: 4, category: 'financeiro' },
        { label: 'Fornecedores', icon: 'Truck', route: '/fornecedores', module: 'fornecedores', position: 5, category: 'cadastros' },
        { label: 'Produtos / Matéria Prima', icon: 'Package', route: '/estoque', module: 'estoque', position: 6, category: 'cadastros' },
        { label: 'Cadastros Financeiros', icon: 'FileText', route: '/cadastros-financeiros', module: 'cadastros_financeiros', position: 7, category: 'cadastros' },
        { label: 'Usuários', icon: 'Users', route: '/settings', module: 'gestao_usuarios', position: 8, category: 'master' },
      ];

      await supabaseAdmin.from('menu_items').insert(
        defaultMenuItems.map(item => ({ ...item, visible: true, tenant_id: newTenant.id }))
      );

      // 6. Seed Universal Core Template — Cost Centers
      await supabaseAdmin.from('fin_cost_centers').insert(
        SYSTEM_DEFAULT_COST_CENTERS.map(cc => ({
          ...cc,
          active: true,
          is_system_default: true,
          tenant_id: newTenant.id,
        }))
      );

      // 7. Seed Universal Core Template — Automation Rules
      await supabaseAdmin.from('automation_rules').insert(
        SYSTEM_DEFAULT_AUTOMATIONS.map(rule => ({
          ...rule,
          tenant_id: newTenant.id,
        }))
      );

      // 8. Seed default tenant_customizations with universal KPIs
      await supabaseAdmin.from('tenant_customizations').insert({
        tenant_id: newTenant.id,
        module_aliases: {},
        dre_aliases: {},
        sidebar_config: { order: [], hidden: [] },
        launcher_shortcuts: [],
        kpi_priorities: [
          'margem_contribuicao', 'ebitda', 'resultado_economico',
          'fluxo_caixa_futuro', 'meta_vs_realizado',
        ],
        workflow_config: {},
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        tenant: newTenant,
        admin_user_id: newUser.user?.id,
        message: 'Empresa e administrador criados com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao criar empresa' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
