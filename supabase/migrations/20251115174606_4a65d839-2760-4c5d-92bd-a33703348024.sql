-- Adicionar coluna de filtros aos dashboards personalizados
ALTER TABLE dashboards_personalizados
ADD COLUMN filtros JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN dashboards_personalizados.filtros IS 'Filtros personalizados do usuário: período, origem, vendedor, arquiteto, etc.';
