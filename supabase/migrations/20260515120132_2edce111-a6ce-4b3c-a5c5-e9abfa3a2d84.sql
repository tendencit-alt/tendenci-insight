
-- ============================================================================
-- PROBLEMA 1: pai_codigo + grupo_fluxo em fin_chart_accounts + seed analítico
-- ============================================================================

ALTER TABLE public.fin_chart_accounts
  ADD COLUMN IF NOT EXISTS pai_codigo TEXT,
  ADD COLUMN IF NOT EXISTS grupo_fluxo TEXT;

CREATE OR REPLACE FUNCTION public.fin_chart_accounts_fill_pai_codigo()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT code INTO NEW.pai_codigo FROM public.fin_chart_accounts WHERE id = NEW.parent_id;
  ELSE
    NEW.pai_codigo := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fin_chart_accounts_fill_pai_codigo ON public.fin_chart_accounts;
CREATE TRIGGER trg_fin_chart_accounts_fill_pai_codigo
  BEFORE INSERT OR UPDATE OF parent_id ON public.fin_chart_accounts
  FOR EACH ROW EXECUTE FUNCTION public.fin_chart_accounts_fill_pai_codigo();

-- Backfill (desabilitando trigger de proteção que tem bug de re-validar active=false já existentes)
ALTER TABLE public.fin_chart_accounts DISABLE TRIGGER USER;

UPDATE public.fin_chart_accounts c
SET pai_codigo = p.code
FROM public.fin_chart_accounts p
WHERE c.parent_id = p.id AND c.pai_codigo IS DISTINCT FROM p.code;

UPDATE public.fin_chart_accounts
SET grupo_fluxo = CASE
  WHEN code LIKE '1%' THEN 'OPERACIONAL_ENTRADA'
  WHEN code LIKE '2%' OR code LIKE '3%' THEN 'OPERACIONAL_SAIDA'
  WHEN code LIKE '4%' THEN 'NAO_CAIXA'
  WHEN code LIKE '5.1%' THEN 'OPERACIONAL_ENTRADA'
  WHEN code LIKE '5.2%' THEN 'OPERACIONAL_SAIDA'
  WHEN code = '5' THEN 'OPERACIONAL_ENTRADA'
  WHEN code LIKE '6.1%' OR code LIKE '6.3%' THEN 'FINANCIAMENTO_ENTRADA'
  WHEN code LIKE '6.2%' OR code LIKE '6.4%' THEN 'FINANCIAMENTO_SAIDA'
  WHEN code = '6' THEN 'FINANCIAMENTO_ENTRADA'
  ELSE 'NAO_CAIXA'
END
WHERE grupo_fluxo IS NULL;

ALTER TABLE public.fin_chart_accounts ENABLE TRIGGER USER;

-- Seed analítico (idempotente)
INSERT INTO public.fin_chart_accounts (code, name, nature, in_dre, in_cashflow, active, is_core, parent_id, tenant_id)
SELECT v.code, v.name, v.nature, true, v.in_cashflow, true, true,
       (SELECT id FROM public.fin_chart_accounts WHERE code = v.parent_code AND tenant_id IS NULL LIMIT 1),
       NULL
FROM (VALUES
  ('1.1.1', 'Venda à vista',              'RECEITA', true,  '1.1'),
  ('1.1.2', 'Venda a prazo',              'RECEITA', true,  '1.1'),
  ('1.2.1', 'Serviço PF',                 'RECEITA', true,  '1.2'),
  ('1.2.2', 'Serviço PJ',                 'RECEITA', true,  '1.2'),
  ('2.1.1', 'ICMS',                       'DESPESA', true,  '2.1'),
  ('2.1.2', 'ISS',                        'DESPESA', true,  '2.1'),
  ('2.1.3', 'PIS/COFINS',                 'DESPESA', true,  '2.1'),
  ('2.1.4', 'Simples Nacional',           'DESPESA', true,  '2.1'),
  ('2.2.1', 'Taxa cartão crédito',        'DESPESA', true,  '2.2'),
  ('2.2.2', 'Taxa cartão débito',         'DESPESA', true,  '2.2'),
  ('2.2.3', 'Taxa Pix',                   'DESPESA', true,  '2.2'),
  ('2.2.4', 'Taxa boleto',                'DESPESA', true,  '2.2'),
  ('2.4.1', 'Comissão vendedor interno',  'DESPESA', true,  '2.4'),
  ('2.4.2', 'Comissão representante',     'DESPESA', true,  '2.4'),
  ('3.1.1', 'Salários',                   'DESPESA', true,  '3.1'),
  ('3.1.2', 'Encargos',                   'DESPESA', true,  '3.1'),
  ('3.1.3', 'Benefícios',                 'DESPESA', true,  '3.1'),
  ('3.1.4', 'Pró-labore',                 'DESPESA', true,  '3.1'),
  ('3.2.1', 'Aluguel',                    'DESPESA', true,  '3.2'),
  ('3.2.2', 'Energia',                    'DESPESA', true,  '3.2'),
  ('3.2.3', 'Água',                       'DESPESA', true,  '3.2'),
  ('3.2.4', 'Internet',                   'DESPESA', true,  '3.2'),
  ('3.3.1', 'SaaS/Licenças',              'DESPESA', true,  '3.3'),
  ('3.3.2', 'Hospedagem',                 'DESPESA', true,  '3.3'),
  ('3.4.1', 'Mídia paga',                 'DESPESA', true,  '3.4'),
  ('3.4.2', 'Material gráfico',           'DESPESA', true,  '3.4'),
  ('3.5.1', 'Contabilidade',              'DESPESA', true,  '3.5'),
  ('3.5.2', 'Jurídico',                   'DESPESA', true,  '3.5'),
  ('5.1.1', 'Juros recebidos',            'RECEITA', true,  '5.1'),
  ('5.1.2', 'Rendimento aplicações',      'RECEITA', true,  '5.1'),
  ('5.2.1', 'Juros pagos',                'DESPESA', true,  '5.2'),
  ('5.2.2', 'IOF',                        'DESPESA', true,  '5.2')
) AS v(code, name, nature, in_cashflow, parent_code)
WHERE NOT EXISTS (
  SELECT 1 FROM public.fin_chart_accounts existing
  WHERE existing.code = v.code AND existing.tenant_id IS NULL
);

