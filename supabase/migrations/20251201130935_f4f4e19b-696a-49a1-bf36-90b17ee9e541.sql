-- Habilitar Realtime para as novas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE followup_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE followup_templates;