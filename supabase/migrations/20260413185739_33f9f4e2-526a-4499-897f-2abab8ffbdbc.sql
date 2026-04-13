
-- First, update existing items to new categories
-- Pedidos → comercial
UPDATE public.menu_items SET category = 'comercial' WHERE module = 'pedidos';
-- Produção → operacional
UPDATE public.menu_items SET category = 'operacional' WHERE module = 'producao';
-- Financeiro → financeiro
UPDATE public.menu_items SET category = 'financeiro' WHERE module = 'financeiro';
-- Cadastros Financeiros → controladoria
UPDATE public.menu_items SET category = 'controladoria' WHERE module = 'cadastros_financeiros';
-- Fornecedores → cadastros
UPDATE public.menu_items SET category = 'cadastros' WHERE module = 'fornecedores';
-- Estoque → cadastros
UPDATE public.menu_items SET category = 'cadastros' WHERE module = 'estoque';
-- Dashboard → direct (stays)
UPDATE public.menu_items SET category = 'direct' WHERE module = 'dashboard';
-- Configurações → configuracoes
UPDATE public.menu_items SET category = 'configuracoes' WHERE module = 'configuracoes';
-- Gestão Usuários → configuracoes
UPDATE public.menu_items SET category = 'configuracoes' WHERE module = 'gestao_usuarios';

-- Update positions for proper ordering within groups
UPDATE public.menu_items SET position = 1 WHERE module = 'dashboard';
UPDATE public.menu_items SET position = 10 WHERE module = 'pedidos';
UPDATE public.menu_items SET position = 20 WHERE module = 'producao';
UPDATE public.menu_items SET position = 30 WHERE module = 'financeiro';
UPDATE public.menu_items SET position = 40 WHERE module = 'cadastros_financeiros';
UPDATE public.menu_items SET position = 50 WHERE module = 'fornecedores';
UPDATE public.menu_items SET position = 51 WHERE module = 'estoque';
UPDATE public.menu_items SET position = 60 WHERE module = 'configuracoes';
UPDATE public.menu_items SET position = 61 WHERE module = 'gestao_usuarios';
