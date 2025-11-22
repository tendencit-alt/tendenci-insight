-- Fase 1: Correção de Banco de Dados

-- 1. Corrigir defaults para corresponder ao código
ALTER TABLE tendenci_prospec_arq_agendamentos 
  ALTER COLUMN canal SET DEFAULT 'tarefa',
  ALTER COLUMN status SET DEFAULT 'pendente';

-- 2. Adicionar check constraints para tipos válidos
ALTER TABLE tendenci_prospec_arq_agendamentos
  ADD CONSTRAINT check_tipo_tarefa CHECK (tipo_tarefa IN ('interna', 'automatizada'));

ALTER TABLE tendenci_prospec_arq_agendamentos
  ADD CONSTRAINT check_status CHECK (status IN ('pendente', 'concluida', 'cancelada'));

-- 3. Criar função e trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_agendamento_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_agendamento_updated_at
  BEFORE UPDATE ON tendenci_prospec_arq_agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_agendamento_updated_at();

-- 4. Corrigir RLS policies para permitir visualização de tarefas criadas
DROP POLICY IF EXISTS "Vendedores veem seus agendamentos" ON tendenci_prospec_arq_agendamentos;

CREATE POLICY "Vendedores veem suas tarefas e tarefas do arquiteto"
  ON tendenci_prospec_arq_agendamentos
  FOR SELECT
  USING (
    auth.uid() = vendedor_id 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
    OR architect_id IN (
      SELECT id FROM architects 
      WHERE vendedor_responsavel = auth.uid()
    )
  );