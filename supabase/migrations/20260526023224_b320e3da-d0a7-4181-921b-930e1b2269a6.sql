
-- Refresh permission matrix for system profile types (tenant_id NULL).
-- Principle: broad read access + write only in own domain.
-- Owner bypass remains in code (is_owner = true).

DO $$
DECLARE
  v_admin uuid := 'b4752702-3a67-4346-844c-c6d9a47b7f41';
  v_fin   uuid := '7e950053-665f-4f76-892b-19b3a296fc8f';
  v_com   uuid := 'be61d3c1-4fe3-4072-bea7-74f9b50c775b';
  v_ope   uuid := '36069a99-af59-476b-8249-5e4b552b2bf0';
  v_aud   uuid := '28055970-39b9-4bb1-b440-f672a8b206f7';
  modules text[] := ARRAY['cadastros','comercial','controladoria','dashboard_executivo','financeiro','operacional','planejamento','producao','relatorios_bi','configuracoes'];
  m text;
BEGIN
  -- Helper: upsert one row
  -- (cant create local function easily; inline upserts via a temp data set)

  -- Build a temp table holding desired flags
  CREATE TEMP TABLE _perm_seed (
    profile_type_id uuid,
    module text,
    can_view bool default false,
    can_create bool default false,
    can_edit bool default false,
    can_delete bool default false,
    can_approve bool default false,
    can_conciliate bool default false,
    can_export bool default false,
    can_admin bool default false
  ) ON COMMIT DROP;

  -- ADMINISTRADOR: full access on all 10 modules
  FOREACH m IN ARRAY modules LOOP
    INSERT INTO _perm_seed(profile_type_id, module, can_view, can_create, can_edit, can_delete, can_approve, can_conciliate, can_export, can_admin)
    VALUES (v_admin, m, true, true, true, true, true, true, true, true);
  END LOOP;

  -- FINANCEIRO
  INSERT INTO _perm_seed VALUES
    (v_fin,'financeiro',          true,true,true,true,true,true,true,false),
    (v_fin,'controladoria',       true,true,true,true,true,true,true,false),
    (v_fin,'planejamento',        true,true,true,false,false,false,true,false),
    (v_fin,'cadastros',           true,true,true,false,false,false,true,false),
    (v_fin,'comercial',           true,true,true,false,false,false,true,false),
    (v_fin,'producao',            true,false,false,false,false,false,true,false),
    (v_fin,'operacional',         true,false,false,false,false,false,true,false),
    (v_fin,'dashboard_executivo', true,false,false,false,false,false,true,false),
    (v_fin,'relatorios_bi',       true,false,false,false,false,false,true,false),
    (v_fin,'configuracoes',       false,false,false,false,false,false,false,false);

  -- COMERCIAL
  INSERT INTO _perm_seed VALUES
    (v_com,'comercial',           true,true,true,false,true,false,true,false),
    (v_com,'cadastros',           true,true,true,false,false,false,true,false),
    (v_com,'financeiro',          true,false,false,false,false,false,true,false),
    (v_com,'controladoria',       true,false,false,false,false,false,true,false),
    (v_com,'planejamento',        true,false,false,false,false,false,true,false),
    (v_com,'producao',            true,false,false,false,false,false,true,false),
    (v_com,'operacional',         true,false,false,false,false,false,true,false),
    (v_com,'dashboard_executivo', true,false,false,false,false,false,true,false),
    (v_com,'relatorios_bi',       true,false,false,false,false,false,true,false),
    (v_com,'configuracoes',       false,false,false,false,false,false,false,false);

  -- OPERACIONAL
  INSERT INTO _perm_seed VALUES
    (v_ope,'producao',            true,true,true,false,true,false,true,false),
    (v_ope,'operacional',         true,true,true,false,false,false,true,false),
    (v_ope,'cadastros',           true,true,true,false,false,false,true,false),
    (v_ope,'comercial',           true,false,false,false,false,false,true,false),
    (v_ope,'financeiro',          true,false,false,false,false,false,true,false),
    (v_ope,'controladoria',       true,false,false,false,false,false,true,false),
    (v_ope,'planejamento',        true,false,false,false,false,false,true,false),
    (v_ope,'dashboard_executivo', true,false,false,false,false,false,true,false),
    (v_ope,'relatorios_bi',       true,false,false,false,false,false,true,false),
    (v_ope,'configuracoes',       false,false,false,false,false,false,false,false);

  -- AUDITORIA: view+export everywhere except configuracoes
  FOREACH m IN ARRAY modules LOOP
    IF m = 'configuracoes' THEN
      INSERT INTO _perm_seed(profile_type_id, module) VALUES (v_aud, m);
    ELSE
      INSERT INTO _perm_seed(profile_type_id, module, can_view, can_export)
      VALUES (v_aud, m, true, true);
    END IF;
  END LOOP;

  -- UPSERT into profile_type_permissions (tenant_id NULL = system rows)
  INSERT INTO public.profile_type_permissions
    (profile_type_id, module, can_view, can_create, can_edit, can_delete, can_approve, can_conciliate, can_export, can_admin, tenant_id)
  SELECT profile_type_id, module, can_view, can_create, can_edit, can_delete, can_approve, can_conciliate, can_export, can_admin, NULL
  FROM _perm_seed
  ON CONFLICT (profile_type_id, module) DO UPDATE SET
    can_view       = EXCLUDED.can_view,
    can_create     = EXCLUDED.can_create,
    can_edit       = EXCLUDED.can_edit,
    can_delete     = EXCLUDED.can_delete,
    can_approve    = EXCLUDED.can_approve,
    can_conciliate = EXCLUDED.can_conciliate,
    can_export     = EXCLUDED.can_export,
    can_admin      = EXCLUDED.can_admin;
END $$;
