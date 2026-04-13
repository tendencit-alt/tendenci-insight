
-- 1. Create fin_event_automation_rules table
CREATE TABLE IF NOT EXISTS public.fin_event_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL, -- pedido_criado, pedido_aprovado, pedido_cancelado, producao_iniciada, producao_concluida, pedido_faturado, pedido_entregue, recebimento_confirmado, pagamento_confirmado, extrato_conciliado, meta_nao_atingida, limite_despesa_excedido
  condition_field text, -- campo a avaliar (ex: valor, margem, centro_custo)
  condition_operator text, -- equals, not_equals, greater_than, less_than, contains, starts_with
  condition_value text, -- valor de comparação
  action_type text NOT NULL, -- classificar_categoria, classificar_centro_custo, classificar_projeto, criar_projeto_financeiro, gerar_compromisso_venda, gerar_contas_receber, gerar_contas_pagar, ratear_despesa, bloquear_operacao, gerar_alerta, heranca_classificacao, conciliar_automatico
  action_config jsonb NOT NULL DEFAULT '{}', -- configuração específica da ação
  priority integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  description text,
  cost_center_id uuid REFERENCES public.fin_cost_centers(id),
  project_id uuid REFERENCES public.fin_projects(id),
  chart_account_id uuid REFERENCES public.fin_chart_accounts(id),
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  tenant_id uuid REFERENCES public.tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_fin_event_rules_event ON public.fin_event_automation_rules(event_type, active);
CREATE INDEX IF NOT EXISTS idx_fin_event_rules_tenant ON public.fin_event_automation_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_event_rules_priority ON public.fin_event_automation_rules(priority);

ALTER TABLE public.fin_event_automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view fin_event_automation_rules" ON public.fin_event_automation_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fin_event_automation_rules" ON public.fin_event_automation_rules
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fin_event_automation_rules" ON public.fin_event_automation_rules
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete fin_event_automation_rules" ON public.fin_event_automation_rules
  FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_fin_event_automation_rules_updated_at BEFORE UPDATE ON public.fin_event_automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Create fin_automation_logs table
CREATE TABLE IF NOT EXISTS public.fin_automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.fin_event_automation_rules(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  source_table text,
  source_id uuid,
  action_type text NOT NULL,
  action_result jsonb,
  status text NOT NULL DEFAULT 'sucesso', -- sucesso, erro, ignorado, bloqueado
  error_message text,
  execution_time_ms integer,
  user_id uuid,
  created_at timestamptz DEFAULT now(),
  tenant_id uuid REFERENCES public.tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_fin_auto_logs_event ON public.fin_automation_logs(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fin_auto_logs_status ON public.fin_automation_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fin_auto_logs_tenant ON public.fin_automation_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_auto_logs_rule ON public.fin_automation_logs(rule_id);

ALTER TABLE public.fin_automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view fin_automation_logs" ON public.fin_automation_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fin_automation_logs" ON public.fin_automation_logs
  FOR INSERT TO authenticated WITH CHECK (true);
