
-- =============================================
-- VALIDAÇÃO DE TRANSIÇÃO DE STATUS DO PEDIDO
-- =============================================

CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid_transitions jsonb;
  v_allowed text[];
  v_has_open_production boolean;
BEGIN
  -- Se o status não mudou, permitir
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Mapa de transições válidas
  v_valid_transitions := jsonb_build_object(
    'rascunho', '["em_negociacao", "aprovado", "cancelado"]',
    'em_negociacao', '["aprovado", "rascunho", "cancelado"]',
    'aprovado', '["liberado_producao", "em_producao", "cancelado"]',
    'liberado_producao', '["em_producao", "cancelado"]',
    'em_producao', '["producao_concluida"]',
    'producao_concluida', '["liberado_faturamento", "faturado"]',
    'liberado_faturamento', '["faturado"]',
    'faturado', '["entregue"]',
    'entregue', '["encerrado"]',
    'encerrado', '[]',
    'cancelado', '["rascunho"]'
  );

  -- Extrair transições permitidas
  SELECT array_agg(val::text) INTO v_allowed
  FROM jsonb_array_elements_text(
    (v_valid_transitions ->> OLD.status)::jsonb
  ) AS val;

  -- Verificar se a transição é válida
  IF v_allowed IS NULL OR NOT (NEW.status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Transição de status inválida: % → %. Transições permitidas: %',
      OLD.status, NEW.status, COALESCE(array_to_string(v_allowed, ', '), 'nenhuma');
  END IF;

  -- TRAVA: Não permitir cancelamento após faturamento
  IF NEW.status = 'cancelado' AND OLD.status IN ('faturado', 'entregue', 'encerrado') THEN
    RAISE EXCEPTION 'Não é possível cancelar pedido após faturamento. Realize a reversão financeira primeiro.';
  END IF;

  -- TRAVA: Bloquear edição estrutural após produção iniciada
  -- (verificado em trigger separado para UPDATE de campos)

  -- Registrar timestamps automáticos por status
  CASE NEW.status
    WHEN 'aprovado' THEN
      NEW.data_aprovacao := COALESCE(NEW.data_aprovacao, now());
      NEW.approved_by := COALESCE(NEW.approved_by, auth.uid());
    WHEN 'faturado' THEN
      NEW.data_faturamento := COALESCE(NEW.data_faturamento, now());
    WHEN 'cancelado' THEN
      NEW.data_cancelamento := now();
    ELSE
      -- noop
  END CASE;

  RETURN NEW;
END;
$$;

-- Trigger BEFORE para validar ANTES de aplicar
DROP TRIGGER IF EXISTS trg_validate_order_status ON public.orders;
CREATE TRIGGER trg_validate_order_status
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_status_transition();

-- =============================================
-- TRAVA: BLOQUEAR EDIÇÃO ESTRUTURAL APÓS PRODUÇÃO
-- =============================================

CREATE OR REPLACE FUNCTION public.block_order_structural_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Bloquear alterações em campos estruturais quando pedido está em produção ou posterior
  IF OLD.status IN ('em_producao', 'producao_concluida', 'liberado_faturamento', 'faturado', 'entregue', 'encerrado') THEN
    -- Permitir apenas alterações em status, notas, e campos de controle
    IF (
      OLD.total_value IS DISTINCT FROM NEW.total_value OR
      OLD.client_id IS DISTINCT FROM NEW.client_id OR
      OLD.forma_pagamento IS DISTINCT FROM NEW.forma_pagamento OR
      OLD.forma_pagamento_2 IS DISTINCT FROM NEW.forma_pagamento_2 OR
      OLD.desconto_valor IS DISTINCT FROM NEW.desconto_valor OR
      OLD.desconto_percentual IS DISTINCT FROM NEW.desconto_percentual
    ) THEN
      -- Permitir se for apenas mudança de status (trigger de status já valida)
      IF OLD.status IS DISTINCT FROM NEW.status THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'Não é possível alterar valores estruturais do pedido após início da produção (status: %)', OLD.status;
    END IF;
  END IF;

  -- Bloquear qualquer alteração em pedidos encerrados
  IF OLD.status = 'encerrado' AND OLD.status = NEW.status THEN
    RAISE EXCEPTION 'Pedido encerrado não permite alterações';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_order_structural_edit ON public.orders;
CREATE TRIGGER trg_block_order_structural_edit
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.block_order_structural_edit();

-- =============================================
-- EXPANDIR on_order_status_change PARA NOVOS STATUS
-- =============================================

CREATE OR REPLACE FUNCTION public.on_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_op_id uuid;
BEGIN
  -- Status: APROVADO → gerar provisões e projeto operacional
  IF NEW.status = 'aprovado' AND OLD.status != 'aprovado' THEN
    -- Registrar evento para gerar provisões financeiras
    PERFORM register_cross_module_event(
      'pedido_aprovado', 'comercial', 'financeiro',
      'orders', NEW.id, NULL, NULL,
      jsonb_build_object(
        'order_number', NEW.order_number,
        'total_value', NEW.total_value,
        'gerar_provisoes', true,
        'gerar_contas_receber_previstas', true,
        'gerar_custos_variaveis_previstos', true
      )
    );

    -- Criar projeto operacional automaticamente
    INSERT INTO public.operational_projects (
      tenant_id, name, client_id, order_id, manager_id, status, created_by
    ) VALUES (
      NEW.tenant_id,
      'Projeto - Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text),
      NEW.client_id,
      NEW.id,
      NEW.vendedor_id,
      'aguardando_liberacao',
      auth.uid()
    ) RETURNING id INTO v_op_id;

    UPDATE public.orders SET operational_project_id = v_op_id WHERE id = NEW.id;
  END IF;

  -- Status: LIBERADO PARA PRODUÇÃO
  IF NEW.status = 'liberado_producao' AND OLD.status != 'liberado_producao' THEN
    -- Atualizar projeto operacional para em execução
    UPDATE public.operational_projects
    SET status = 'em_producao', updated_at = now()
    WHERE order_id = NEW.id AND status = 'aguardando_liberacao';

    PERFORM register_cross_module_event(
      'pedido_liberado_producao', 'comercial', 'operacional',
      'orders', NEW.id, NULL, NULL,
      jsonb_build_object('order_number', NEW.order_number)
    );
  END IF;

  -- Status: EM PRODUÇÃO (quando vem direto de aprovado)
  IF NEW.status = 'em_producao' AND OLD.status NOT IN ('em_producao', 'liberado_producao') THEN
    UPDATE public.operational_projects
    SET status = 'em_producao', updated_at = now()
    WHERE order_id = NEW.id AND status IN ('aguardando_liberacao');
  END IF;

  -- Status: PRODUÇÃO CONCLUÍDA
  IF NEW.status = 'producao_concluida' AND OLD.status != 'producao_concluida' THEN
    UPDATE public.operational_projects
    SET status = 'concluido', actual_end = now()::date, updated_at = now()
    WHERE order_id = NEW.id AND status = 'em_producao';

    PERFORM register_cross_module_event(
      'producao_concluida', 'operacional', 'financeiro',
      'orders', NEW.id, NULL, NULL,
      jsonb_build_object('order_number', NEW.order_number, 'libera_faturamento', true)
    );
  END IF;

  -- Status: FATURADO → gerar receita DRE e confirmar contas a receber
  IF NEW.status = 'faturado' AND OLD.status != 'faturado' THEN
    PERFORM register_cross_module_event(
      'pedido_faturado', 'comercial', 'financeiro',
      'orders', NEW.id, NULL, NULL,
      jsonb_build_object(
        'order_number', NEW.order_number,
        'total_value', NEW.total_value,
        'reconhecer_receita_dre', true,
        'confirmar_contas_receber', true
      )
    );
  END IF;

  -- Status: ENTREGUE → liberar comissão final
  IF NEW.status = 'entregue' AND OLD.status != 'entregue' THEN
    PERFORM register_cross_module_event(
      'pedido_entregue', 'comercial', 'financeiro',
      'orders', NEW.id, NULL, NULL,
      jsonb_build_object(
        'order_number', NEW.order_number,
        'liberar_comissao_final', true
      )
    );

    -- Marcar projeto operacional como entregue
    UPDATE public.operational_projects
    SET status = 'entregue', updated_at = now()
    WHERE order_id = NEW.id AND status = 'concluido';
  END IF;

  -- Status: CANCELADO → reverter tudo
  IF NEW.status = 'cancelado' AND OLD.status != 'cancelado' THEN
    PERFORM register_cross_module_event(
      'pedido_cancelado', 'comercial', 'operacional',
      'orders', NEW.id, NULL, NULL,
      jsonb_build_object('order_number', NEW.order_number, 'cancelar_ordens_producao', true)
    );
    PERFORM register_cross_module_event(
      'pedido_cancelado', 'comercial', 'financeiro',
      'orders', NEW.id, NULL, NULL,
      jsonb_build_object(
        'order_number', NEW.order_number,
        'cancelar_provisoes', true,
        'cancelar_compromissos_venda', true,
        'cancelar_contas_receber', true
      )
    );

    -- Cancelar projetos operacionais vinculados
    UPDATE public.operational_projects
    SET status = 'cancelado', updated_at = now()
    WHERE order_id = NEW.id AND status NOT IN ('concluido', 'entregue');

    -- Cancelar ordens de produção abertas
    UPDATE public.production_orders
    SET status = 'cancelada', updated_at = now()
    WHERE order_item_id IN (
      SELECT id FROM public.order_items WHERE order_id = NEW.id
    ) AND status NOT IN ('concluida', 'cancelada');
  END IF;

  RETURN NEW;
END;
$$;

-- Recriar trigger AFTER
DROP TRIGGER IF EXISTS trg_order_status_change ON public.orders;
CREATE TRIGGER trg_order_status_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.on_order_status_change();

-- =============================================
-- ADICIONAR CAMPOS DE CONTROLE AO PEDIDO
-- =============================================

-- Adicionar campos se não existirem
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'data_faturamento') THEN
    ALTER TABLE public.orders ADD COLUMN data_faturamento timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'data_cancelamento') THEN
    ALTER TABLE public.orders ADD COLUMN data_cancelamento timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'data_entrega_real') THEN
    ALTER TABLE public.orders ADD COLUMN data_entrega_real timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'data_encerramento') THEN
    ALTER TABLE public.orders ADD COLUMN data_encerramento timestamptz;
  END IF;
END $$;
