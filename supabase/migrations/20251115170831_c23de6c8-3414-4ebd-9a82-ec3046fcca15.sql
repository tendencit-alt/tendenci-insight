-- Enable realtime for crm_deals table
ALTER TABLE crm_deals REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE crm_deals;