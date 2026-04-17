
-- 1. Garantir descrições amigáveis nos perfis existentes (apenas atualiza description quando vazia)
UPDATE public.profile_types SET description = COALESCE(description, 'Acesso total à plataforma, observability, releases, feature flags e simulação de permissões.') WHERE name = 'owner';
UPDATE public.profile_types SET description = COALESCE(description, 'Gerencia usuários, módulos, plano de contas, centros de custo e permissões da empresa.') WHERE name = 'administrador';
UPDATE public.profile_types SET description = COALESCE(description, 'Visualiza relatórios, aprova lançamentos, acompanha metas e projetos.') WHERE name = 'gestor';
UPDATE public.profile_types SET description = COALESCE(description, 'Lança dados, edita registros próprios e executa tarefas operacionais.') WHERE name = 'operacional';
UPDATE public.profile_types SET description = COALESCE(description, 'Visualiza dashboards e relatórios sem permissão de edição.') WHERE name = 'auditoria';

-- 2. Catálogo central de permissões (chave -> rótulo, módulo, descrição)
CREATE TABLE IF NOT EXISTS public.rbac_permission_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key text NOT NULL UNIQUE,
  label text NOT NULL,
  module text NOT NULL,
  description text,
  default_blocked_message text,
  is_critical boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rbac_permission_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read permission catalog" ON public.rbac_permission_catalog;
CREATE POLICY "Authenticated read permission catalog"
  ON public.rbac_permission_catalog
  FOR SELECT TO authenticated
  USING (true);

-- 3. Seed do catálogo
INSERT INTO public.rbac_permission_catalog (permission_key, label, module, description, default_blocked_message, is_critical) VALUES
  ('editar_lancamento_conciliado',   'Editar lançamento conciliado',   'financeiro',     'Permite alterar lançamentos já conciliados ao extrato.',          'Este lançamento já foi conciliado. Apenas perfis com permissão de edição contábil podem alterá-lo.', true),
  ('excluir_lancamento_conciliado',  'Excluir lançamento conciliado',  'financeiro',     'Permite excluir lançamentos conciliados.',                        'Não é possível excluir lançamentos conciliados sem permissão específica.', true),
  ('editar_plano_contas',            'Editar plano de contas',         'cadastros',      'Permite alterar a estrutura do plano de contas gerencial.',       'Plano de contas é um cadastro estrutural. Solicite ao administrador.', true),
  ('alterar_centro_custo_padrao',    'Alterar centro de custo padrão', 'cadastros',      'Permite alterar centros de custo reservados pelo sistema.',       'Este centro de custo é reservado e não pode ser alterado.', true),
  ('alterar_meta_global',            'Alterar meta global',            'planning',       'Permite editar metas financeiras globais.',                       'Apenas Owners e Administradores podem alterar metas globais.', true),
  ('cancelar_pedido_faturado',       'Cancelar pedido faturado',       'pedidos',        'Permite cancelar pedidos já faturados.',                          'Pedidos faturados só podem ser cancelados por perfis autorizados.', true),
  ('reabrir_pedido_encerrado',       'Reabrir pedido encerrado',       'pedidos',        'Permite reabrir pedidos finalizados.',                            'Reabertura de pedidos requer permissão específica.', true),
  ('alterar_regra_automatica',       'Alterar regra automática',       'integracoes',    'Permite alterar regras de automação entre módulos.',              'Regras automáticas afetam toda a empresa. Solicite ao administrador.', true),
  ('editar_principal_emprestimo',    'Editar principal de empréstimo', 'financeiro',     'Permite editar valor principal de contratos de empréstimo.',      'Edição de empréstimos requer aprovação contábil.', true),
  ('excluir_log',                    'Excluir log de auditoria',       'auditoria',      'Permite excluir registros do log de auditoria.',                  'Logs de auditoria são imutáveis por design.', true),
  ('fechar_periodo_dre',             'Fechar período do DRE',          'dre',            'Permite executar o fechamento mensal do DRE.',                    'Fechamento de período é restrito à Controladoria/Owner.', true),
  ('reabrir_periodo_dre',            'Reabrir período do DRE',         'dre',            'Permite reabrir um período já fechado do DRE.',                   'Reabertura de período fechado é altamente restrita.', true),
  ('editar_fluxo_caixa_realizado',   'Editar fluxo de caixa realizado','fluxo_caixa',    'Permite alterar valores realizados do fluxo de caixa.',           'Valores realizados refletem o caixa executado e não podem ser editados livremente.', true),
  ('exportar_relatorio_executivo',   'Exportar relatório executivo',   'relatorios',     'Permite exportar relatórios executivos completos.',               'Relatórios executivos contêm informações sensíveis.', false),
  ('simular_permissoes',             'Simular permissões de usuário',  'permissoes',     'Modo Owner: simular acesso de outro usuário/perfil.',             'Apenas Owners podem simular permissões.', true)
