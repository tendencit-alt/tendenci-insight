-- Refresh permission matrix for the 5 system profile types.
-- Applies to system profile_types (tenant_id IS NULL) AND existing tenant copies with the same name.

DO $$
DECLARE
  v_modules text[] := ARRAY[
    'dashboard_executivo','comercial','operacional','financeiro',
    'controladoria','planejamento','producao','cadastros',
    'relatorios_bi','configuracoes'
  ];
  v_role text;
  v_module text;
  v_pt_id uuid;
  v_acts text[];
  v_view bool; v_create bool; v_edit bool; v_delete bool;
  v_approve bool; v_conciliate bool; v_export bool; v_admin bool;
  -- Matrix: role -> module -> actions (csv); missing => no access
  matrix jsonb := '{
    "administrador": {
      "dashboard_executivo":"view,create,edit,delete,approve,conciliate,export,admin",
      "comercial":"view,create,edit,delete,approve,conciliate,export,admin",
      "operacional":"view,create,edit,delete,approve,conciliate,export,admin",
      "financeiro":"view,create,edit,delete,approve,conciliate,export,admin",
      "controladoria":"view,create,edit,delete,approve,conciliate,export,admin",
      "planejamento":"view,create,edit,delete,approve,conciliate,export,admin",
      "producao":"view,create,edit,delete,approve,conciliate,export,admin",
      "cadastros":"view,create,edit,delete,approve,conciliate,export,admin",
      "relatorios_bi":"view,create,edit,delete,approve,conciliate,export,admin",
      "configuracoes":"view,create,edit,delete,approve,conciliate,export,admin"
    },
    "financeiro": {
      "financeiro":"view,create,edit,approve,conciliate,export",
      "controladoria":"view,create,edit,approve,conciliate,export",
      "planejamento":"view,create,edit,export",
      "cadastros":"view,create,edit,export",
      "comercial":"view,create,edit,export",
      "producao":"view,export",
      "operacional":"view,export",
      "dashboard_executivo":"view,export",
      "relatorios_bi":"view,export"
    },
    "comercial": {
      "comercial":"view,create,edit,approve,export",
      "cadastros":"view,create,edit,export",
      "financeiro":"view,export",
      "controladoria":"view,export",
      "planejamento":"view,export",
      "producao":"view,export",
      "operacional":"view,export",
      "dashboard_executivo":"view,export",
      "relatorios_bi":"view,export"
    },
    "operacional": {
      "producao":"view,create,edit,approve,export",
      "operacional":"view,create,edit,export",
      "cadastros":"view,create,edit,export",
      "comercial":"view,export",
      "financeiro":"view,export",
      "controladoria":"view,export",
      "planejamento":"view,export",
      "dashboard_executivo":"view,export",
      "relatorios_bi":"view,export"
    },
    "auditoria": {
      "cadastros":"view,export",
      "comercial":"view,export",
      "controladoria":"view,export",
      "dashboard_executivo":"view,export",
      "financeiro":"view,export",
      "operacional":"view,export",
      "planejamento":"view,export",
      "producao":"view,export",
      "relatorios_bi":"view,export"
    }
  }'::jsonb;
BEGIN
  FOR v_role IN SELECT jsonb_object_keys(matrix) LOOP
    FOR v_pt_id IN
      SELECT id FROM public.profile_types
      WHERE name = v_role
        AND (is_system = true OR tenant_id IS NOT NULL)
    LOOP
      FOREACH v_module IN ARRAY v_modules LOOP
        v_acts := string_to_array(COALESCE(matrix->v_role->>v_module, ''), ',');
        v_view       := 'view'       = ANY(v_acts);
        v_create     := 'create'     = ANY(v_acts);
        v_edit       := 'edit'       = ANY(v_acts);
        v_delete     := 'delete'     = ANY(v_acts);
        v_approve    := 'approve'    = ANY(v_acts);
        v_conciliate := 'conciliate' = ANY(v_acts);
        v_export     := 'export'     = ANY(v_acts);
        v_admin      := 'admin'      = ANY(v_acts);

        INSERT INTO public.profile_type_permissions
          (profile_type_id, module, can_view, can_create, can_edit, can_delete,
           can_approve, can_conciliate, can_export, can_admin)
        VALUES
          (v_pt_id, v_module, v_view, v_create, v_edit, v_delete,
           v_approve, v_conciliate, v_export, v_admin)
        ON CONFLICT (profile_type_id, module) DO UPDATE SET
          can_view       = EXCLUDED.can_view,
          can_create     = EXCLUDED.can_create,
          can_edit       = EXCLUDED.can_edit,
          can_delete     = EXCLUDED.can_delete,
          can_approve    = EXCLUDED.can_approve,
          can_conciliate = EXCLUDED.can_conciliate,
          can_export     = EXCLUDED.can_export,
          can_admin      = EXCLUDED.can_admin;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;