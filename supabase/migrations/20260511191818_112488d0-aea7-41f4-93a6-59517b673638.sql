
WITH defaults(name, description, color, icon, perms) AS (
  VALUES
  ('Owner / Master', 'Acesso total ao sistema', '#7C3AED', 'crown', jsonb_build_object(
    'dashboard_executivo', jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',true,'can_approve',true,'can_conciliate',true,'can_export',true,'can_admin',true),
    'comercial',           jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',true,'can_approve',true,'can_conciliate',true,'can_export',true,'can_admin',true),
    'operacional',         jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',true,'can_approve',true,'can_conciliate',true,'can_export',true,'can_admin',true),
    'financeiro',          jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',true,'can_approve',true,'can_conciliate',true,'can_export',true,'can_admin',true),
    'controladoria',       jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',true,'can_approve',true,'can_conciliate',true,'can_export',true,'can_admin',true),
    'planejamento',        jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',true,'can_approve',true,'can_conciliate',true,'can_export',true,'can_admin',true),
    'cadastros',           jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',true,'can_approve',true,'can_conciliate',true,'can_export',true,'can_admin',true),
    'relatorios_bi',       jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',true,'can_approve',true,'can_conciliate',true,'can_export',true,'can_admin',true),
    'configuracoes',       jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',true,'can_approve',true,'can_conciliate',true,'can_export',true,'can_admin',true)
  )),
  ('Administrador', 'Gestão completa exceto super-admin', '#3B82F6', 'shield', jsonb_build_object(
    'dashboard_executivo', jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',true,'can_conciliate',false,'can_export',true,'can_admin',false),
    'comercial',           jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',true,'can_approve',true,'can_conciliate',false,'can_export',true,'can_admin',true),
    'operacional',         jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',true,'can_approve',true,'can_conciliate',false,'can_export',true,'can_admin',true),
    'financeiro',          jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',true,'can_approve',true,'can_conciliate',true,'can_export',true,'can_admin',true),
    'controladoria',       jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',false,'can_approve',true,'can_conciliate',true,'can_export',true,'can_admin',false),
    'planejamento',        jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',true,'can_approve',true,'can_conciliate',false,'can_export',true,'can_admin',false),
    'cadastros',           jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',true,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'relatorios_bi',       jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'configuracoes',       jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',false,'can_admin',true)
  )),
  ('Gestor', 'Coordenação operacional e aprovações', '#10B981', 'briefcase', jsonb_build_object(
    'dashboard_executivo', jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',true,'can_conciliate',false,'can_export',true,'can_admin',false),
    'comercial',           jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',false,'can_approve',true,'can_conciliate',false,'can_export',true,'can_admin',false),
    'operacional',         jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',false,'can_approve',true,'can_conciliate',false,'can_export',true,'can_admin',false),
    'financeiro',          jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',false,'can_approve',true,'can_conciliate',false,'can_export',true,'can_admin',false),
    'controladoria',       jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'planejamento',        jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',false,'can_approve',true,'can_conciliate',false,'can_export',true,'can_admin',false),
    'cadastros',           jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'relatorios_bi',       jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'configuracoes',       jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',false,'can_admin',false)
  )),
  ('Comercial', 'Equipe de vendas e CRM', '#F59E0B', 'trending-up', jsonb_build_object(
    'dashboard_executivo', jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',false,'can_admin',false),
    'comercial',           jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'operacional',         jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',false,'can_admin',false),
    'financeiro',          jsonb_build_object('can_view',false,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',false,'can_admin',false),
    'controladoria',       jsonb_build_object('can_view',false,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',false,'can_admin',false),
    'planejamento',        jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',false,'can_admin',false),
    'cadastros',           jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',false,'can_admin',false),
    'relatorios_bi',       jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'configuracoes',       jsonb_build_object('can_view',false,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',false,'can_admin',false)
  )),
  ('Operacional', 'Produção e execução de pedidos', '#06B6D4', 'package', jsonb_build_object(
    'dashboard_executivo', jsonb_build_object('can_view',false,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',false,'can_admin',false),
    'comercial',           jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',false,'can_admin',false),
    'operacional',         jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'financeiro',          jsonb_build_object('can_view',false,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',false,'can_admin',false),
    'controladoria',       jsonb_build_object('can_view',false,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',false,'can_admin',false),
    'planejamento',        jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',false,'can_admin',false),
    'cadastros',           jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',false,'can_admin',false),
    'relatorios_bi',       jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',false,'can_admin',false),
    'configuracoes',       jsonb_build_object('can_view',false,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',false,'can_admin',false)
  )),
  ('Financeiro', 'Contas a pagar/receber e conciliação', '#EF4444', 'dollar-sign', jsonb_build_object(
    'dashboard_executivo', jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'comercial',           jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',false,'can_admin',false),
    'operacional',         jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',false,'can_admin',false),
    'financeiro',          jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',true,'can_approve',true,'can_conciliate',true,'can_export',true,'can_admin',false),
    'controladoria',       jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',false,'can_approve',false,'can_conciliate',true,'can_export',true,'can_admin',false),
    'planejamento',        jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'cadastros',           jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'relatorios_bi',       jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'configuracoes',       jsonb_build_object('can_view',false,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',false,'can_admin',false)
  )),
  ('Controladoria', 'DRE, fechamentos e auditoria contábil', '#8B5CF6', 'book-open', jsonb_build_object(
    'dashboard_executivo', jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'comercial',           jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'operacional',         jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'financeiro',          jsonb_build_object('can_view',true,'can_create',false,'can_edit',true,'can_delete',false,'can_approve',true,'can_conciliate',true,'can_export',true,'can_admin',false),
    'controladoria',       jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',true,'can_approve',true,'can_conciliate',true,'can_export',true,'can_admin',true),
    'planejamento',        jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',false,'can_approve',true,'can_conciliate',false,'can_export',true,'can_admin',false),
    'cadastros',           jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'relatorios_bi',       jsonb_build_object('can_view',true,'can_create',true,'can_edit',true,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'configuracoes',       jsonb_build_object('can_view',false,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',false,'can_admin',false)
  )),
  ('Auditoria / Leitura', 'Acesso somente leitura para auditoria', '#6B7280', 'eye', jsonb_build_object(
    'dashboard_executivo', jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'comercial',           jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'operacional',         jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'financeiro',          jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'controladoria',       jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'planejamento',        jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'cadastros',           jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'relatorios_bi',       jsonb_build_object('can_view',true,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',true,'can_admin',false),
    'configuracoes',       jsonb_build_object('can_view',false,'can_create',false,'can_edit',false,'can_delete',false,'can_approve',false,'can_conciliate',false,'can_export',false,'can_admin',false)
  ))
)
INSERT INTO public.profile_type_templates (tenant_id, name, description, color, icon, permissions, is_builtin)
SELECT NULL, d.name, d.description, d.color, d.icon, d.perms, true
FROM defaults d
WHERE NOT EXISTS (
  SELECT 1 FROM public.profile_type_templates t
  WHERE t.tenant_id IS NULL AND t.name = d.name
);
