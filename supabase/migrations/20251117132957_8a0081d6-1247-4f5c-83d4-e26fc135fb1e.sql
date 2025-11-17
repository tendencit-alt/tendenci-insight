-- Adicionar módulo "configuracoes" ao enum app_module
ALTER TYPE app_module ADD VALUE IF NOT EXISTS 'configuracoes';

-- Adicionar módulo "arquitetos" ao enum app_module  
ALTER TYPE app_module ADD VALUE IF NOT EXISTS 'arquitetos';

COMMENT ON TYPE app_module IS 'Módulos disponíveis no sistema para controle de permissões';