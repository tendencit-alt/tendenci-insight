
-- 1. Add new permission levels to profile_type_permissions
ALTER TABLE public.profile_type_permissions 
  ADD COLUMN IF NOT EXISTS can_approve boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_conciliate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_export boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

CREATE INDEX IF NOT EXISTS idx_profile_type_permissions_tenant ON public.profile_type_permissions(tenant_id);

-- 2. Create critical permissions table
CREATE TABLE IF NOT EXISTS public.rbac_critical_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_type_id uuid NOT NULL REFERENCES public.profile_types(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  permission_label text NOT NULL,
  permission_group text NOT NULL DEFAULT 'geral',
  allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  tenant_id uuid REFERENCES public.tenants(id),
  UNIQUE(profile_type_id, permission_key, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_rbac_critical_profile ON public.rbac_critical_permissions(profile_type_id);
CREATE INDEX IF NOT EXISTS idx_rbac_critical_tenant ON public.rbac_critical_permissions(tenant_id);

ALTER TABLE public.rbac_critical_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view rbac_critical_permissions" ON public.rbac_critical_permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert rbac_critical_permissions" ON public.rbac_critical_permissions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update rbac_critical_permissions" ON public.rbac_critical_permissions
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete rbac_critical_permissions" ON public.rbac_critical_permissions
  FOR DELETE TO authenticated USING (true);

-- 3. Create segregation rules table
CREATE TABLE IF NOT EXISTS public.rbac_segregation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_type_id uuid NOT NULL REFERENCES public.profile_types(id) ON DELETE CASCADE,
  blocked_action text NOT NULL,
  blocked_module text NOT NULL,
  reason text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  tenant_id uuid REFERENCES public.tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_rbac_segregation_profile ON public.rbac_segregation_rules(profile_type_id);

ALTER TABLE public.rbac_segregation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view rbac_segregation_rules" ON public.rbac_segregation_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert rbac_segregation_rules" ON public.rbac_segregation_rules
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update rbac_segregation_rules" ON public.rbac_segregation_rules
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete rbac_segregation_rules" ON public.rbac_segregation_rules
  FOR DELETE TO authenticated USING (true);

-- 4. Seed the 8 standard profiles into profile_types
INSERT INTO public.profile_types (name, display_name, description, color, icon, is_system, is_active) VALUES
  ('owner', 'Owner', 'Dono do sistema com acesso global irrestrito', '#dc2626', 'Crown', true, true),
  ('administrador', 'Administrador', 'Administrador da empresa com controle total do tenant', '#7c3aed', 'Shield', true, true),
  ('gestor', 'Gestor', 'Gestor com visão executiva e poder de aprovação', '#2563eb', 'Eye', true, true),
  ('financeiro', 'Financeiro', 'Operador financeiro com acesso a tesouraria e conciliação', '#059669', 'Wallet', true, true),
  ('comercial', 'Comercial', 'Vendedor com acesso a clientes, pedidos e comissões', '#d97706', 'ShoppingCart', true, true),
  ('operacional', 'Operacional', 'Operador de produção e logística', '#ea580c', 'Wrench', true, true),
  ('controladoria', 'Controladoria / Contábil', 'Contador com acesso de validação e exportação', '#4f46e5', 'Calculator', true, true),
  ('auditoria', 'Auditoria / Leitura', 'Auditor com visão total somente leitura', '#64748b', 'Search', true, true)
ON CONFLICT DO NOTHING;

-- 5. Seed module permissions matrix for all profiles
-- Modules: dashboard_executivo, comercial, operacional, financeiro, controladoria, planejamento, cadastros, relatorios_bi, configuracoes
DO $$
DECLARE
  v_owner uuid;
  v_admin uuid;
  v_gestor uuid;
  v_financeiro uuid;
  v_comercial uuid;
  v_operacional uuid;
  v_controladoria uuid;
  v_auditoria uuid;
BEGIN
  SELECT id INTO v_owner FROM profile_types WHERE name = 'owner';
  SELECT id INTO v_admin FROM profile_types WHERE name = 'administrador';
  SELECT id INTO v_gestor FROM profile_types WHERE name = 'gestor';
  SELECT id INTO v_financeiro FROM profile_types WHERE name = 'financeiro';
  SELECT id INTO v_comercial FROM profile_types WHERE name = 'comercial';
  SELECT id INTO v_operacional FROM profile_types WHERE name = 'operacional';
  SELECT id INTO v_controladoria FROM profile_types WHERE name = 'controladoria';
  SELECT id INTO v_auditoria FROM profile_types WHERE name = 'auditoria';

  -- Delete existing to re-seed cleanly
  DELETE FROM profile_type_permissions WHERE profile_type_id IN (v_owner, v_admin, v_gestor, v_financeiro, v_comercial, v_operacional, v_controladoria, v_auditoria);

  -- OWNER: view all, approve all, export all, admin all
  INSERT INTO profile_type_permissions (profile_type_id, module, can_view, can_create, can_edit, can_delete, can_approve, can_conciliate, can_export, can_admin) VALUES
    (v_owner, 'dashboard_executivo', true, false, false, false, true, false, true, true),
    (v_owner, 'comercial', true, true, true, true, true, false, true, true),
    (v_owner, 'operacional', true, true, true, true, true, false, true, true),
    (v_owner, 'financeiro', true, true, true, true, true, true, true, true),
    (v_owner, 'controladoria', true, true, true, true, true, true, true, true),
    (v_owner, 'planejamento', true, true, true, true, true, false, true, true),
    (v_owner, 'cadastros', true, true, true, true, true, false, true, true),
    (v_owner, 'relatorios_bi', true, false, false, false, false, false, true, true),
    (v_owner, 'configuracoes', true, true, true, true, true, false, true, true);

  -- ADMINISTRADOR: full access within tenant
  INSERT INTO profile_type_permissions (profile_type_id, module, can_view, can_create, can_edit, can_delete, can_approve, can_conciliate, can_export, can_admin) VALUES
    (v_admin, 'dashboard_executivo', true, false, false, false, true, false, true, true),
    (v_admin, 'comercial', true, true, true, true, true, false, true, true),
    (v_admin, 'operacional', true, true, true, true, true, false, true, true),
    (v_admin, 'financeiro', true, true, true, true, true, true, true, true),
    (v_admin, 'controladoria', true, true, true, true, true, true, true, true),
    (v_admin, 'planejamento', true, true, true, true, true, false, true, true),
    (v_admin, 'cadastros', true, true, true, true, true, false, true, true),
    (v_admin, 'relatorios_bi', true, false, false, false, false, false, true, true),
    (v_admin, 'configuracoes', true, true, true, true, true, false, true, true);

  -- GESTOR: view/approve, no structure edit
  INSERT INTO profile_type_permissions (profile_type_id, module, can_view, can_create, can_edit, can_delete, can_approve, can_conciliate, can_export, can_admin) VALUES
    (v_gestor, 'dashboard_executivo', true, false, false, false, true, false, true, false),
    (v_gestor, 'comercial', true, false, false, false, true, false, true, false),
    (v_gestor, 'operacional', true, false, false, false, true, false, true, false),
    (v_gestor, 'financeiro', true, false, false, false, true, false, true, false),
    (v_gestor, 'controladoria', true, false, false, false, false, false, true, false),
    (v_gestor, 'planejamento', true, true, true, false, true, false, true, false),
    (v_gestor, 'cadastros', true, false, false, false, false, false, true, false),
    (v_gestor, 'relatorios_bi', true, false, false, false, false, false, true, false),
    (v_gestor, 'configuracoes', false, false, false, false, false, false, false, false);

  -- FINANCEIRO: operate finance, no structure
  INSERT INTO profile_type_permissions (profile_type_id, module, can_view, can_create, can_edit, can_delete, can_approve, can_conciliate, can_export, can_admin) VALUES
    (v_financeiro, 'dashboard_executivo', false, false, false, false, false, false, false, false),
    (v_financeiro, 'comercial', true, false, false, false, false, false, false, false),
    (v_financeiro, 'operacional', false, false, false, false, false, false, false, false),
    (v_financeiro, 'financeiro', true, true, true, false, false, true, true, false),
    (v_financeiro, 'controladoria', true, false, false, false, false, false, true, false),
    (v_financeiro, 'planejamento', true, false, false, false, false, false, false, false),
    (v_financeiro, 'cadastros', true, true, true, false, false, false, false, false),
    (v_financeiro, 'relatorios_bi', true, false, false, false, false, false, true, false),
    (v_financeiro, 'configuracoes', false, false, false, false, false, false, false, false);

  -- COMERCIAL: operate sales
  INSERT INTO profile_type_permissions (profile_type_id, module, can_view, can_create, can_edit, can_delete, can_approve, can_conciliate, can_export, can_admin) VALUES
    (v_comercial, 'dashboard_executivo', false, false, false, false, false, false, false, false),
    (v_comercial, 'comercial', true, true, true, false, false, false, true, false),
    (v_comercial, 'operacional', true, false, false, false, false, false, false, false),
    (v_comercial, 'financeiro', false, false, false, false, false, false, false, false),
    (v_comercial, 'controladoria', false, false, false, false, false, false, false, false),
    (v_comercial, 'planejamento', true, false, false, false, false, false, false, false),
    (v_comercial, 'cadastros', true, true, false, false, false, false, false, false),
    (v_comercial, 'relatorios_bi', false, false, false, false, false, false, false, false),
    (v_comercial, 'configuracoes', false, false, false, false, false, false, false, false);

  -- OPERACIONAL: operate production
  INSERT INTO profile_type_permissions (profile_type_id, module, can_view, can_create, can_edit, can_delete, can_approve, can_conciliate, can_export, can_admin) VALUES
    (v_operacional, 'dashboard_executivo', false, false, false, false, false, false, false, false),
    (v_operacional, 'comercial', true, false, false, false, false, false, false, false),
    (v_operacional, 'operacional', true, true, true, false, false, false, true, false),
    (v_operacional, 'financeiro', false, false, false, false, false, false, false, false),
    (v_operacional, 'controladoria', false, false, false, false, false, false, false, false),
    (v_operacional, 'planejamento', false, false, false, false, false, false, false, false),
    (v_operacional, 'cadastros', true, false, false, false, false, false, false, false),
    (v_operacional, 'relatorios_bi', false, false, false, false, false, false, false, false),
    (v_operacional, 'configuracoes', false, false, false, false, false, false, false, false);

  -- CONTROLADORIA: view/validate/export
  INSERT INTO profile_type_permissions (profile_type_id, module, can_view, can_create, can_edit, can_delete, can_approve, can_conciliate, can_export, can_admin) VALUES
    (v_controladoria, 'dashboard_executivo', true, false, false, false, false, false, true, false),
    (v_controladoria, 'comercial', true, false, false, false, false, false, true, false),
    (v_controladoria, 'operacional', true, false, false, false, false, false, true, false),
    (v_controladoria, 'financeiro', true, false, false, false, false, false, true, false),
    (v_controladoria, 'controladoria', true, true, true, false, true, true, true, false),
    (v_controladoria, 'planejamento', true, false, false, false, false, false, true, false),
    (v_controladoria, 'cadastros', true, false, false, false, false, false, true, false),
    (v_controladoria, 'relatorios_bi', true, false, false, false, false, false, true, false),
    (v_controladoria, 'configuracoes', false, false, false, false, false, false, false, false);

  -- AUDITORIA: view-only everything
  INSERT INTO profile_type_permissions (profile_type_id, module, can_view, can_create, can_edit, can_delete, can_approve, can_conciliate, can_export, can_admin) VALUES
    (v_auditoria, 'dashboard_executivo', true, false, false, false, false, false, true, false),
    (v_auditoria, 'comercial', true, false, false, false, false, false, true, false),
    (v_auditoria, 'operacional', true, false, false, false, false, false, true, false),
    (v_auditoria, 'financeiro', true, false, false, false, false, false, true, false),
    (v_auditoria, 'controladoria', true, false, false, false, false, false, true, false),
    (v_auditoria, 'planejamento', true, false, false, false, false, false, true, false),
    (v_auditoria, 'cadastros', true, false, false, false, false, false, true, false),
    (v_auditoria, 'relatorios_bi', true, false, false, false, false, false, true, false),
    (v_auditoria, 'configuracoes', true, false, false, false, false, false, false, false);

  -- 6. Seed critical permissions for all profiles
  DELETE FROM rbac_critical_permissions WHERE profile_type_id IN (v_owner, v_admin, v_gestor, v_financeiro, v_comercial, v_operacional, v_controladoria, v_auditoria);

  -- Define critical permission keys
  -- editar_plano_contas, excluir_lancamento_conciliado, editar_lancamento_conciliado,
  -- alterar_regra_automatica, alterar_centro_custo_padrao, alterar_meta_global,
  -- cancelar_pedido_faturado, reabrir_pedido_encerrado, editar_principal_emprestimo, excluir_log

  INSERT INTO rbac_critical_permissions (profile_type_id, permission_key, permission_label, permission_group, allowed) VALUES
    -- OWNER
    (v_owner, 'editar_plano_contas', 'Editar Plano de Contas', 'Estrutura', true),
    (v_owner, 'excluir_lancamento_conciliado', 'Excluir Lançamento Conciliado', 'Financeiro', true),
    (v_owner, 'editar_lancamento_conciliado', 'Editar Lançamento Conciliado', 'Financeiro', true),
    (v_owner, 'alterar_regra_automatica', 'Alterar Regra Automática', 'Automação', true),
    (v_owner, 'alterar_centro_custo_padrao', 'Alterar Centro de Custo Padrão', 'Estrutura', true),
    (v_owner, 'alterar_meta_global', 'Alterar Meta Global', 'Planejamento', true),
    (v_owner, 'cancelar_pedido_faturado', 'Cancelar Pedido Já Faturado', 'Comercial', true),
    (v_owner, 'reabrir_pedido_encerrado', 'Reabrir Pedido Encerrado', 'Comercial', true),
    (v_owner, 'editar_principal_emprestimo', 'Editar Principal de Empréstimo', 'Financeiro', true),
    (v_owner, 'excluir_log', 'Excluir Log de Auditoria', 'Auditoria', true),
    -- ADMINISTRADOR
    (v_admin, 'editar_plano_contas', 'Editar Plano de Contas', 'Estrutura', true),
    (v_admin, 'excluir_lancamento_conciliado', 'Excluir Lançamento Conciliado', 'Financeiro', false),
    (v_admin, 'editar_lancamento_conciliado', 'Editar Lançamento Conciliado', 'Financeiro', true),
    (v_admin, 'alterar_regra_automatica', 'Alterar Regra Automática', 'Automação', true),
    (v_admin, 'alterar_centro_custo_padrao', 'Alterar Centro de Custo Padrão', 'Estrutura', true),
    (v_admin, 'alterar_meta_global', 'Alterar Meta Global', 'Planejamento', true),
    (v_admin, 'cancelar_pedido_faturado', 'Cancelar Pedido Já Faturado', 'Comercial', true),
    (v_admin, 'reabrir_pedido_encerrado', 'Reabrir Pedido Encerrado', 'Comercial', true),
    (v_admin, 'editar_principal_emprestimo', 'Editar Principal de Empréstimo', 'Financeiro', true),
    (v_admin, 'excluir_log', 'Excluir Log de Auditoria', 'Auditoria', false),
    -- GESTOR
    (v_gestor, 'editar_plano_contas', 'Editar Plano de Contas', 'Estrutura', false),
    (v_gestor, 'excluir_lancamento_conciliado', 'Excluir Lançamento Conciliado', 'Financeiro', false),
    (v_gestor, 'editar_lancamento_conciliado', 'Editar Lançamento Conciliado', 'Financeiro', false),
    (v_gestor, 'alterar_regra_automatica', 'Alterar Regra Automática', 'Automação', false),
    (v_gestor, 'alterar_centro_custo_padrao', 'Alterar Centro de Custo Padrão', 'Estrutura', false),
    (v_gestor, 'alterar_meta_global', 'Alterar Meta Global', 'Planejamento', true),
    (v_gestor, 'cancelar_pedido_faturado', 'Cancelar Pedido Já Faturado', 'Comercial', true),
    (v_gestor, 'reabrir_pedido_encerrado', 'Reabrir Pedido Encerrado', 'Comercial', false),
    (v_gestor, 'editar_principal_emprestimo', 'Editar Principal de Empréstimo', 'Financeiro', false),
    (v_gestor, 'excluir_log', 'Excluir Log de Auditoria', 'Auditoria', false),
    -- FINANCEIRO
    (v_financeiro, 'editar_plano_contas', 'Editar Plano de Contas', 'Estrutura', false),
    (v_financeiro, 'excluir_lancamento_conciliado', 'Excluir Lançamento Conciliado', 'Financeiro', false),
    (v_financeiro, 'editar_lancamento_conciliado', 'Editar Lançamento Conciliado', 'Financeiro', false),
    (v_financeiro, 'alterar_regra_automatica', 'Alterar Regra Automática', 'Automação', false),
    (v_financeiro, 'alterar_centro_custo_padrao', 'Alterar Centro de Custo Padrão', 'Estrutura', false),
    (v_financeiro, 'alterar_meta_global', 'Alterar Meta Global', 'Planejamento', false),
    (v_financeiro, 'cancelar_pedido_faturado', 'Cancelar Pedido Já Faturado', 'Comercial', false),
    (v_financeiro, 'reabrir_pedido_encerrado', 'Reabrir Pedido Encerrado', 'Comercial', false),
    (v_financeiro, 'editar_principal_emprestimo', 'Editar Principal de Empréstimo', 'Financeiro', false),
    (v_financeiro, 'excluir_log', 'Excluir Log de Auditoria', 'Auditoria', false),
    -- COMERCIAL
    (v_comercial, 'editar_plano_contas', 'Editar Plano de Contas', 'Estrutura', false),
    (v_comercial, 'excluir_lancamento_conciliado', 'Excluir Lançamento Conciliado', 'Financeiro', false),
    (v_comercial, 'editar_lancamento_conciliado', 'Editar Lançamento Conciliado', 'Financeiro', false),
    (v_comercial, 'alterar_regra_automatica', 'Alterar Regra Automática', 'Automação', false),
    (v_comercial, 'alterar_centro_custo_padrao', 'Alterar Centro de Custo Padrão', 'Estrutura', false),
    (v_comercial, 'alterar_meta_global', 'Alterar Meta Global', 'Planejamento', false),
    (v_comercial, 'cancelar_pedido_faturado', 'Cancelar Pedido Já Faturado', 'Comercial', false),
    (v_comercial, 'reabrir_pedido_encerrado', 'Reabrir Pedido Encerrado', 'Comercial', false),
    (v_comercial, 'editar_principal_emprestimo', 'Editar Principal de Empréstimo', 'Financeiro', false),
    (v_comercial, 'excluir_log', 'Excluir Log de Auditoria', 'Auditoria', false),
    -- OPERACIONAL
    (v_operacional, 'editar_plano_contas', 'Editar Plano de Contas', 'Estrutura', false),
    (v_operacional, 'excluir_lancamento_conciliado', 'Excluir Lançamento Conciliado', 'Financeiro', false),
    (v_operacional, 'editar_lancamento_conciliado', 'Editar Lançamento Conciliado', 'Financeiro', false),
    (v_operacional, 'alterar_regra_automatica', 'Alterar Regra Automática', 'Automação', false),
    (v_operacional, 'alterar_centro_custo_padrao', 'Alterar Centro de Custo Padrão', 'Estrutura', false),
    (v_operacional, 'alterar_meta_global', 'Alterar Meta Global', 'Planejamento', false),
    (v_operacional, 'cancelar_pedido_faturado', 'Cancelar Pedido Já Faturado', 'Comercial', false),
    (v_operacional, 'reabrir_pedido_encerrado', 'Reabrir Pedido Encerrado', 'Comercial', false),
    (v_operacional, 'editar_principal_emprestimo', 'Editar Principal de Empréstimo', 'Financeiro', false),
    (v_operacional, 'excluir_log', 'Excluir Log de Auditoria', 'Auditoria', false),
    -- CONTROLADORIA
    (v_controladoria, 'editar_plano_contas', 'Editar Plano de Contas', 'Estrutura', true),
    (v_controladoria, 'excluir_lancamento_conciliado', 'Excluir Lançamento Conciliado', 'Financeiro', false),
    (v_controladoria, 'editar_lancamento_conciliado', 'Editar Lançamento Conciliado', 'Financeiro', false),
    (v_controladoria, 'alterar_regra_automatica', 'Alterar Regra Automática', 'Automação', false),
    (v_controladoria, 'alterar_centro_custo_padrao', 'Alterar Centro de Custo Padrão', 'Estrutura', true),
    (v_controladoria, 'alterar_meta_global', 'Alterar Meta Global', 'Planejamento', false),
    (v_controladoria, 'cancelar_pedido_faturado', 'Cancelar Pedido Já Faturado', 'Comercial', false),
    (v_controladoria, 'reabrir_pedido_encerrado', 'Reabrir Pedido Encerrado', 'Comercial', false),
    (v_controladoria, 'editar_principal_emprestimo', 'Editar Principal de Empréstimo', 'Financeiro', false),
    (v_controladoria, 'excluir_log', 'Excluir Log de Auditoria', 'Auditoria', false),
    -- AUDITORIA
    (v_auditoria, 'editar_plano_contas', 'Editar Plano de Contas', 'Estrutura', false),
    (v_auditoria, 'excluir_lancamento_conciliado', 'Excluir Lançamento Conciliado', 'Financeiro', false),
    (v_auditoria, 'editar_lancamento_conciliado', 'Editar Lançamento Conciliado', 'Financeiro', false),
    (v_auditoria, 'alterar_regra_automatica', 'Alterar Regra Automática', 'Automação', false),
    (v_auditoria, 'alterar_centro_custo_padrao', 'Alterar Centro de Custo Padrão', 'Estrutura', false),
    (v_auditoria, 'alterar_meta_global', 'Alterar Meta Global', 'Planejamento', false),
    (v_auditoria, 'cancelar_pedido_faturado', 'Cancelar Pedido Já Faturado', 'Comercial', false),
    (v_auditoria, 'reabrir_pedido_encerrado', 'Reabrir Pedido Encerrado', 'Comercial', false),
    (v_auditoria, 'editar_principal_emprestimo', 'Editar Principal de Empréstimo', 'Financeiro', false),
    (v_auditoria, 'excluir_log', 'Excluir Log de Auditoria', 'Auditoria', false);

  -- 7. Seed segregation rules
  INSERT INTO rbac_segregation_rules (profile_type_id, blocked_action, blocked_module, reason) VALUES
    (v_comercial, 'approve', 'financeiro', 'Comercial cria pedido mas não aprova financeiro'),
    (v_comercial, 'conciliate', 'financeiro', 'Comercial não pode conciliar extrato'),
    (v_operacional, 'approve', 'financeiro', 'Operacional executa mas não fatura'),
    (v_operacional, 'create', 'financeiro', 'Operacional não lança financeiro'),
    (v_financeiro, 'admin', 'configuracoes', 'Financeiro não administra sistema'),
    (v_financeiro, 'admin', 'controladoria', 'Financeiro não altera regras automáticas'),
    (v_gestor, 'admin', 'configuracoes', 'Gestor não edita estrutura do sistema'),
    (v_auditoria, 'create', 'comercial', 'Auditor apenas visualiza'),
    (v_auditoria, 'edit', 'financeiro', 'Auditor apenas visualiza'),
    (v_auditoria, 'delete', 'financeiro', 'Auditor apenas visualiza'),
    (v_auditoria, 'approve', 'financeiro', 'Auditor apenas visualiza');

END $$;

-- 8. Add profile_type_id to profiles table for linking users to RBAC profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_type_id uuid REFERENCES public.profile_types(id);
CREATE INDEX IF NOT EXISTS idx_profiles_profile_type ON public.profiles(profile_type_id);
