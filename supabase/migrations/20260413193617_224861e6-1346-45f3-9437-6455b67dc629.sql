
-- =============================================
-- NOVOS CAMPOS PARA RASTREAMENTO DE STATUS
-- =============================================

-- fin_payables
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_payables' AND column_name = 'origem') THEN
    ALTER TABLE public.fin_payables ADD COLUMN origem text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_payables' AND column_name = 'motivo_cancelamento') THEN
    ALTER TABLE public.fin_payables ADD COLUMN motivo_cancelamento text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_payables' AND column_name = 'cancelado_por') THEN
    ALTER TABLE public.fin_payables ADD COLUMN cancelado_por uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_payables' AND column_name = 'cancelado_em') THEN
    ALTER TABLE public.fin_payables ADD COLUMN cancelado_em timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_payables' AND column_name = 'conciliado_em') THEN
    ALTER TABLE public.fin_payables ADD COLUMN conciliado_em timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_payables' AND column_name = 'conciliado_por') THEN
    ALTER TABLE public.fin_payables ADD COLUMN conciliado_por uuid;
  END IF;
END $$;

-- fin_receivables
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_receivables' AND column_name = 'origem') THEN
    ALTER TABLE public.fin_receivables ADD COLUMN origem text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_receivables' AND column_name = 'motivo_cancelamento') THEN
    ALTER TABLE public.fin_receivables ADD COLUMN motivo_cancelamento text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_receivables' AND column_name = 'cancelado_por') THEN
    ALTER TABLE public.fin_receivables ADD COLUMN cancelado_por uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_receivables' AND column_name = 'cancelado_em') THEN
    ALTER TABLE public.fin_receivables ADD COLUMN cancelado_em timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_receivables' AND column_name = 'conciliado_em') THEN
    ALTER TABLE public.fin_receivables ADD COLUMN conciliado_em timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_receivables' AND column_name = 'conciliado_por') THEN
    ALTER TABLE public.fin_receivables ADD COLUMN conciliado_por uuid;
  END IF;
END $$;

-- fin_ledger_entries
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_ledger_entries' AND column_name = 'origem') THEN
    ALTER TABLE public.fin_ledger_entries ADD COLUMN origem text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_ledger_entries' AND column_name = 'motivo_cancelamento') THEN
    ALTER TABLE public.fin_ledger_entries ADD COLUMN motivo_cancelamento text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_ledger_entries' AND column_name = 'cancelado_por') THEN
    ALTER TABLE public.fin_ledger_entries ADD COLUMN cancelado_por uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_ledger_entries' AND column_name = 'cancelado_em') THEN
    ALTER TABLE public.fin_ledger_entries ADD COLUMN cancelado_em timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_ledger_entries' AND column_name = 'conciliado_em') THEN
    ALTER TABLE public.fin_ledger_entries ADD COLUMN conciliado_em timestamptz;
  END IF;
END $$;

-- =============================================
-- VALIDAÇÃO DE TRANSIÇÃO DE STATUS - CONTAS A PAGAR
-- =============================================

