CREATE TABLE IF NOT EXISTS public.rbac_permission_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  profile_type_id uuid REFERENCES public.profile_types(id) ON DELETE CASCADE,
  permission_key text,
  module text,
  recommendation_type text NOT NULL CHECK (recommendation_type IN ('grant_read','adjust_message','review_scope','reduce_conflict','other')),
  title text NOT NULL,
  description text,
  evidence jsonb DEFAULT '{}'::jsonb,
  priority integer DEFAULT 3,
  confidence numeric DEFAULT 0.7,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','dismissed','applied')),
  source text NOT NULL DEFAULT 'heuristic' CHECK (source IN ('heuristic','ai')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rbac_permission_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner manages permission recommendations" ON public.rbac_permission_recommendations;
CREATE POLICY "Owner manages permission recommendations"
  ON public.rbac_permission_recommendations
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.profile_types pt ON pt.id = p.profile_type_id
    WHERE p.id = auth.uid() AND pt.name = 'owner'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.profile_types pt ON pt.id = p.profile_type_id
    WHERE p.id = auth.uid() AND pt.name = 'owner'
  ));

CREATE INDEX IF NOT EXISTS idx_rbac_perm_recs_status ON public.rbac_permission_recommendations(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_rbac_perm_recs_tenant ON public.rbac_permission_recommendations(tenant_id);

CREATE OR REPLACE FUNCTION public.generate_permission_recommendations(_since_days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  r record;
BEGIN
  FOR r IN
    SELECT 
      d.tenant_id,
      d.permission_key,
      d.module,
      count(*)::int AS occurrences,
      count(DISTINCT d.user_id)::int AS distinct_users
    FROM public.rbac_permission_denials d
    WHERE d.attempted_at >= now() - make_interval(days => _since_days)
    GROUP BY d.tenant_id, d.permission_key, d.module
    HAVING count(*) >= 5
  LOOP
    INSERT INTO public.rbac_permission_recommendations (
      tenant_id, permission_key, module, recommendation_type,
      title, description, evidence, priority, confidence, source
    ) VALUES (
      r.tenant_id,
      r.permission_key,
      r.module,
      CASE WHEN r.distinct_users >= 3 THEN 'grant_read' ELSE 'adjust_message' END,
      'Permissão com alta fricção: ' || r.permission_key,
      format('Detectadas %s tentativas negadas de %s usuários distintos nos últimos %s dias.',
             r.occurrences, r.distinct_users, _since_days),
      jsonb_build_object(
        'occurrences', r.occurrences,
        'distinct_users', r.distinct_users,
        'window_days', _since_days
      ),
      CASE WHEN r.occurrences >= 20 THEN 1 WHEN r.occurrences >= 10 THEN 2 ELSE 3 END,
      LEAST(0.5 + (r.occurrences::numeric / 100), 0.95),
      'heuristic'
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.diff_profile_critical_permissions(_profile_a uuid, _profile_b uuid)
RETURNS TABLE(permission_key text, module text, label text, allowed_a boolean, allowed_b boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.permission_key,
    c.module,
    c.label,
    COALESCE(a.allowed, false) AS allowed_a,
    COALESCE(b.allowed, false) AS allowed_b
  FROM public.rbac_permission_catalog c
  LEFT JOIN public.rbac_critical_permissions a 
    ON a.permission_key = c.permission_key AND a.profile_type_id = _profile_a
  LEFT JOIN public.rbac_critical_permissions b
    ON b.permission_key = c.permission_key AND b.profile_type_id = _profile_b
  ORDER BY c.module, c.label;
$$;