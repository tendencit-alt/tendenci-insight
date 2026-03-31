
-- Fix: Map order item centro_custo to fin_cost_centers in ledger entries and receivables
CREATE OR REPLACE FUNCTION public.create_receivable_from_order()
RETURNS TRIGGER AS $$
DECLARE
  v_ledger_id uuid;
  v_cost_center_id uuid;
  v_centro_custo_name text;
BEGIN
  IF (
    (TG_OP = 'INSERT' AND NEW.status IN ('ativo', 'faturado', 'em_producao'))
    OR 
    (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status 
      AND NEW.status IN ('ativo', 'faturado', 'em_producao')
      AND (OLD.status NOT IN ('ativo', 'faturado', 'em_producao') OR OLD.status IS NULL))
  ) THEN
    IF EXISTS (SELECT 1 FROM public.fin_receivables WHERE order_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    -- Get centro_custo from first order item and map to fin_cost_centers
    SELECT oi.centro_custo INTO v_centro_custo_name
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
    LIMIT 1;

    IF v_centro_custo_name IS NOT NULL THEN
      SELECT id INTO v_cost_center_id
      FROM public.fin_cost_centers
      WHERE LOWER(name) = LOWER(v_centro_custo_name)
         OR LOWER(name) = LOWER(
           CASE v_centro_custo_name
             WHEN 'moveis_planejados' THEN 'Planejados'
             WHEN 'producao_tendenci' THEN 'Produção Tendenci'
             WHEN 'revenda' THEN 'Revenda'
             ELSE v_centro_custo_name
           END
         )
      LIMIT 1;
    END IF;

    IF NEW.valor_total IS NOT NULL AND NEW.valor_total > 0 THEN
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date,
        document_number, party_id, party_type, status, notes, created_by,
        cost_center_id, project_id
      ) VALUES (
        'Pedido #' || NEW.order_number,
        NEW.valor_total, 'RECEITA',
        COALESCE(NEW.data_emissao::date, NOW()::date), NULL,
        'PED-' || NEW.order_number::text, NEW.client_id, 'client',
        'ABERTO', 'Gerado automaticamente a partir do Pedido #' || NEW.order_number,
        NEW.created_by,
        v_cost_center_id, NEW.project_id
      ) RETURNING id INTO v_ledger_id;

      INSERT INTO public.fin_receivables (
        order_id, customer_id, amount, due_date, competence_date,
        status, description, document_number, notes, ledger_entry_id, created_by,
        cost_center_id, project_id
      ) VALUES (
        NEW.id, NEW.client_id, NEW.valor_total,
        COALESCE(NEW.data_primeiro_vencimento::date, (NOW() + interval '30 days')::date),
        COALESCE(NEW.data_emissao::date, NOW()::date), 'ABERTO',
        'Pedido #' || NEW.order_number, 'PED-' || NEW.order_number::text,
        'Gerado automaticamente a partir do Pedido #' || NEW.order_number,
        v_ledger_id, NEW.created_by,
        v_cost_center_id, NEW.project_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