CREATE OR REPLACE FUNCTION public.validate_payable_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid_transitions jsonb;
  v_allowed text[];
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Bloquear qualquer alteração em título conciliado
  IF OLD.status = 'CONCILIADO' THEN
    RAISE EXCEPTION 'Título conciliado não pode ser alterado';
  END IF;

  -- Mapa de transições válidas
  -- ABERTO é sinônimo retrocompatível de PROVISIONADO
  v_valid_transitions := jsonb_build_object(
    'ABERTO', '["CONFIRMADO", "PROVISIONADO", "PAGO", "CANCELADO"]',
    'PROVISIONADO', '["CONFIRMADO", "CANCELADO"]',
    'CONFIRMADO', '["PAGO", "PARCIALMENTE_PAGO", "CANCELADO", "EM_DISPUTA", "RENEGOCIADO"]',
    'VENCIDO', '["PAGO", "PARCIALMENTE_PAGO", "CANCELADO", "EM_DISPUTA", "RENEGOCIADO"]',
    'PARCIALMENTE_PAGO', '["PAGO", "CANCELADO", "EM_DISPUTA"]',
    'PAGO', '["CONCILIADO", "ABERTO"]',
    'EM_DISPUTA', '["CONFIRMADO", "CANCELADO", "PAGO"]',
    'RENEGOCIADO', '["CONFIRMADO", "CANCELADO"]',
    'CANCELADO', '["PROVISIONADO"]',
    'CONCILIADO', '[]'
  );

  SELECT array_agg(val::text) INTO v_allowed
  FROM jsonb_array_elements_text(
    COALESCE((v_valid_transitions ->> OLD.status)::jsonb, '[]'::jsonb)
  ) AS val;

  IF v_allowed IS NULL OR NOT (NEW.status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Transição de status inválida para conta a pagar: % → %. Permitidas: %',
      OLD.status, NEW.status, COALESCE(array_to_string(v_allowed, ', '), 'nenhuma');
  END IF;

  -- Não permitir conciliar sem pagamento
  IF NEW.status = 'CONCILIADO' AND OLD.status != 'PAGO' THEN
    RAISE EXCEPTION 'Não é possível conciliar sem pagamento registrado';
  END IF;

  -- Registrar metadados automáticos
  IF NEW.status = 'CANCELADO' THEN
    NEW.cancelado_em := now();
    NEW.cancelado_por := auth.uid();
  END IF;

  IF NEW.status = 'CONCILIADO' THEN
    NEW.conciliado_em := now();
    NEW.conciliado_por := auth.uid();
    NEW.reconciled := true;
  END IF;

  IF NEW.status = 'PAGO' AND OLD.status != 'PAGO' THEN
    NEW.payment_date := COALESCE(NEW.payment_date, now()::date);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_payable_status ON public.fin_payables;
CREATE TRIGGER trg_validate_payable_status
  BEFORE UPDATE OF status ON public.fin_payables
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_payable_status_transition();

-- =============================================
-- BLOQUEAR EDIÇÃO EM TÍTULO CONCILIADO (PAYABLES)
-- =============================================

CREATE OR REPLACE FUNCTION public.block_conciliated_payable_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'CONCILIADO' AND OLD.status = NEW.status THEN
    RAISE EXCEPTION 'Título conciliado não permite alterações';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_conciliated_payable ON public.fin_payables;
CREATE TRIGGER trg_block_conciliated_payable
  BEFORE UPDATE ON public.fin_payables
  FOR EACH ROW
  WHEN (OLD.status = 'CONCILIADO')
  EXECUTE FUNCTION public.block_conciliated_payable_edit();

-- Bloquear exclusão de título conciliado
CREATE OR REPLACE FUNCTION public.block_conciliated_payable_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'CONCILIADO' THEN
    RAISE EXCEPTION 'Título conciliado não pode ser excluído';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_conciliated_payable_delete ON public.fin_payables;
CREATE TRIGGER trg_block_conciliated_payable_delete
  BEFORE DELETE ON public.fin_payables
  FOR EACH ROW
  EXECUTE FUNCTION public.block_conciliated_payable_delete();

-- =============================================
-- VALIDAÇÃO DE TRANSIÇÃO DE STATUS - CONTAS A RECEBER
-- =============================================

CREATE OR REPLACE FUNCTION public.validate_receivable_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid_transitions jsonb;
  v_allowed text[];
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'CONCILIADO' THEN
    RAISE EXCEPTION 'Título conciliado não pode ser alterado';
  END IF;

  v_valid_transitions := jsonb_build_object(
    'ABERTO', '["CONFIRMADO", "PROVISIONADO", "RECEBIDO", "CANCELADO"]',
    'PROVISIONADO', '["CONFIRMADO", "CANCELADO"]',
    'CONFIRMADO', '["RECEBIDO", "PARCIALMENTE_RECEBIDO", "CANCELADO", "EM_DISPUTA", "RENEGOCIADO"]',
    'VENCIDO', '["RECEBIDO", "PARCIALMENTE_RECEBIDO", "CANCELADO", "EM_DISPUTA", "RENEGOCIADO"]',
    'PARCIALMENTE_RECEBIDO', '["RECEBIDO", "CANCELADO", "EM_DISPUTA"]',
    'RECEBIDO', '["CONCILIADO", "ABERTO"]',
    'EM_DISPUTA', '["CONFIRMADO", "CANCELADO", "RECEBIDO"]',
    'RENEGOCIADO', '["CONFIRMADO", "CANCELADO"]',
    'CANCELADO', '["PROVISIONADO"]',
    'CONCILIADO', '[]'
  );

  SELECT array_agg(val::text) INTO v_allowed
  FROM jsonb_array_elements_text(
    COALESCE((v_valid_transitions ->> OLD.status)::jsonb, '[]'::jsonb)
  ) AS val;

  IF v_allowed IS NULL OR NOT (NEW.status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Transição de status inválida para conta a receber: % → %. Permitidas: %',
      OLD.status, NEW.status, COALESCE(array_to_string(v_allowed, ', '), 'nenhuma');
  END IF;

  IF NEW.status = 'CONCILIADO' AND OLD.status != 'RECEBIDO' THEN
    RAISE EXCEPTION 'Não é possível conciliar sem recebimento registrado';
  END IF;

  IF NEW.status = 'CANCELADO' THEN
    NEW.cancelado_em := now();
    NEW.cancelado_por := auth.uid();
  END IF;

  IF NEW.status = 'CONCILIADO' THEN
    NEW.conciliado_em := now();
    NEW.conciliado_por := auth.uid();
    NEW.reconciled := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_receivable_status ON public.fin_receivables;
CREATE TRIGGER trg_validate_receivable_status
  BEFORE UPDATE OF status ON public.fin_receivables
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_receivable_status_transition();

-- =============================================
-- BLOQUEAR EDIÇÃO/EXCLUSÃO EM TÍTULO CONCILIADO (RECEIVABLES)
-- =============================================

CREATE OR REPLACE FUNCTION public.block_conciliated_receivable_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'CONCILIADO' AND OLD.status = NEW.status THEN
    RAISE EXCEPTION 'Título conciliado não permite alterações';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_conciliated_receivable ON public.fin_receivables;
CREATE TRIGGER trg_block_conciliated_receivable
  BEFORE UPDATE ON public.fin_receivables
  FOR EACH ROW
  WHEN (OLD.status = 'CONCILIADO')
  EXECUTE FUNCTION public.block_conciliated_receivable_edit();

CREATE OR REPLACE FUNCTION public.block_conciliated_receivable_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'CONCILIADO' THEN
    RAISE EXCEPTION 'Título conciliado não pode ser excluído';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_conciliated_receivable_delete ON public.fin_receivables;
CREATE TRIGGER trg_block_conciliated_receivable_delete
  BEFORE DELETE ON public.fin_receivables
  FOR EACH ROW
  EXECUTE FUNCTION public.block_conciliated_receivable_delete();

-- =============================================
-- VALIDAÇÃO DE TRANSIÇÃO DE STATUS - LEDGER ENTRIES
-- =============================================

CREATE OR REPLACE FUNCTION public.validate_ledger_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid_transitions jsonb;
  v_allowed text[];
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_valid_transitions := jsonb_build_object(
    'ABERTO', '["PAGO_RECEBIDO", "CANCELADO", "VENCIDO"]',
    'VENCIDO', '["PAGO_RECEBIDO", "CANCELADO"]',
    'PAGO_RECEBIDO', '["CONCILIADO", "ABERTO"]',
    'CONCILIADO', '[]',
    'CANCELADO', '["ABERTO"]'
  );

  SELECT array_agg(val::text) INTO v_allowed
  FROM jsonb_array_elements_text(
    COALESCE((v_valid_transitions ->> OLD.status)::jsonb, '[]'::jsonb)
  ) AS val;

  IF v_allowed IS NULL OR NOT (NEW.status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Transição de status inválida no razão: % → %. Permitidas: %',
      OLD.status, NEW.status, COALESCE(array_to_string(v_allowed, ', '), 'nenhuma');
  END IF;

  IF NEW.status = 'CANCELADO' THEN
    NEW.cancelado_em := now();
    NEW.cancelado_por := auth.uid();
  END IF;

  IF NEW.status = 'CONCILIADO' THEN
    NEW.conciliado_em := now();
    NEW.reconciled := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_ledger_status ON public.fin_ledger_entries;
CREATE TRIGGER trg_validate_ledger_status
  BEFORE UPDATE OF status ON public.fin_ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_ledger_status_transition();

-- Bloquear edição/exclusão de lançamento conciliado no razão
CREATE OR REPLACE FUNCTION public.block_conciliated_ledger_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'CONCILIADO' AND OLD.status = NEW.status THEN
    RAISE EXCEPTION 'Lançamento conciliado não permite alterações';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_conciliated_ledger ON public.fin_ledger_entries;
CREATE TRIGGER trg_block_conciliated_ledger
  BEFORE UPDATE ON public.fin_ledger_entries
  FOR EACH ROW
  WHEN (OLD.status = 'CONCILIADO')
  EXECUTE FUNCTION public.block_conciliated_ledger_edit();

CREATE OR REPLACE FUNCTION public.block_conciliated_ledger_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'CONCILIADO' THEN
    RAISE EXCEPTION 'Lançamento conciliado não pode ser excluído';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_conciliated_ledger_delete ON public.fin_ledger_entries;
CREATE TRIGGER trg_block_conciliated_ledger_delete
  BEFORE DELETE ON public.fin_ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.block_conciliated_ledger_delete();