ON CONFLICT (permission_key) DO UPDATE
  SET label = EXCLUDED.label,
      module = EXCLUDED.module,
      description = EXCLUDED.description,
      default_blocked_message = EXCLUDED.default_blocked_message,
      is_critical = EXCLUDED.is_critical;

-- 4. Garantir entradas em rbac_critical_permissions para cada perfil x permissão crítica
DO $$
DECLARE
  pt RECORD;
  pc RECORD;
  v_allowed boolean;
BEGIN
  FOR pt IN SELECT id, name FROM public.profile_types WHERE is_system = true LOOP
    FOR pc IN SELECT permission_key, label, module FROM public.rbac_permission_catalog WHERE is_critical = true LOOP
      v_allowed := CASE
        WHEN pt.name = 'owner' THEN true
        WHEN pt.name = 'administrador' AND pc.permission_key NOT IN ('excluir_log','reabrir_periodo_dre','simular_permissoes') THEN true
        WHEN pt.name = 'controladoria' AND pc.module IN ('financeiro','dre','fluxo_caixa','cadastros','planning') THEN true
        WHEN pt.name = 'financeiro' AND pc.module IN ('financeiro','fluxo_caixa') AND pc.permission_key NOT IN ('excluir_lancamento_conciliado','editar_principal_emprestimo') THEN true
        WHEN pt.name = 'gestor' AND pc.permission_key IN ('exportar_relatorio_executivo') THEN true
        ELSE false
      END;

      INSERT INTO public.rbac_critical_permissions (profile_type_id, permission_key, permission_label, permission_group, allowed)
      VALUES (pt.id, pc.permission_key, pc.label, pc.module, v_allowed)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- 5. Tabela de bloqueios para analytics
CREATE TABLE IF NOT EXISTS public.rbac_permission_denials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  module text,
  context jsonb,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rbac_denials_tenant_time ON public.rbac_permission_denials(tenant_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_rbac_denials_perm ON public.rbac_permission_denials(permission_key);

ALTER TABLE public.rbac_permission_denials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own denials" ON public.rbac_permission_denials;
CREATE POLICY "Users insert own denials"
  ON public.rbac_permission_denials
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner/Admin read tenant denials" ON public.rbac_permission_denials;
CREATE POLICY "Owner/Admin read tenant denials"
  ON public.rbac_permission_denials
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.profile_types pt ON pt.id = p.profile_type_id
      WHERE p.id = auth.uid()
        AND pt.name IN ('owner','administrador')
        AND (p.tenant_id = rbac_permission_denials.tenant_id OR pt.name = 'owner')
    )
  );

-- 6. Função utilitária para registrar bloqueios
CREATE OR REPLACE FUNCTION public.log_permission_denial(
  _permission_key text,
  _module text DEFAULT NULL,
  _context jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.rbac_permission_denials (user_id, tenant_id, permission_key, module, context)
  VALUES (auth.uid(), v_tenant, _permission_key, _module, COALESCE(_context, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
