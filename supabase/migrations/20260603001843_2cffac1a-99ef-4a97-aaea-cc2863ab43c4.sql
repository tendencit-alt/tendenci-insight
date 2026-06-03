
-- Helper: insert into order_history safely
CREATE OR REPLACE FUNCTION public.log_order_event(
  _order_id uuid, _action text, _description text,
  _field text DEFAULT NULL, _old text DEFAULT NULL, _new text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _order_id IS NULL THEN RETURN; END IF;
  INSERT INTO order_history (order_id, action_type, field_name, old_value, new_value, description, created_by)
  VALUES (_order_id, _action, _field, _old, _new, _description, auth.uid());
END; $$;

-- ───── Items ─────
CREATE OR REPLACE FUNCTION public.log_order_item_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_order_event(NEW.order_id, 'item_added',
      'Item adicionado: ' || NEW.descricao);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_order_event(OLD.order_id, 'item_removed',
      'Item removido: ' || OLD.descricao);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.descricao IS DISTINCT FROM NEW.descricao THEN
      PERFORM log_order_event(NEW.order_id, 'item_renamed',
        'Item renomeado: "' || OLD.descricao || '" → "' || NEW.descricao || '"');
    END IF;
    IF OLD.quantidade IS DISTINCT FROM NEW.quantidade THEN
      PERFORM log_order_event(NEW.order_id, 'item_qty_changed',
        'Quantidade de "' || NEW.descricao || '" alterada de ' || OLD.quantidade || ' para ' || NEW.quantidade);
    END IF;
    IF OLD.valor_unitario IS DISTINCT FROM NEW.valor_unitario THEN
      PERFORM log_order_event(NEW.order_id, 'item_price_changed',
        'Valor unitário de "' || NEW.descricao || '" alterado de ' || OLD.valor_unitario || ' para ' || NEW.valor_unitario);
    END IF;
    IF COALESCE(OLD.observacao,'') IS DISTINCT FROM COALESCE(NEW.observacao,'') THEN
      PERFORM log_order_event(NEW.order_id, 'item_obs_changed',
        'Observação do item "' || NEW.descricao || '" atualizada');
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_log_order_item_changes ON public.order_items;
CREATE TRIGGER trg_log_order_item_changes
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.log_order_item_changes();

-- ───── Extra info (informação complementar) ─────
CREATE OR REPLACE FUNCTION public.log_order_extra_info_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_order_event(NEW.order_id, 'extra_added',
      'Informação complementar adicionada: ' || COALESCE(NEW.titulo,'(sem título)'));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_order_event(OLD.order_id, 'extra_removed',
      'Informação complementar removida: ' || COALESCE(OLD.titulo,'(sem título)'));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.titulo IS DISTINCT FROM NEW.titulo THEN
      PERFORM log_order_event(NEW.order_id, 'extra_renamed',
        'Informação complementar renomeada: "' || COALESCE(OLD.titulo,'') || '" → "' || COALESCE(NEW.titulo,'') || '"');
    END IF;
    IF COALESCE(OLD.observacao,'') IS DISTINCT FROM COALESCE(NEW.observacao,'') THEN
      PERFORM log_order_event(NEW.order_id, 'extra_obs_changed',
        'Observação de "' || COALESCE(NEW.titulo,'') || '" atualizada');
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_log_order_extra_info ON public.order_extra_info;
CREATE TRIGGER trg_log_order_extra_info
AFTER INSERT OR UPDATE OR DELETE ON public.order_extra_info
FOR EACH ROW EXECUTE FUNCTION public.log_order_extra_info_changes();

-- ───── Attachments ─────
CREATE OR REPLACE FUNCTION public.log_order_attachment_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ctx text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT CASE
      WHEN NEW.order_item_id IS NOT NULL THEN (SELECT 'item "' || descricao || '"' FROM order_items WHERE id = NEW.order_item_id)
      WHEN NEW.extra_info_id IS NOT NULL THEN (SELECT 'informação complementar "' || COALESCE(titulo,'') || '"' FROM order_extra_info WHERE id = NEW.extra_info_id)
      ELSE 'pedido'
    END INTO _ctx;
    PERFORM log_order_event(NEW.order_id, 'attachment_added',
      'Arquivo anexado em ' || COALESCE(_ctx,'pedido') || ': ' || NEW.file_name);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_order_event(OLD.order_id, 'attachment_removed',
      'Arquivo removido: ' || OLD.file_name);
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_log_order_attachments ON public.order_item_attachments;
CREATE TRIGGER trg_log_order_attachments
AFTER INSERT OR DELETE ON public.order_item_attachments
FOR EACH ROW EXECUTE FUNCTION public.log_order_attachment_changes();

-- ───── Production OP phase / deadline changes ─────
CREATE OR REPLACE FUNCTION public.log_op_phase_to_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _order_id uuid; _op_num int;
BEGIN
  SELECT o.id, p.order_number INTO _order_id, _op_num
  FROM production_orders p
  LEFT JOIN orders o ON o.id = (p.specifications->>'order_id')::uuid
  WHERE p.id = NEW.production_order_id;

  IF _order_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.direction = 'deadline' THEN
    PERFORM log_order_event(_order_id, 'op_deadline_changed',
      'OP #' || _op_num || ' — prazo reprogramado' ||
      CASE WHEN NEW.reason IS NOT NULL AND NEW.reason <> '' THEN ': ' || NEW.reason ELSE '' END);
  ELSIF NEW.direction = 'forward' THEN
    PERFORM log_order_event(_order_id, 'op_phase_forward',
      'OP #' || _op_num || ' avançou para fase "' || NEW.phase || '"');
  ELSIF NEW.direction = 'regress' THEN
    PERFORM log_order_event(_order_id, 'op_phase_regress',
      'OP #' || _op_num || ' retornou para fase "' || NEW.phase || '"' ||
      CASE WHEN NEW.reason IS NOT NULL AND NEW.reason <> '' THEN ': ' || NEW.reason ELSE '' END);
  ELSIF NEW.direction = 'initial' THEN
    PERFORM log_order_event(_order_id, 'op_started',
      'OP #' || _op_num || ' iniciada na fase "' || NEW.phase || '"');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_log_op_phase_to_order ON public.production_order_phase_history;
CREATE TRIGGER trg_log_op_phase_to_order
AFTER INSERT ON public.production_order_phase_history
FOR EACH ROW EXECUTE FUNCTION public.log_op_phase_to_order();

-- ───── Delivery orders ─────
CREATE OR REPLACE FUNCTION public.log_delivery_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_order_event(NEW.order_id, 'delivery_created',
      'Ordem de entrega criada' || COALESCE(' (' || NEW.code || ')',''));
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_order_event(NEW.order_id, 'delivery_status',
      'Entrega: status alterado de ' || OLD.status || ' para ' || NEW.status);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_log_delivery_changes ON public.delivery_orders;
CREATE TRIGGER trg_log_delivery_changes
AFTER INSERT OR UPDATE ON public.delivery_orders
FOR EACH ROW EXECUTE FUNCTION public.log_delivery_changes();

-- ───── Installation orders ─────
CREATE OR REPLACE FUNCTION public.log_installation_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_order_event(NEW.order_id, 'install_created', 'Ordem de instalação criada');
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_order_event(NEW.order_id, 'install_status',
      'Instalação: status alterado de ' || OLD.status || ' para ' || NEW.status);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_log_installation_changes ON public.installation_orders;
CREATE TRIGGER trg_log_installation_changes
AFTER INSERT OR UPDATE ON public.installation_orders
FOR EACH ROW EXECUTE FUNCTION public.log_installation_changes();

-- ───── Financial entries linked to the order ─────
CREATE OR REPLACE FUNCTION public.log_fin_entry_to_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.order_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    PERFORM log_order_event(NEW.order_id, 'fin_entry_created',
      'Lançamento financeiro criado (' || COALESCE(NEW.type,'') || '): ' || NEW.description || ' — R$ ' || NEW.amount);
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_order_event(NEW.order_id, 'fin_entry_status',
      'Lançamento "' || NEW.description || '" alterado de ' || COALESCE(OLD.status,'-') || ' para ' || COALESCE(NEW.status,'-'));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_log_fin_entry_to_order ON public.fin_ledger_entries;
CREATE TRIGGER trg_log_fin_entry_to_order
AFTER INSERT OR UPDATE ON public.fin_ledger_entries
FOR EACH ROW EXECUTE FUNCTION public.log_fin_entry_to_order();
