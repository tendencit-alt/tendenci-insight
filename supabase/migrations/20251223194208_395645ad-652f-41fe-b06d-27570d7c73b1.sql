-- Adicionar coluna boleto_status na tabela clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS boleto_status text DEFAULT NULL;

-- Comentário: valores possíveis são 'aprovado', 'nao_aprovado' ou NULL (não informado)