-- ==============================================
-- CORREÇÃO DE SEGURANÇA BATCH 2: Funções com triggers
-- ==============================================

-- 1. auto_assign_vendor_on_update - DROP trigger correto
DROP TRIGGER IF EXISTS tr_auto_assign_vendor ON architects;

CREATE OR REPLACE FUNCTION public.auto_assign_vendor_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.vendedor_responsavel IS NULL 
     AND NEW.status_funil IS DISTINCT FROM 'novo_arquiteto'
     AND auth.uid() IS NOT NULL THEN
    NEW.vendedor_responsavel := auth.uid();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER tr_auto_assign_vendor
  BEFORE UPDATE ON architects
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_vendor_on_update();

-- 2. log_architect_changes - DROP trigger correto
DROP TRIGGER IF EXISTS tr_log_architect_changes ON architects;

CREATE OR REPLACE FUNCTION public.log_architect_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status_funil IS DISTINCT FROM NEW.status_funil THEN
      INSERT INTO architect_history (architect_id, event_type, field_name, old_value, new_value, description, created_by)
      VALUES (NEW.id, 'field_change', 'status_funil', OLD.status_funil, NEW.status_funil, 
              'Status funil alterado de ' || COALESCE(OLD.status_funil, 'vazio') || ' para ' || COALESCE(NEW.status_funil, 'vazio'),
              auth.uid());
    END IF;
    IF OLD.tier IS DISTINCT FROM NEW.tier THEN
      INSERT INTO architect_history (architect_id, event_type, field_name, old_value, new_value, description, created_by)
      VALUES (NEW.id, 'field_change', 'tier', OLD.tier, NEW.tier, 
              'Tier alterado de ' || COALESCE(OLD.tier, 'vazio') || ' para ' || COALESCE(NEW.tier, 'vazio'),
              auth.uid());
    END IF;
    IF OLD.vendedor_responsavel IS DISTINCT FROM NEW.vendedor_responsavel THEN
      INSERT INTO architect_history (architect_id, event_type, field_name, old_value, new_value, description, created_by)
      VALUES (NEW.id, 'field_change', 'vendedor_responsavel', OLD.vendedor_responsavel::text, NEW.vendedor_responsavel::text, 
              'Vendedor responsável alterado',
              auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER tr_log_architect_changes
  AFTER UPDATE ON architects
  FOR EACH ROW
  EXECUTE FUNCTION public.log_architect_changes();

-- 3. prevent_duplicate_dispatch - sem trigger existente, criar novo
CREATE OR REPLACE FUNCTION public.prevent_duplicate_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM dispatch_session_items 
    WHERE session_id = NEW.session_id 
      AND deal_id = NEW.deal_id
  ) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. recalculate_order_card_fees
DROP TRIGGER IF EXISTS trigger_recalculate_card_fees ON orders;

CREATE OR REPLACE FUNCTION public.recalculate_order_card_fees()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE orders 
  SET card_fee_amount = CASE 
    WHEN payment_method = 'credit_card' AND card_installments IS NOT NULL THEN
      total_amount * COALESCE(
        (SELECT rate_percent FROM credit_card_rates WHERE installments = card_installments AND active = true LIMIT 1),
        0
      ) / 100
    ELSE 0
  END
  WHERE id = NEW.id;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_recalculate_card_fees
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_order_card_fees();

-- 5. set_default_permissions_for_new_user
DROP TRIGGER IF EXISTS on_user_created_initialize_permissions ON profiles;

CREATE OR REPLACE FUNCTION public.set_default_permissions_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO user_permissions (user_id, permission_key, granted)
  SELECT NEW.id, key, false
  FROM unnest(ARRAY[
    'dashboard.view',
    'crm.view', 'crm.edit',
    'architects.view', 'architects.edit',
    'projects.view', 'projects.edit',
    'financeiro.view', 'financeiro.edit',
    'production.view', 'production.edit',
    'inventory.view', 'inventory.edit',
    'ia.view', 'ia.edit',
    'admin.view', 'admin.edit'
  ]) AS key
  ON CONFLICT (user_id, permission_key) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_user_created_initialize_permissions
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_default_permissions_for_new_user();

-- 6. trigger_sync_ia_to_inventory - sem trigger existente visível
CREATE OR REPLACE FUNCTION public.trigger_sync_ia_to_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.sync_status = 'synced' AND OLD.sync_status != 'synced' THEN
    UPDATE products 
    SET 
      name = COALESCE(NEW.nome_final, NEW.nome_sugerido, products.name),
      description = COALESCE(NEW.descricao_final, NEW.descricao_sugerida, products.description),
      updated_at = NOW()
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- 7. update_dashboards_updated_at
DROP TRIGGER IF EXISTS trigger_update_dashboards_updated_at ON dashboards_personalizados;

