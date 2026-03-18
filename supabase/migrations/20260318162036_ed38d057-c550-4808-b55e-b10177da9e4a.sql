-- Configuração de categoria por recurso estratégico
CREATE TYPE public.fin_strategic_resource_type AS ENUM (
  'rt',
  'vendedor',
  'orcamentista',
  'projetista',
  'montador',
  'producao'
);

CREATE TABLE public.fin_strategic_resource_account_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type public.fin_strategic_resource_type NOT NULL UNIQUE,
  chart_account_id UUID NULL REFERENCES public.fin_chart_accounts(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fin_strategic_resource_account_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view strategic resource account configs"
ON public.fin_strategic_resource_account_configs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert strategic resource account configs"
ON public.fin_strategic_resource_account_configs
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update strategic resource account configs"
ON public.fin_strategic_resource_account_configs
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete strategic resource account configs"
ON public.fin_strategic_resource_account_configs
FOR DELETE
TO authenticated
USING (true);

CREATE TRIGGER update_fin_strategic_resource_account_configs_updated_at
BEFORE UPDATE ON public.fin_strategic_resource_account_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.fin_strategic_resource_account_configs (resource_type)
VALUES
  ('rt'),
  ('vendedor'),
  ('orcamentista'),
  ('projetista'),
  ('montador'),
  ('producao')
ON CONFLICT (resource_type) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_strategic_resource_chart_account(_resource_type public.fin_strategic_resource_type)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chart_account_id UUID;
BEGIN
  SELECT chart_account_id
  INTO v_chart_account_id
  FROM public.fin_strategic_resource_account_configs
  WHERE resource_type = _resource_type
    AND active = true
  LIMIT 1;

  RETURN v_chart_account_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.require_strategic_resource_chart_account(_resource_type public.fin_strategic_resource_type)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chart_account_id UUID;
  v_resource_label TEXT;
BEGIN
  v_chart_account_id := public.get_strategic_resource_chart_account(_resource_type);

  IF v_chart_account_id IS NULL THEN
    v_resource_label := CASE _resource_type
      WHEN 'rt' THEN 'RT'
      WHEN 'vendedor' THEN 'Vendedor'
      WHEN 'orcamentista' THEN 'Orçamentista'
      WHEN 'projetista' THEN 'Projetista'
      WHEN 'montador' THEN 'Montador'
      WHEN 'producao' THEN 'Produção'
      ELSE _resource_type::text
    END;

    RAISE EXCEPTION 'Categoria financeira não configurada para o recurso estratégico: %', v_resource_label;
  END IF;

  RETURN v_chart_account_id;
END;
$$;

-- Atualiza automação do pedido para preencher chart_account_id automaticamente
CREATE OR REPLACE FUNCTION public.create_receivable_from_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ledger_id uuid;
  v_doc_number text;
  v_competence_date date;
  v_expense_ledger_id uuid;
  v_item record;
  v_item_proportion numeric;
  v_item_count int;
  v_due_date date;
  v_planejados_cc_id uuid;
  v_first_ledger_id uuid;
  v_proj_budget record;
  v_item_project_name text;
  v_resolved_project_id uuid;
  v_resolved_project_name text;
  v_producao_responsavel_id uuid;
  v_rt_chart_account_id uuid;
  v_vendedor_chart_account_id uuid;
  v_orcamentista_chart_account_id uuid;
  v_projetista_chart_account_id uuid;
  v_montador_chart_account_id uuid;
  v_producao_chart_account_id uuid;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status
      AND NEW.status IN ('ativo', 'faturado')
      AND (OLD.status NOT IN ('ativo', 'faturado') OR OLD.status IS NULL)) THEN
    IF EXISTS (SELECT 1 FROM public.fin_receivables WHERE order_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    v_doc_number := 'PED-' || NEW.order_number::text;
    v_competence_date := COALESCE(NEW.data_emissao::date, NOW()::date);
    v_due_date := v_competence_date;
    v_producao_responsavel_id := COALESCE(NEW.comissao_producao_responsible_id, NEW.comissao_producao_responsavel_id);

    IF COALESCE(NEW.rt_habilitado, false) = true AND COALESCE(NEW.rt_valor, 0) > 0 THEN
      v_rt_chart_account_id := public.require_strategic_resource_chart_account('rt');
    END IF;

    IF COALESCE(NEW.comissao_vendedor_valor, 0) > 0 THEN
      v_vendedor_chart_account_id := public.require_strategic_resource_chart_account('vendedor');
    END IF;

    IF COALESCE(NEW.comissao_orcamentista_valor, 0) > 0 THEN
      v_orcamentista_chart_account_id := public.require_strategic_resource_chart_account('orcamentista');
    END IF;

    IF COALESCE(NEW.comissao_projetista_valor, 0) > 0 THEN
      v_projetista_chart_account_id := public.require_strategic_resource_chart_account('projetista');
    END IF;

    IF COALESCE(NEW.comissao_montador_valor, 0) > 0 THEN
      v_montador_chart_account_id := public.require_strategic_resource_chart_account('montador');
    END IF;

    IF COALESCE(NEW.comissao_producao_valor, 0) > 0 THEN
      v_producao_chart_account_id := public.require_strategic_resource_chart_account('producao');
    END IF;

    SELECT id INTO v_planejados_cc_id
    FROM public.fin_cost_centers
    WHERE name = 'Planejados'
    LIMIT 1;

    SELECT COUNT(*) INTO v_item_count
    FROM public.order_items
    WHERE order_id = NEW.id;

    SELECT COALESCE(oi.project_id, NEW.project_id)
    INTO v_resolved_project_id
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
    ORDER BY oi.valor_total DESC NULLS LAST
    LIMIT 1;

    v_resolved_project_id := COALESCE(v_resolved_project_id, NEW.project_id);

    IF v_resolved_project_id IS NOT NULL THEN
      SELECT name INTO v_resolved_project_name
      FROM public.fin_projects
      WHERE id = v_resolved_project_id;
    END IF;

    IF NEW.valor_total IS NOT NULL AND NEW.valor_total > 0 THEN
      v_first_ledger_id := NULL;

      FOR v_item IN
        SELECT
          cc.id as cost_center_id,
          oi.centro_custo as cc_name,
          COALESCE(oi.project_id, NEW.project_id) as proj_id,
          SUM(oi.valor_total) as group_total
        FROM public.order_items oi
        LEFT JOIN public.fin_cost_centers cc ON cc.name = oi.centro_custo
        WHERE oi.order_id = NEW.id
        GROUP BY cc.id, oi.centro_custo, COALESCE(oi.project_id, NEW.project_id)
      LOOP
        v_item_proportion := CASE WHEN NEW.valor_total > 0 THEN v_item.group_total / NEW.valor_total ELSE 0 END;

        v_item_project_name := NULL;
        IF v_item.proj_id IS NOT NULL THEN
          SELECT name INTO v_item_project_name
          FROM public.fin_projects
          WHERE id = v_item.proj_id;
        END IF;

        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, cash_date, document_number,
          party_id, party_type, status, notes, created_by, cost_center_id, project_id, payment_method
        ) VALUES (
          'Pedido #' || NEW.order_number || ' - Receita' ||
          CASE WHEN v_item.cc_name IS NOT NULL THEN ' (' || v_item.cc_name || ')' ELSE '' END,
          ROUND(v_item.group_total::numeric, 2),
          'RECEITA',
          v_competence_date,
          NULL,
          v_doc_number,
          NEW.client_id,
          'client',
          'ABERTO',
          'Receita do Pedido #' || NEW.order_number || CASE WHEN v_item.cc_name IS NOT NULL THEN ' - CC: ' || v_item.cc_name ELSE '' END,
          NEW.created_by,
          v_item.cost_center_id,
          v_item.proj_id,
          NEW.forma_pagamento
        ) RETURNING id INTO v_ledger_id;

        IF v_first_ledger_id IS NULL THEN
          v_first_ledger_id := v_ledger_id;
        END IF;

        INSERT INTO public.fin_receivables (
          order_id, customer_id, amount, due_date, competence_date, status,
          description, document_number, notes, ledger_entry_id, created_by, cost_center_id, project_id
        ) VALUES (
          NEW.id,
          NEW.client_id,
          ROUND(v_item.group_total::numeric, 2),
          COALESCE(NEW.data_primeiro_vencimento::date, v_due_date),
          v_competence_date,
          'ABERTO',
          'Pedido #' || NEW.order_number || CASE WHEN v_item.cc_name IS NOT NULL THEN ' (' || v_item.cc_name || ')' ELSE '' END,
          v_doc_number,
          'Gerado automaticamente a partir do Pedido #' || NEW.order_number,
          v_ledger_id,
          NEW.created_by,
          v_item.cost_center_id,
          v_item.proj_id
        );

        IF COALESCE(NEW.rt_habilitado, false) = true AND COALESCE(NEW.rt_valor, 0) > 0 THEN
          INSERT INTO public.fin_ledger_entries (
            description, amount, type, competence_date, document_number,
            party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id
          ) VALUES (
            'PED #' || NEW.order_number || ' - RT (' || COALESCE(NEW.rt_percentual, 0) || '%)' ||
            CASE WHEN v_item.cc_name IS NOT NULL THEN ' [' || v_item.cc_name || ']' ELSE '' END ||
            CASE WHEN v_item_project_name IS NOT NULL THEN ' - Projeto: ' || v_item_project_name ELSE '' END,
            ROUND((NEW.rt_valor * v_item_proportion)::numeric, 2),
            'DESPESA',
            v_competence_date,
            v_doc_number,
            NEW.client_id,
            'client',
            'ABERTO',
            'RT Pedido #' || NEW.order_number,
            NEW.created_by,
            v_item.cost_center_id,
            v_item.proj_id,
            v_ledger_id,
            v_rt_chart_account_id
          );
        END IF;

        IF COALESCE(NEW.comissao_vendedor_valor, 0) > 0 THEN
          INSERT INTO public.fin_ledger_entries (
            description, amount, type, competence_date, document_number,
            party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id
          ) VALUES (
            'PED #' || NEW.order_number || ' - Comissão Vendedor (' || COALESCE(NEW.comissao_vendedor_percentual, 0) || '%)' ||
            CASE WHEN v_item.cc_name IS NOT NULL THEN ' [' || v_item.cc_name || ']' ELSE '' END ||
            CASE WHEN v_item_project_name IS NOT NULL THEN ' - Projeto: ' || v_item_project_name ELSE '' END,
            ROUND((NEW.comissao_vendedor_valor * v_item_proportion)::numeric, 2),
            'DESPESA',
            v_competence_date,
            v_doc_number,
            NEW.client_id,
            'client',
            'ABERTO',
            'Comissão vendedor Pedido #' || NEW.order_number,
            NEW.created_by,
            v_item.cost_center_id,
            v_item.proj_id,
            v_ledger_id,
            v_vendedor_chart_account_id
          ) RETURNING id INTO v_expense_ledger_id;

          INSERT INTO public.fin_payables (
            amount, due_date, competence_date, status, description, document_number,
            notes, ledger_entry_id, created_by, cost_center_id, project_id, supplier_id, chart_account_id
          ) VALUES (
            ROUND((NEW.comissao_vendedor_valor * v_item_proportion)::numeric, 2),
            v_due_date,
            v_competence_date,
            'ABERTO',
            'PED #' || NEW.order_number || ' - Comissão Vendedor' ||
            CASE WHEN v_item.cc_name IS NOT NULL THEN ' [' || v_item.cc_name || ']' ELSE '' END ||
            CASE WHEN v_item_project_name IS NOT NULL THEN ' - Projeto: ' || v_item_project_name ELSE '' END,
            v_doc_number,
            'Comissão vendedor Pedido #' || NEW.order_number,
            v_expense_ledger_id,
            NEW.created_by,
            v_item.cost_center_id,
            v_item.proj_id,
            NEW.comissao_vendedor_responsavel_id,
            v_vendedor_chart_account_id
          );
        END IF;
      END LOOP;

      IF COALESCE(NEW.comissao_orcamentista_valor, 0) > 0 THEN
        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, document_number,
          party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id
        ) VALUES (
          'PED #' || NEW.order_number || ' - Comissão Orçamentista (' || COALESCE(NEW.comissao_orcamentista_percentual, 0) || '%) [Planejados]' ||
          CASE WHEN v_resolved_project_name IS NOT NULL THEN ' - Projeto: ' || v_resolved_project_name ELSE '' END,
          ROUND(NEW.comissao_orcamentista_valor::numeric, 2),
          'DESPESA',
          v_competence_date,
          v_doc_number,
          NEW.client_id,
          'client',
          'ABERTO',
          'Comissão orçamentista Pedido #' || NEW.order_number,
          NEW.created_by,
          v_planejados_cc_id,
          v_resolved_project_id,
          v_first_ledger_id,
          v_orcamentista_chart_account_id
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          amount, due_date, competence_date, status, description, document_number,
          notes, ledger_entry_id, created_by, cost_center_id, project_id, supplier_id, chart_account_id
        ) VALUES (
          ROUND(NEW.comissao_orcamentista_valor::numeric, 2),
          v_due_date,
          v_competence_date,
          'ABERTO',
          'PED #' || NEW.order_number || ' - Comissão Orçamentista [Planejados]' ||
          CASE WHEN v_resolved_project_name IS NOT NULL THEN ' - Projeto: ' || v_resolved_project_name ELSE '' END,
          v_doc_number,
          'Comissão orçamentista Pedido #' || NEW.order_number,
          v_expense_ledger_id,
          NEW.created_by,
          v_planejados_cc_id,
          v_resolved_project_id,
          NEW.comissao_orcamentista_responsavel_id,
          v_orcamentista_chart_account_id
        );
      END IF;

      IF COALESCE(NEW.comissao_projetista_valor, 0) > 0 THEN
        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, document_number,
          party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id
        ) VALUES (
          'PED #' || NEW.order_number || ' - Comissão Projetista (' || COALESCE(NEW.comissao_projetista_percentual, 0) || '%) [Planejados]' ||
          CASE WHEN v_resolved_project_name IS NOT NULL THEN ' - Projeto: ' || v_resolved_project_name ELSE '' END,
          ROUND(NEW.comissao_projetista_valor::numeric, 2),
          'DESPESA',
          v_competence_date,
          v_doc_number,
          NEW.client_id,
          'client',
          'ABERTO',
          'Comissão projetista Pedido #' || NEW.order_number,
          NEW.created_by,
          v_planejados_cc_id,
          v_resolved_project_id,
          v_first_ledger_id,
          v_projetista_chart_account_id
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          amount, due_date, competence_date, status, description, document_number,
          notes, ledger_entry_id, created_by, cost_center_id, project_id, supplier_id, chart_account_id
        ) VALUES (
          ROUND(NEW.comissao_projetista_valor::numeric, 2),
          v_due_date,
          v_competence_date,
          'ABERTO',
          'PED #' || NEW.order_number || ' - Comissão Projetista [Planejados]' ||
          CASE WHEN v_resolved_project_name IS NOT NULL THEN ' - Projeto: ' || v_resolved_project_name ELSE '' END,
          v_doc_number,
          'Comissão projetista Pedido #' || NEW.order_number,
          v_expense_ledger_id,
          NEW.created_by,
          v_planejados_cc_id,
          v_resolved_project_id,
          NEW.comissao_projetista_responsavel_id,
          v_projetista_chart_account_id
        );
      END IF;

      IF COALESCE(NEW.comissao_montador_valor, 0) > 0 THEN
        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, document_number,
          party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id
        ) VALUES (
          'PED #' || NEW.order_number || ' - Comissão Montador (' || COALESCE(NEW.comissao_montador_percentual, 0) || '%) [Planejados]' ||
          CASE WHEN v_resolved_project_name IS NOT NULL THEN ' - Projeto: ' || v_resolved_project_name ELSE '' END,
          ROUND(NEW.comissao_montador_valor::numeric, 2),
          'DESPESA',
          v_competence_date,
          v_doc_number,
          NEW.client_id,
          'client',
          'ABERTO',
          'Comissão montador Pedido #' || NEW.order_number,
          NEW.created_by,
          v_planejados_cc_id,
          v_resolved_project_id,
          v_first_ledger_id,
          v_montador_chart_account_id
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          amount, due_date, competence_date, status, description, document_number,
          notes, ledger_entry_id, created_by, cost_center_id, project_id, supplier_id, chart_account_id
        ) VALUES (
          ROUND(NEW.comissao_montador_valor::numeric, 2),
          v_due_date,
          v_competence_date,
          'ABERTO',
          'PED #' || NEW.order_number || ' - Comissão Montador [Planejados]' ||
          CASE WHEN v_resolved_project_name IS NOT NULL THEN ' - Projeto: ' || v_resolved_project_name ELSE '' END,
          v_doc_number,
          'Comissão montador Pedido #' || NEW.order_number,
          v_expense_ledger_id,
          NEW.created_by,
          v_planejados_cc_id,
          v_resolved_project_id,
          NEW.comissao_montador_responsavel_id,
          v_montador_chart_account_id
        );
      END IF;

      IF COALESCE(NEW.comissao_producao_valor, 0) > 0 THEN
        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, document_number,
          party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id
        ) VALUES (
          'PED #' || NEW.order_number || ' - Comissão Produção (' || COALESCE(NEW.comissao_producao_percentual, 0) || '%) [Planejados]' ||
          CASE WHEN v_resolved_project_name IS NOT NULL THEN ' - Projeto: ' || v_resolved_project_name ELSE '' END,
          ROUND(NEW.comissao_producao_valor::numeric, 2),
          'DESPESA',
          v_competence_date,
          v_doc_number,
          NEW.client_id,
          'client',
          'ABERTO',
          'Comissão produção Pedido #' || NEW.order_number,
          NEW.created_by,
          v_planejados_cc_id,
          v_resolved_project_id,
          v_first_ledger_id,
          v_producao_chart_account_id
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          amount, due_date, competence_date, status, description, document_number,
          notes, ledger_entry_id, created_by, cost_center_id, project_id, supplier_id, chart_account_id
        ) VALUES (
          ROUND(NEW.comissao_producao_valor::numeric, 2),
          v_due_date,
          v_competence_date,
          'ABERTO',
          'PED #' || NEW.order_number || ' - Comissão Produção [Planejados]' ||
          CASE WHEN v_resolved_project_name IS NOT NULL THEN ' - Projeto: ' || v_resolved_project_name ELSE '' END,
          v_doc_number,
          'Comissão produção Pedido #' || NEW.order_number,
          v_expense_ledger_id,
          NEW.created_by,
          v_planejados_cc_id,
          v_resolved_project_id,
          v_producao_responsavel_id,
          v_producao_chart_account_id
        );
      END IF;

      FOR v_proj_budget IN
        SELECT COALESCE(oi.project_id, NEW.project_id) as proj_id, SUM(oi.valor_total) as proj_total
        FROM public.order_items oi
        WHERE oi.order_id = NEW.id AND COALESCE(oi.project_id, NEW.project_id) IS NOT NULL
        GROUP BY COALESCE(oi.project_id, NEW.project_id)
      LOOP
        UPDATE public.fin_projects
        SET budget = COALESCE(budget, 0) + ROUND((v_proj_budget.proj_total * 0.6)::numeric, 2),
            start_date = COALESCE(start_date, NOW()::date)
        WHERE id = v_proj_budget.proj_id;
      END LOOP;

      IF v_item_count = 0 THEN
        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, cash_date, document_number,
          party_id, party_type, status, notes, created_by, cost_center_id, project_id, payment_method
        ) VALUES (
          'Pedido #' || NEW.order_number || ' - Receita',
          NEW.valor_total,
          'RECEITA',
          v_competence_date,
          NULL,
          v_doc_number,
          NEW.client_id,
          'client',
          'ABERTO',
          'Receita do Pedido #' || NEW.order_number,
          NEW.created_by,
          NULL,
          NEW.project_id,
          NEW.forma_pagamento
        ) RETURNING id INTO v_ledger_id;

        INSERT INTO public.fin_receivables (
          order_id, customer_id, amount, due_date, competence_date, status,
          description, document_number, notes, ledger_entry_id, created_by
        ) VALUES (
          NEW.id,
          NEW.client_id,
          NEW.valor_total,
          COALESCE(NEW.data_primeiro_vencimento::date, v_due_date),
          v_competence_date,
          'ABERTO',
          'Pedido #' || NEW.order_number,
          v_doc_number,
          'Gerado automaticamente a partir do Pedido #' || NEW.order_number,
          v_ledger_id,
          NEW.created_by
        );

        IF NEW.project_id IS NOT NULL AND NEW.valor_total > 0 THEN
          UPDATE public.fin_projects
          SET budget = COALESCE(budget, 0) + ROUND((NEW.valor_total * 0.6)::numeric, 2),
              start_date = COALESCE(start_date, NOW()::date)
          WHERE id = NEW.project_id;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_financial_entries_on_order_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ledger_id uuid;
  v_doc_number text;
  v_competence_date date;
  v_expense_ledger_id uuid;
  v_item record;
  v_item_proportion numeric;
  v_item_count int;
  v_due_date date;
  v_planejados_cc_id uuid;
  v_first_ledger_id uuid;
  v_proj_budget record;
  v_item_project_name text;
  v_resolved_project_id uuid;
  v_resolved_project_name text;
  v_producao_responsavel_id uuid;
  v_rt_chart_account_id uuid;
  v_vendedor_chart_account_id uuid;
  v_orcamentista_chart_account_id uuid;
  v_projetista_chart_account_id uuid;
  v_montador_chart_account_id uuid;
  v_producao_chart_account_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND (
    OLD.valor_total IS DISTINCT FROM NEW.valor_total OR
    OLD.data_primeiro_vencimento IS DISTINCT FROM NEW.data_primeiro_vencimento OR
    OLD.data_emissao IS DISTINCT FROM NEW.data_emissao OR
    OLD.forma_pagamento IS DISTINCT FROM NEW.forma_pagamento OR
    OLD.client_id IS DISTINCT FROM NEW.client_id OR
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.project_id IS DISTINCT FROM NEW.project_id OR
    OLD.comissao_vendedor_percentual IS DISTINCT FROM NEW.comissao_vendedor_percentual OR
    OLD.comissao_vendedor_valor IS DISTINCT FROM NEW.comissao_vendedor_valor OR
    OLD.comissao_vendedor_responsavel_id IS DISTINCT FROM NEW.comissao_vendedor_responsavel_id OR
    OLD.rt_percentual IS DISTINCT FROM NEW.rt_percentual OR
    OLD.rt_valor IS DISTINCT FROM NEW.rt_valor OR
    OLD.rt_habilitado IS DISTINCT FROM NEW.rt_habilitado OR
    OLD.comissao_orcamentista_percentual IS DISTINCT FROM NEW.comissao_orcamentista_percentual OR
    OLD.comissao_orcamentista_valor IS DISTINCT FROM NEW.comissao_orcamentista_valor OR
    OLD.comissao_orcamentista_responsavel_id IS DISTINCT FROM NEW.comissao_orcamentista_responsavel_id OR
    OLD.comissao_projetista_percentual IS DISTINCT FROM NEW.comissao_projetista_percentual OR
    OLD.comissao_projetista_valor IS DISTINCT FROM NEW.comissao_projetista_valor OR
    OLD.comissao_projetista_responsavel_id IS DISTINCT FROM NEW.comissao_projetista_responsavel_id OR
    OLD.comissao_montador_percentual IS DISTINCT FROM NEW.comissao_montador_percentual OR
    OLD.comissao_montador_valor IS DISTINCT FROM NEW.comissao_montador_valor OR
    OLD.comissao_montador_responsavel_id IS DISTINCT FROM NEW.comissao_montador_responsavel_id OR
    OLD.comissao_producao_percentual IS DISTINCT FROM NEW.comissao_producao_percentual OR
    OLD.comissao_producao_valor IS DISTINCT FROM NEW.comissao_producao_valor OR
    COALESCE(OLD.comissao_producao_responsible_id, OLD.comissao_producao_responsavel_id) IS DISTINCT FROM COALESCE(NEW.comissao_producao_responsible_id, NEW.comissao_producao_responsavel_id)
  ) AND NEW.status IN ('ativo', 'faturado') THEN
    DELETE FROM public.fin_payables WHERE order_id = NEW.id;
    DELETE FROM public.fin_receivables WHERE order_id = NEW.id;
    DELETE FROM public.fin_ledger_entries WHERE document_number = 'PED-' || NEW.order_number::text;

    v_doc_number := 'PED-' || NEW.order_number::text;
    v_competence_date := COALESCE(NEW.data_emissao::date, NOW()::date);
    v_due_date := v_competence_date;
    v_producao_responsavel_id := COALESCE(NEW.comissao_producao_responsible_id, NEW.comissao_producao_responsavel_id);

    IF COALESCE(NEW.rt_habilitado, false) = true AND COALESCE(NEW.rt_valor, 0) > 0 THEN
      v_rt_chart_account_id := public.require_strategic_resource_chart_account('rt');
    END IF;

    IF COALESCE(NEW.comissao_vendedor_valor, 0) > 0 THEN
      v_vendedor_chart_account_id := public.require_strategic_resource_chart_account('vendedor');
    END IF;

    IF COALESCE(NEW.comissao_orcamentista_valor, 0) > 0 THEN
      v_orcamentista_chart_account_id := public.require_strategic_resource_chart_account('orcamentista');
    END IF;

    IF COALESCE(NEW.comissao_projetista_valor, 0) > 0 THEN
      v_projetista_chart_account_id := public.require_strategic_resource_chart_account('projetista');
    END IF;

    IF COALESCE(NEW.comissao_montador_valor, 0) > 0 THEN
      v_montador_chart_account_id := public.require_strategic_resource_chart_account('montador');
    END IF;

    IF COALESCE(NEW.comissao_producao_valor, 0) > 0 THEN
      v_producao_chart_account_id := public.require_strategic_resource_chart_account('producao');
    END IF;

    SELECT id INTO v_planejados_cc_id
    FROM public.fin_cost_centers
    WHERE name = 'Planejados'
    LIMIT 1;

    SELECT COUNT(*) INTO v_item_count
    FROM public.order_items
    WHERE order_id = NEW.id;

    SELECT COALESCE(oi.project_id, NEW.project_id)
    INTO v_resolved_project_id
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
    ORDER BY oi.valor_total DESC NULLS LAST
    LIMIT 1;

    v_resolved_project_id := COALESCE(v_resolved_project_id, NEW.project_id);

    IF v_resolved_project_id IS NOT NULL THEN
      SELECT name INTO v_resolved_project_name
      FROM public.fin_projects
      WHERE id = v_resolved_project_id;
    END IF;

    IF NEW.valor_total IS NOT NULL AND NEW.valor_total > 0 THEN
      v_first_ledger_id := NULL;

      FOR v_item IN
        SELECT
          cc.id as cost_center_id,
          oi.centro_custo as cc_name,
          COALESCE(oi.project_id, NEW.project_id) as proj_id,
          SUM(oi.valor_total) as group_total
        FROM public.order_items oi
        LEFT JOIN public.fin_cost_centers cc ON cc.name = oi.centro_custo
        WHERE oi.order_id = NEW.id
        GROUP BY cc.id, oi.centro_custo, COALESCE(oi.project_id, NEW.project_id)
      LOOP
        v_item_proportion := CASE WHEN NEW.valor_total > 0 THEN v_item.group_total / NEW.valor_total ELSE 0 END;

        v_item_project_name := NULL;
        IF v_item.proj_id IS NOT NULL THEN
          SELECT name INTO v_item_project_name
          FROM public.fin_projects
          WHERE id = v_item.proj_id;
        END IF;

        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, cash_date, document_number,
          party_id, party_type, status, notes, created_by, cost_center_id, project_id, payment_method
        ) VALUES (
          'Pedido #' || NEW.order_number || ' - Receita' ||
          CASE WHEN v_item.cc_name IS NOT NULL THEN ' (' || v_item.cc_name || ')' ELSE '' END,
          ROUND(v_item.group_total::numeric, 2),
          'RECEITA',
          v_competence_date,
          NULL,
          v_doc_number,
          NEW.client_id,
          'client',
          'ABERTO',
          'Receita do Pedido #' || NEW.order_number || CASE WHEN v_item.cc_name IS NOT NULL THEN ' - CC: ' || v_item.cc_name ELSE '' END,
          NEW.created_by,
          v_item.cost_center_id,
          v_item.proj_id,
          NEW.forma_pagamento
        ) RETURNING id INTO v_ledger_id;

        IF v_first_ledger_id IS NULL THEN
          v_first_ledger_id := v_ledger_id;
        END IF;

        INSERT INTO public.fin_receivables (
          order_id, customer_id, amount, due_date, competence_date, status,
          description, document_number, notes, ledger_entry_id, created_by, cost_center_id, project_id
        ) VALUES (
          NEW.id,
          NEW.client_id,
          ROUND(v_item.group_total::numeric, 2),
          COALESCE(NEW.data_primeiro_vencimento::date, v_due_date),
          v_competence_date,
          'ABERTO',
          'Pedido #' || NEW.order_number || CASE WHEN v_item.cc_name IS NOT NULL THEN ' (' || v_item.cc_name || ')' ELSE '' END,
          v_doc_number,
          'Gerado automaticamente a partir do Pedido #' || NEW.order_number,
          v_ledger_id,
          NEW.created_by,
          v_item.cost_center_id,
          v_item.proj_id
        );

        IF COALESCE(NEW.rt_habilitado, false) = true AND COALESCE(NEW.rt_valor, 0) > 0 THEN
          INSERT INTO public.fin_ledger_entries (
            description, amount, type, competence_date, document_number,
            party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id
          ) VALUES (
            'PED #' || NEW.order_number || ' - RT (' || COALESCE(NEW.rt_percentual, 0) || '%)' ||
            CASE WHEN v_item.cc_name IS NOT NULL THEN ' [' || v_item.cc_name || ']' ELSE '' END ||
            CASE WHEN v_item_project_name IS NOT NULL THEN ' - Projeto: ' || v_item_project_name ELSE '' END,
            ROUND((NEW.rt_valor * v_item_proportion)::numeric, 2),
            'DESPESA',
            v_competence_date,
            v_doc_number,
            NEW.client_id,
            'client',
            'ABERTO',
            'RT Pedido #' || NEW.order_number,
            NEW.created_by,
            v_item.cost_center_id,
            v_item.proj_id,
            v_ledger_id,
            v_rt_chart_account_id
          );
        END IF;

        IF COALESCE(NEW.comissao_vendedor_valor, 0) > 0 THEN
          INSERT INTO public.fin_ledger_entries (
            description, amount, type, competence_date, document_number,
            party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id
          ) VALUES (
            'PED #' || NEW.order_number || ' - Comissão Vendedor (' || COALESCE(NEW.comissao_vendedor_percentual, 0) || '%)' ||
            CASE WHEN v_item.cc_name IS NOT NULL THEN ' [' || v_item.cc_name || ']' ELSE '' END ||
            CASE WHEN v_item_project_name IS NOT NULL THEN ' - Projeto: ' || v_item_project_name ELSE '' END,
            ROUND((NEW.comissao_vendedor_valor * v_item_proportion)::numeric, 2),
            'DESPESA',
            v_competence_date,
            v_doc_number,
            NEW.client_id,
            'client',
            'ABERTO',
            'Comissão vendedor Pedido #' || NEW.order_number,
            NEW.created_by,
            v_item.cost_center_id,
            v_item.proj_id,
            v_ledger_id,
            v_vendedor_chart_account_id
          ) RETURNING id INTO v_expense_ledger_id;

          INSERT INTO public.fin_payables (
            amount, due_date, competence_date, status, description, document_number,
            notes, ledger_entry_id, created_by, cost_center_id, project_id, supplier_id, chart_account_id, order_id
          ) VALUES (
            ROUND((NEW.comissao_vendedor_valor * v_item_proportion)::numeric, 2),
            v_due_date,
            v_competence_date,
            'ABERTO',
            'PED #' || NEW.order_number || ' - Comissão Vendedor' ||
            CASE WHEN v_item.cc_name IS NOT NULL THEN ' [' || v_item.cc_name || ']' ELSE '' END ||
            CASE WHEN v_item_project_name IS NOT NULL THEN ' - Projeto: ' || v_item_project_name ELSE '' END,
            v_doc_number,
            'Comissão vendedor Pedido #' || NEW.order_number,
            v_expense_ledger_id,
            NEW.created_by,
            v_item.cost_center_id,
            v_item.proj_id,
            NEW.comissao_vendedor_responsavel_id,
            v_vendedor_chart_account_id,
            NEW.id
          );
        END IF;
      END LOOP;

      IF COALESCE(NEW.comissao_orcamentista_valor, 0) > 0 THEN
        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, document_number,
          party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id
        ) VALUES (
          'PED #' || NEW.order_number || ' - Comissão Orçamentista (' || COALESCE(NEW.comissao_orcamentista_percentual, 0) || '%) [Planejados]' ||
          CASE WHEN v_resolved_project_name IS NOT NULL THEN ' - Projeto: ' || v_resolved_project_name ELSE '' END,
          ROUND(NEW.comissao_orcamentista_valor::numeric, 2),
          'DESPESA',
          v_competence_date,
          v_doc_number,
          NEW.client_id,
          'client',
          'ABERTO',
          'Comissão orçamentista Pedido #' || NEW.order_number,
          NEW.created_by,
          v_planejados_cc_id,
          v_resolved_project_id,
          v_first_ledger_id,
          v_orcamentista_chart_account_id
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          amount, due_date, competence_date, status, description, document_number,
          notes, ledger_entry_id, created_by, cost_center_id, project_id, supplier_id, chart_account_id, order_id
        ) VALUES (
          ROUND(NEW.comissao_orcamentista_valor::numeric, 2),
          v_due_date,
          v_competence_date,
          'ABERTO',
          'PED #' || NEW.order_number || ' - Comissão Orçamentista [Planejados]' ||
          CASE WHEN v_resolved_project_name IS NOT NULL THEN ' - Projeto: ' || v_resolved_project_name ELSE '' END,
          v_doc_number,
          'Comissão orçamentista Pedido #' || NEW.order_number,
          v_expense_ledger_id,
          NEW.created_by,
          v_planejados_cc_id,
          v_resolved_project_id,
          NEW.comissao_orcamentista_responsavel_id,
          v_orcamentista_chart_account_id,
          NEW.id
        );
      END IF;

      IF COALESCE(NEW.comissao_projetista_valor, 0) > 0 THEN
        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, document_number,
          party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id
        ) VALUES (
          'PED #' || NEW.order_number || ' - Comissão Projetista (' || COALESCE(NEW.comissao_projetista_percentual, 0) || '%) [Planejados]' ||
          CASE WHEN v_resolved_project_name IS NOT NULL THEN ' - Projeto: ' || v_resolved_project_name ELSE '' END,
          ROUND(NEW.comissao_projetista_valor::numeric, 2),
          'DESPESA',
          v_competence_date,
          v_doc_number,
          NEW.client_id,
          'client',
          'ABERTO',
          'Comissão projetista Pedido #' || NEW.order_number,
          NEW.created_by,
          v_planejados_cc_id,
          v_resolved_project_id,
          v_first_ledger_id,
          v_projetista_chart_account_id
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          amount, due_date, competence_date, status, description, document_number,
          notes, ledger_entry_id, created_by, cost_center_id, project_id, supplier_id, chart_account_id, order_id
        ) VALUES (
          ROUND(NEW.comissao_projetista_valor::numeric, 2),
          v_due_date,
          v_competence_date,
          'ABERTO',
          'PED #' || NEW.order_number || ' - Comissão Projetista [Planejados]' ||
          CASE WHEN v_resolved_project_name IS NOT NULL THEN ' - Projeto: ' || v_resolved_project_name ELSE '' END,
          v_doc_number,
          'Comissão projetista Pedido #' || NEW.order_number,
          v_expense_ledger_id,
          NEW.created_by,
          v_planejados_cc_id,
          v_resolved_project_id,
          NEW.comissao_projetista_responsavel_id,
          v_projetista_chart_account_id,
          NEW.id
        );
      END IF;

      IF COALESCE(NEW.comissao_montador_valor, 0) > 0 THEN
        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, document_number,
          party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id
        ) VALUES (
          'PED #' || NEW.order_number || ' - Comissão Montador (' || COALESCE(NEW.comissao_montador_percentual, 0) || '%) [Planejados]' ||
          CASE WHEN v_resolved_project_name IS NOT NULL THEN ' - Projeto: ' || v_resolved_project_name ELSE '' END,
          ROUND(NEW.comissao_montador_valor::numeric, 2),
          'DESPESA',
          v_competence_date,
          v_doc_number,
          NEW.client_id,
          'client',
          'ABERTO',
          'Comissão montador Pedido #' || NEW.order_number,
          NEW.created_by,
          v_planejados_cc_id,
          v_resolved_project_id,
          v_first_ledger_id,
          v_montador_chart_account_id
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          amount, due_date, competence_date, status, description, document_number,
          notes, ledger_entry_id, created_by, cost_center_id, project_id, supplier_id, chart_account_id, order_id
        ) VALUES (
          ROUND(NEW.comissao_montador_valor::numeric, 2),
          v_due_date,
          v_competence_date,
          'ABERTO',
          'PED #' || NEW.order_number || ' - Comissão Montador [Planejados]' ||
          CASE WHEN v_resolved_project_name IS NOT NULL THEN ' - Projeto: ' || v_resolved_project_name ELSE '' END,
          v_doc_number,
          'Comissão montador Pedido #' || NEW.order_number,
          v_expense_ledger_id,
          NEW.created_by,
          v_planejados_cc_id,
          v_resolved_project_id,
          NEW.comissao_montador_responsavel_id,
          v_montador_chart_account_id,
          NEW.id
        );
      END IF;

      IF COALESCE(NEW.comissao_producao_valor, 0) > 0 THEN
        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, document_number,
          party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id
        ) VALUES (
          'PED #' || NEW.order_number || ' - Comissão Produção (' || COALESCE(NEW.comissao_producao_percentual, 0) || '%) [Planejados]' ||
          CASE WHEN v_resolved_project_name IS NOT NULL THEN ' - Projeto: ' || v_resolved_project_name ELSE '' END,
          ROUND(NEW.comissao_producao_valor::numeric, 2),
          'DESPESA',
          v_competence_date,
          v_doc_number,
          NEW.client_id,
          'client',
          'ABERTO',
          'Comissão produção Pedido #' || NEW.order_number,
          NEW.created_by,
          v_planejados_cc_id,
          v_resolved_project_id,
          v_first_ledger_id,
          v_producao_chart_account_id
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          amount, due_date, competence_date, status, description, document_number,
          notes, ledger_entry_id, created_by, cost_center_id, project_id, supplier_id, chart_account_id, order_id
        ) VALUES (
          ROUND(NEW.comissao_producao_valor::numeric, 2),
          v_due_date,
          v_competence_date,
          'ABERTO',
          'PED #' || NEW.order_number || ' - Comissão Produção [Planejados]' ||
          CASE WHEN v_resolved_project_name IS NOT NULL THEN ' - Projeto: ' || v_resolved_project_name ELSE '' END,
          v_doc_number,
          'Comissão produção Pedido #' || NEW.order_number,
          v_expense_ledger_id,
          NEW.created_by,
          v_planejados_cc_id,
          v_resolved_project_id,
          v_producao_responsavel_id,
          v_producao_chart_account_id,
          NEW.id
        );
      END IF;

      FOR v_proj_budget IN
        SELECT COALESCE(oi.project_id, NEW.project_id) as proj_id, SUM(oi.valor_total) as proj_total
        FROM public.order_items oi
        WHERE oi.order_id = NEW.id AND COALESCE(oi.project_id, NEW.project_id) IS NOT NULL
        GROUP BY COALESCE(oi.project_id, NEW.project_id)
      LOOP
        UPDATE public.fin_projects
        SET budget = COALESCE(budget, 0) + ROUND((v_proj_budget.proj_total * 0.6)::numeric, 2),
            start_date = COALESCE(start_date, NOW()::date)
        WHERE id = v_proj_budget.proj_id;
      END LOOP;

      IF v_item_count = 0 THEN
        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, cash_date, document_number,
          party_id, party_type, status, notes, created_by, cost_center_id, project_id, payment_method
        ) VALUES (
          'Pedido #' || NEW.order_number || ' - Receita',
          NEW.valor_total,
          'RECEITA',
          v_competence_date,
          NULL,
          v_doc_number,
          NEW.client_id,
          'client',
          'ABERTO',
          'Receita do Pedido #' || NEW.order_number,
          NEW.created_by,
          NULL,
          NEW.project_id,
          NEW.forma_pagamento
        ) RETURNING id INTO v_ledger_id;

        INSERT INTO public.fin_receivables (
          order_id, customer_id, amount, due_date, competence_date, status,
          description, document_number, notes, ledger_entry_id, created_by
        ) VALUES (
          NEW.id,
          NEW.client_id,
          NEW.valor_total,
          COALESCE(NEW.data_primeiro_vencimento::date, v_due_date),
          v_competence_date,
          'ABERTO',
          'Pedido #' || NEW.order_number,
          v_doc_number,
          'Gerado automaticamente a partir do Pedido #' || NEW.order_number,
          v_ledger_id,
          NEW.created_by
        );

        IF NEW.project_id IS NOT NULL AND NEW.valor_total > 0 THEN
          UPDATE public.fin_projects
          SET budget = COALESCE(budget, 0) + ROUND((NEW.valor_total * 0.6)::numeric, 2),
              start_date = COALESCE(start_date, NOW()::date)
          WHERE id = NEW.project_id;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;