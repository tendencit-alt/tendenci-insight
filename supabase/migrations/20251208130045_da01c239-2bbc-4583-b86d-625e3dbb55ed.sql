-- Remover e recriar constraints SEM chamar funções
ALTER TABLE tendenci_seller_goals DROP CONSTRAINT IF EXISTS tendenci_seller_goals_status_check;
ALTER TABLE tendenci_seller_goals ADD CONSTRAINT tendenci_seller_goals_status_check 
  CHECK (status IN ('ativa', 'concluida', 'cancelada', 'expirada'));

ALTER TABLE tendenci_company_goals DROP CONSTRAINT IF EXISTS tendenci_company_goals_status_check;
ALTER TABLE tendenci_company_goals ADD CONSTRAINT tendenci_company_goals_status_check 
  CHECK (status IN ('ativa', 'concluida', 'cancelada', 'expirada'));