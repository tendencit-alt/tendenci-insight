CREATE OR REPLACE FUNCTION public.get_production_timeline(_tenant_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _eff_tenant uuid;
  _is_owner boolean := COALESCE(is_owner(), false);
  _ops jsonb;
  _kpis jsonb;
BEGIN
  _eff_tenant := COALESCE(_tenant_id, get_user_tenant_id());
  IF _eff_tenant IS NULL AND NOT _is_owner THEN
    RETURN jsonb_build_object('ops', '[]'::jsonb, 'kpis', '{}'::jsonb);
  END IF;

  WITH phases AS (
    SELECT tenant_id, slug, label, color, sort_order, duration_days
      FROM public.production_status_columns
     WHERE (_eff_tenant IS NULL AND _is_owner) OR tenant_id = _eff_tenant
  ),
  ops AS (
    SELECT po.*
      FROM public.production_orders po
     WHERE (_eff_tenant IS NULL AND _is_owner) OR po.tenant_id = _eff_tenant
  ),
  op_phase_calc AS (
    SELECT
      o.id AS op_id,
      o.tenant_id,
      p.slug, p.label, p.color, p.sort_order,
      COALESCE(plan.planned_duration_days, p.duration_days, 7) AS duration_days,
      plan.planned_start, plan.planned_end
    FROM ops o
    JOIN phases p ON p.tenant_id = o.tenant_id
    LEFT JOIN public.production_order_phase_plan plan
      ON plan.production_order_id = o.id AND plan.phase_slug = p.slug
  ),
  op_current AS (
    SELECT
      o.id AS op_id,
      o.status AS current_slug,
      o.status_changed_at,
      (SELECT sort_order FROM phases p WHERE p.tenant_id = o.tenant_id AND p.slug = o.status) AS current_sort
    FROM ops o
  ),
  op_remaining AS (
    SELECT
      c.op_id,
      COALESCE(SUM(opc.duration_days) FILTER (WHERE opc.sort_order > c.current_sort), 0)::int AS remaining_days
    FROM op_current c
    LEFT JOIN op_phase_calc opc ON opc.op_id = c.op_id
    GROUP BY c.op_id
  ),
  op_eta AS (
    SELECT
      o.id AS op_id,
      o.planned_end_date,
      c.current_slug, c.status_changed_at, c.current_sort,
      (SELECT duration_days FROM op_phase_calc opc WHERE opc.op_id = o.id AND opc.slug = c.current_slug LIMIT 1) AS current_duration_days,
      (EXTRACT(EPOCH FROM (now() - c.status_changed_at))/86400.0) AS days_in_current,
      r.remaining_days,
      GREATEST(
        COALESCE(o.planned_end_date, now()),
        now() + make_interval(
          days => GREATEST(
            0,
            (COALESCE((SELECT duration_days FROM op_phase_calc opc WHERE opc.op_id = o.id AND opc.slug = c.current_slug LIMIT 1), 0)
             - GREATEST(0, EXTRACT(EPOCH FROM (now() - c.status_changed_at))/86400.0)::int)
            + COALESCE(r.remaining_days, 0)
          )::int
        )
      ) AS eta
    FROM ops o
    JOIN op_current c ON c.op_id = o.id
    LEFT JOIN op_remaining r ON r.op_id = o.id
  ),
  op_segments AS (
    SELECT opc.op_id,
           jsonb_agg(
             jsonb_build_object(
               'slug', opc.slug, 'label', opc.label, 'color', opc.color,
               'sort_order', opc.sort_order, 'duration_days', opc.duration_days,
               'planned_start', opc.planned_start, 'planned_end', opc.planned_end
             ) ORDER BY opc.sort_order
           ) AS segments
    FROM op_phase_calc opc
    GROUP BY opc.op_id
  ),
  op_history AS (
    SELECT h.production_order_id AS op_id,
           jsonb_agg(
             jsonb_build_object(
               'phase', h.phase, 'entered_at', h.entered_at, 'exited_at', h.exited_at,
               'direction', h.direction, 'reason', h.reason,
               'duration_hours', CASE
                 WHEN h.exited_at IS NOT NULL THEN EXTRACT(EPOCH FROM (h.exited_at - h.entered_at))/3600.0
                 ELSE EXTRACT(EPOCH FROM (now() - h.entered_at))/3600.0
               END
             ) ORDER BY h.entered_at
           ) AS history
    FROM public.production_order_phase_history h
    WHERE (_eff_tenant IS NULL AND _is_owner) OR h.tenant_id = _eff_tenant
    GROUP BY h.production_order_id
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', o.id, 'tenant_id', o.tenant_id, 'order_number', o.order_number,
      'title', o.title, 'status', o.status, 'priority', o.priority,
      'client_id', o.client_id, 'order_id', o.order_id,
      'planned_start_date', o.planned_start_date,
      'planned_end_date', o.planned_end_date,
      'actual_start_date', o.actual_start_date,
      'actual_end_date', o.actual_end_date,
      'status_changed_at', o.status_changed_at,
      'current_phase_label', (SELECT label FROM phases p WHERE p.tenant_id = o.tenant_id AND p.slug = o.status),
      'current_phase_color', (SELECT color FROM phases p WHERE p.tenant_id = o.tenant_id AND p.slug = o.status),
      'current_duration_days', e.current_duration_days,
      'days_in_current', e.days_in_current,
      'remaining_days', e.remaining_days,
      'eta', e.eta,
      'is_late_planned', (e.eta > COALESCE(o.planned_end_date, e.eta)),
      'segments', COALESCE(seg.segments, '[]'::jsonb),
      'history', COALESCE(h.history, '[]'::jsonb)
    )
  )
  INTO _ops
  FROM ops o
  LEFT JOIN op_eta e ON e.op_id = o.id
  LEFT JOIN op_segments seg ON seg.op_id = o.id
  LEFT JOIN op_history h ON h.op_id = o.id;

  _ops := COALESCE(_ops, '[]'::jsonb);

  SELECT jsonb_build_object(
    'total', COUNT(*),
    'em_producao', COUNT(*) FILTER (WHERE op->>'status' NOT IN ('aguardando','concluido','cancelado','pronto')),
    'aguardando', COUNT(*) FILTER (WHERE op->>'status' = 'aguardando'),
    'concluidas', COUNT(*) FILTER (WHERE op->>'status' IN ('concluido','pronto')),
    'atrasadas', COUNT(*) FILTER (WHERE (op->>'planned_end_date') IS NOT NULL
                                    AND (op->>'eta')::timestamptz > (op->>'planned_end_date')::timestamptz
                                    AND op->>'status' NOT IN ('concluido','pronto','cancelado')),
    'alerta_prazo', COUNT(*) FILTER (WHERE (op->>'planned_end_date') IS NOT NULL
                                       AND (op->>'eta')::timestamptz <= (op->>'planned_end_date')::timestamptz
                                       AND (op->>'eta')::timestamptz >= ((op->>'planned_end_date')::timestamptz - interval '2 days')
                                       AND op->>'status' NOT IN ('concluido','pronto','cancelado')),
    'pct_concluidas', CASE WHEN COUNT(*) > 0
                           THEN ROUND(100.0 * COUNT(*) FILTER (WHERE op->>'status' IN ('concluido','pronto')) / COUNT(*), 1)
                           ELSE 0 END
  )
  INTO _kpis
  FROM jsonb_array_elements(_ops) op;

  RETURN jsonb_build_object('ops', _ops, 'kpis', COALESCE(_kpis, '{}'::jsonb));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_production_timeline(uuid) TO authenticated;