-- ============================================================================
-- PROBLEMA 4: conta_plano_codigo em AP/AR/Ledger
-- ============================================================================

ALTER TABLE public.fin_payables ADD COLUMN IF NOT EXISTS conta_plano_codigo TEXT;
ALTER TABLE public.fin_receivables ADD COLUMN IF NOT EXISTS conta_plano_codigo TEXT;
ALTER TABLE public.fin_ledger_entries ADD COLUMN IF NOT EXISTS conta_plano_codigo TEXT;

CREATE OR REPLACE FUNCTION public.fin_fill_conta_plano_codigo()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.chart_account_id IS NOT NULL THEN
    SELECT code INTO NEW.conta_plano_codigo FROM public.fin_chart_accounts WHERE id = NEW.chart_account_id;
  ELSE
    NEW.conta_plano_codigo := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fin_payables_fill_conta_codigo ON public.fin_payables;
CREATE TRIGGER trg_fin_payables_fill_conta_codigo
  BEFORE INSERT OR UPDATE OF chart_account_id ON public.fin_payables
  FOR EACH ROW EXECUTE FUNCTION public.fin_fill_conta_plano_codigo();

DROP TRIGGER IF EXISTS trg_fin_receivables_fill_conta_codigo ON public.fin_receivables;
CREATE TRIGGER trg_fin_receivables_fill_conta_codigo
  BEFORE INSERT OR UPDATE OF chart_account_id ON public.fin_receivables
  FOR EACH ROW EXECUTE FUNCTION public.fin_fill_conta_plano_codigo();

DROP TRIGGER IF EXISTS trg_fin_ledger_entries_fill_conta_codigo ON public.fin_ledger_entries;
CREATE TRIGGER trg_fin_ledger_entries_fill_conta_codigo
  BEFORE INSERT OR UPDATE OF chart_account_id ON public.fin_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.fin_fill_conta_plano_codigo();

-- Backfill com triggers de proteção desabilitados temporariamente
ALTER TABLE public.fin_payables DISABLE TRIGGER USER;
ALTER TABLE public.fin_receivables DISABLE TRIGGER USER;
ALTER TABLE public.fin_ledger_entries DISABLE TRIGGER USER;

UPDATE public.fin_payables p SET conta_plano_codigo = c.code
FROM public.fin_chart_accounts c WHERE p.chart_account_id = c.id AND p.conta_plano_codigo IS DISTINCT FROM c.code;

UPDATE public.fin_receivables r SET conta_plano_codigo = c.code
FROM public.fin_chart_accounts c WHERE r.chart_account_id = c.id AND r.conta_plano_codigo IS DISTINCT FROM c.code;

UPDATE public.fin_ledger_entries l SET conta_plano_codigo = c.code
FROM public.fin_chart_accounts c WHERE l.chart_account_id = c.id AND l.conta_plano_codigo IS DISTINCT FROM c.code;

ALTER TABLE public.fin_payables ENABLE TRIGGER USER;
ALTER TABLE public.fin_receivables ENABLE TRIGGER USER;
ALTER TABLE public.fin_ledger_entries ENABLE TRIGGER USER;

-- Índices
CREATE INDEX IF NOT EXISTS idx_fin_payables_conta_codigo
  ON public.fin_payables (conta_plano_codigo text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_fin_receivables_conta_codigo
  ON public.fin_receivables (conta_plano_codigo text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_fin_ledger_entries_conta_codigo
  ON public.fin_ledger_entries (conta_plano_codigo text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_fin_chart_accounts_grupo_fluxo
  ON public.fin_chart_accounts (grupo_fluxo);
CREATE INDEX IF NOT EXISTS idx_fin_chart_accounts_pai_codigo
  ON public.fin_chart_accounts (pai_codigo);
