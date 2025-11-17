-- Habilitar realtime para atualização automática das metas
ALTER TABLE tendenci_seller_goals REPLICA IDENTITY FULL;
ALTER TABLE tendenci_goal_progress REPLICA IDENTITY FULL;
ALTER TABLE tendenci_daily_architect_goals REPLICA IDENTITY FULL;
ALTER TABLE tendenci_badges REPLICA IDENTITY FULL;

-- Adicionar tabelas à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tendenci_seller_goals;
ALTER PUBLICATION supabase_realtime ADD TABLE tendenci_goal_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE tendenci_daily_architect_goals;
ALTER PUBLICATION supabase_realtime ADD TABLE tendenci_badges;