-- Adicionar coluna category na tabela menu_items
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'comercial';

-- Reorganizar menu items com novas categorias, labels e posições
-- Dashboard: ocultar
UPDATE public.menu_items SET visible = false WHERE module = 'dashboard';

-- COMERCIAL (positions 1-10)
UPDATE public.menu_items SET label = 'Leads', category = 'comercial', position = 1 WHERE module = 'leads';
UPDATE public.menu_items SET label = 'CRM Arquitetos', category = 'comercial', position = 2 WHERE module = 'prospeccao';
UPDATE public.menu_items SET label = 'CRM Clientes', category = 'comercial', position = 3 WHERE module = 'crm';
UPDATE public.menu_items SET label = 'Projetos e Orçamentos', category = 'comercial', position = 4 WHERE module = 'projetos';
UPDATE public.menu_items SET label = 'Pedidos', category = 'comercial', position = 5 WHERE module = 'pedidos';
UPDATE public.menu_items SET label = 'Metas', category = 'comercial', position = 6 WHERE module = 'metas';

-- PRODUÇÃO (positions 10-19)
UPDATE public.menu_items SET label = 'Produção', category = 'producao', position = 10 WHERE module = 'producao';

-- FINANCEIRO (positions 20-29)
UPDATE public.menu_items SET label = 'Compras', category = 'financeiro', position = 20 WHERE module = 'compras';

-- CADASTROS (positions 30-39)
UPDATE public.menu_items SET label = 'Fornecedores', category = 'cadastros', position = 30 WHERE module = 'fornecedores';
UPDATE public.menu_items SET label = 'Estoque', category = 'cadastros', position = 31 WHERE module = 'estoque';

-- MASTER/CONFIG (positions 90+)
UPDATE public.menu_items SET category = 'master', position = 97 WHERE module = 'system_errors';
UPDATE public.menu_items SET category = 'master', position = 98 WHERE module = 'dashboards_personalizados';
UPDATE public.menu_items SET category = 'master', position = 99 WHERE module = 'gestao_usuarios';