CREATE OR REPLACE FUNCTION public.update_dashboards_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_update_dashboards_updated_at
  BEFORE UPDATE ON dashboards_personalizados
  FOR EACH ROW
  EXECUTE FUNCTION public.update_dashboards_updated_at();

-- 8. update_ia_config_updated_at
CREATE OR REPLACE FUNCTION public.update_ia_config_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- 9. update_master_idea_rating_updated_at
CREATE OR REPLACE FUNCTION public.update_master_idea_rating_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- 10. update_seller_goal_progress
DROP TRIGGER IF EXISTS trigger_update_seller_goal_progress ON crm_deals;

CREATE OR REPLACE FUNCTION public.update_seller_goal_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE seller_goals sg
  SET current_progress = (
    SELECT COALESCE(SUM(cd.value), 0)
    FROM crm_deals cd
    JOIN crm_stages cs ON cd.stage_id = cs.id
    WHERE cd.owner_id = sg.user_id
      AND EXTRACT(MONTH FROM cd.created_at) = sg.month
      AND EXTRACT(YEAR FROM cd.created_at) = sg.year
      AND cs.name IN ('Fechado Ganho', 'Ganho', 'Won')
  )
  WHERE sg.user_id = COALESCE(NEW.owner_id, OLD.owner_id)
    AND sg.month = EXTRACT(MONTH FROM COALESCE(NEW.created_at, OLD.created_at))
    AND sg.year = EXTRACT(YEAR FROM COALESCE(NEW.created_at, OLD.created_at));
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE TRIGGER trigger_update_seller_goal_progress
  AFTER INSERT OR UPDATE OR DELETE ON crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_seller_goal_progress();

-- 11. update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- 12. create_production_orders_on_activation - sem trigger existente
CREATE OR REPLACE FUNCTION public.create_production_orders_on_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.active = true AND (OLD.active IS NULL OR OLD.active = false) THEN
    INSERT INTO production_orders (order_item_id, order_id, status, priority)
    SELECT 
      oi.id,
      oi.order_id,
      'pending',
      'normal'
    FROM order_items oi
    WHERE oi.order_id = NEW.id
      AND NOT EXISTS (
        SELECT 1 FROM production_orders po WHERE po.order_item_id = oi.id
      );
  END IF;
  RETURN NEW;
END;
$function$;

-- 13. calcular_previsao_atraso_producao (função normal, não trigger)
CREATE OR REPLACE FUNCTION public.calcular_previsao_atraso_producao(p_order_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_result JSON;
  v_order RECORD;
  v_total_sla_hours INTEGER;
  v_total_sla_dias INTEGER;
  v_current_phase RECORD;
  v_hours_in_phase NUMERIC;
  v_phase_sla_hours INTEGER;
  v_previsao_atraso BOOLEAN := false;
  v_etapa_atraso TEXT := null;
BEGIN
  SELECT * INTO v_order FROM production_orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RETURN json_build_object('error', 'Ordem não encontrada');
  END IF;
  
  SELECT COALESCE(SUM(COALESCE(sla_hours, 0)), 0), COALESCE(SUM(COALESCE(sla_dias_uteis, 0)), 0)
  INTO v_total_sla_hours, v_total_sla_dias
  FROM production_phase_templates
  WHERE production_type_id = v_order.production_type_id;
  
  IF v_order.current_phase_id IS NOT NULL THEN
    SELECT pp.*, ppt.name as phase_name, ppt.sla_hours as template_sla_hours
    INTO v_current_phase
    FROM production_phases pp
    LEFT JOIN production_phase_templates ppt ON pp.phase_template_id = ppt.id
    WHERE pp.id = v_order.current_phase_id;
    
    IF v_current_phase IS NOT NULL AND v_current_phase.started_at IS NOT NULL THEN
      v_hours_in_phase := EXTRACT(EPOCH FROM (NOW() - v_current_phase.started_at)) / 3600;
      v_phase_sla_hours := COALESCE(v_current_phase.template_sla_hours, 8);
      
      IF v_hours_in_phase > v_phase_sla_hours THEN
        v_previsao_atraso := true;
        v_etapa_atraso := v_current_phase.phase_name;
      END IF;
    END IF;
  END IF;
  
  v_result := json_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'previsao_atraso', v_previsao_atraso,
    'etapa_atraso', v_etapa_atraso,
    'sla_total_hours', v_total_sla_hours,
    'sla_total_dias', v_total_sla_dias
  );
  
  RETURN v_result;
END;
$function$;