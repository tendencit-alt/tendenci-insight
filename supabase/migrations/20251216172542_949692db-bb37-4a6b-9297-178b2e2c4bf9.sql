-- Função para calcular dias úteis reais (exclui sábado e domingo)
CREATE OR REPLACE FUNCTION calculate_business_days(start_date TIMESTAMPTZ)
RETURNS INTEGER AS $$
DECLARE
  business_days INTEGER := 0;
  current_day DATE;
BEGIN
  IF start_date IS NULL THEN RETURN 0; END IF;
  
  current_day := start_date::DATE;
  WHILE current_day < CURRENT_DATE LOOP
    -- Exclui sábado (6) e domingo (0)
    IF EXTRACT(DOW FROM current_day) NOT IN (0, 6) THEN
      business_days := business_days + 1;
    END IF;
    current_day := current_day + 1;
  END LOOP;
  
  RETURN business_days;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public;

-- Tabela de automações de produção
CREATE TABLE production_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('sla_etapa', 'alerta_prazo', 'escalonar_prioridade', 'notificacao')),
  production_type_id UUID REFERENCES production_types(id) ON DELETE CASCADE,
  phase_template_id UUID REFERENCES production_phase_templates(id) ON DELETE CASCADE,
  prazo_dias_uteis INTEGER,
  prazo_horas INTEGER,
  acao_tipo TEXT CHECK (acao_tipo IN ('gerar_alerta', 'mudar_prioridade', 'notificar_responsavel', 'notificar_usuario')),
  acao_config JSONB DEFAULT '{}',
  ativa BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de logs de execução de automações
CREATE TABLE production_automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES production_automations(id) ON DELETE CASCADE,
  production_order_id UUID REFERENCES production_orders(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES production_phases(id) ON DELETE SET NULL,
  tipo_execucao TEXT NOT NULL,
  detalhes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE production_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_automation_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para production_automations
CREATE POLICY "Autenticados leem automações" ON production_automations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Masters criam automações" ON production_automations
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Masters atualizam automações" ON production_automations
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Masters deletam automações" ON production_automations
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Políticas RLS para production_automation_logs
CREATE POLICY "Autenticados leem logs automação" ON production_automation_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Sistema cria logs automação" ON production_automation_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_production_automations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_production_automations_timestamp
  BEFORE UPDATE ON production_automations
  FOR EACH ROW EXECUTE FUNCTION update_production_automations_updated_at();

-- RPC para verificar automações e retornar alertas de SLA em dias úteis
CREATE OR REPLACE FUNCTION check_production_automations(p_type_id UUID DEFAULT NULL)
RETURNS TABLE (
  order_id UUID,
  order_number INTEGER,
  title TEXT,
  priority TEXT,
  automation_id UUID,
  automation_nome TEXT,
  fase_nome TEXT,
  dias_uteis_na_fase INTEGER,
  prazo_dias_uteis INTEGER,
  dias_excedidos INTEGER,
  acao_tipo TEXT,
  production_type_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    po.id AS order_id,
    po.order_number,
    po.title,
    po.priority,
    pa.id AS automation_id,
    pa.nome AS automation_nome,
    ppt.name AS fase_nome,
    calculate_business_days(pp.started_at) AS dias_uteis_na_fase,
    pa.prazo_dias_uteis,
    calculate_business_days(pp.started_at) - pa.prazo_dias_uteis AS dias_excedidos,
    pa.acao_tipo,
    pt.name AS production_type_name
  FROM production_orders po
  JOIN production_phases pp ON pp.production_order_id = po.id AND pp.status = 'em_andamento'
  JOIN production_phase_templates ppt ON pp.phase_template_id = ppt.id
  JOIN production_types pt ON po.production_type_id = pt.id
  JOIN production_automations pa ON (
    pa.ativa = true
    AND pa.tipo = 'sla_etapa'
    AND pa.prazo_dias_uteis IS NOT NULL
    AND (pa.production_type_id IS NULL OR pa.production_type_id = po.production_type_id)
    AND (pa.phase_template_id IS NULL OR pa.phase_template_id = pp.phase_template_id)
  )
  WHERE 
    po.status NOT IN ('concluido', 'cancelado')
    AND pp.started_at IS NOT NULL
    AND calculate_business_days(pp.started_at) > pa.prazo_dias_uteis
    AND (p_type_id IS NULL OR po.production_type_id = p_type_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC para obter dias úteis de uma fase específica
CREATE OR REPLACE FUNCTION get_phase_business_days(p_phase_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_started_at TIMESTAMPTZ;
BEGIN
  SELECT started_at INTO v_started_at
  FROM production_phases
  WHERE id = p_phase_id;
  
  RETURN calculate_business_days(v_started_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;