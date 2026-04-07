
ALTER TABLE public.fin_strategic_resource_account_configs
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

UPDATE public.fin_strategic_resource_account_configs SET display_name = 'RT', description = 'Responsável técnico do pedido.' WHERE resource_type = 'rt' AND display_name IS NULL;
UPDATE public.fin_strategic_resource_account_configs SET display_name = 'Vendedor', description = 'Comissão comercial vinculada ao pedido.' WHERE resource_type = 'vendedor' AND display_name IS NULL;
UPDATE public.fin_strategic_resource_account_configs SET display_name = 'Orçamentista', description = 'Recurso de apoio à precificação e orçamento.' WHERE resource_type = 'orcamentista' AND display_name IS NULL;
UPDATE public.fin_strategic_resource_account_configs SET display_name = 'Projetista', description = 'Responsável pelo projeto técnico/comercial.' WHERE resource_type = 'projetista' AND display_name IS NULL;
UPDATE public.fin_strategic_resource_account_configs SET display_name = 'Montador', description = 'Equipe ou responsável de montagem.' WHERE resource_type = 'montador' AND display_name IS NULL;
UPDATE public.fin_strategic_resource_account_configs SET display_name = 'Produção', description = 'Comissão/recurso ligado à produção.' WHERE resource_type = 'producao' AND display_name IS NULL;
