-- Fix foreign key constraints for architects table to allow deletion

-- 1. Fix leads.architect_id constraint (SET NULL - leads can exist without architect)
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_architect_id_fkey;
ALTER TABLE leads 
  ADD CONSTRAINT leads_architect_id_fkey 
  FOREIGN KEY (architect_id) 
  REFERENCES architects(id) 
  ON DELETE SET NULL;

-- 2. Fix crm_deals.architect_id constraint (SET NULL - deals can exist without architect)
ALTER TABLE crm_deals DROP CONSTRAINT IF EXISTS crm_deals_architect_id_fkey;
ALTER TABLE crm_deals 
  ADD CONSTRAINT crm_deals_architect_id_fkey 
  FOREIGN KEY (architect_id) 
  REFERENCES architects(id) 
  ON DELETE SET NULL;

-- 3. Fix projects.architect_id constraint (SET NULL - projects can exist without architect)
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_architect_id_fkey;
ALTER TABLE projects 
  ADD CONSTRAINT projects_architect_id_fkey 
  FOREIGN KEY (architect_id) 
  REFERENCES architects(id) 
  ON DELETE SET NULL;

-- 4. Fix architect_projects.architect_id constraint (CASCADE - projects should be deleted with architect)
ALTER TABLE architect_projects DROP CONSTRAINT IF EXISTS architect_projects_architect_id_fkey;
ALTER TABLE architect_projects 
  ADD CONSTRAINT architect_projects_architect_id_fkey 
  FOREIGN KEY (architect_id) 
  REFERENCES architects(id) 
  ON DELETE CASCADE;

-- 5. Fix architect_files.architect_id constraint (CASCADE - files should be deleted with architect)
ALTER TABLE architect_files DROP CONSTRAINT IF EXISTS architect_files_architect_id_fkey;
ALTER TABLE architect_files 
  ADD CONSTRAINT architect_files_architect_id_fkey 
  FOREIGN KEY (architect_id) 
  REFERENCES architects(id) 
  ON DELETE CASCADE;

-- 6. Fix architect_history.architect_id constraint (CASCADE - history should be deleted with architect)
ALTER TABLE architect_history DROP CONSTRAINT IF EXISTS architect_history_architect_id_fkey;
ALTER TABLE architect_history 
  ADD CONSTRAINT architect_history_architect_id_fkey 
  FOREIGN KEY (architect_id) 
  REFERENCES architects(id) 
  ON DELETE CASCADE;

-- 7. Fix architect_timeline.architect_id constraint (CASCADE - timeline should be deleted with architect)
ALTER TABLE architect_timeline DROP CONSTRAINT IF EXISTS architect_timeline_architect_id_fkey;
ALTER TABLE architect_timeline 
  ADD CONSTRAINT architect_timeline_architect_id_fkey 
  FOREIGN KEY (architect_id) 
  REFERENCES architects(id) 
  ON DELETE CASCADE;

-- 8. Fix tendenci_prospec_arq_agendamentos.architect_id constraint (CASCADE - appointments should be deleted with architect)
ALTER TABLE tendenci_prospec_arq_agendamentos DROP CONSTRAINT IF EXISTS tendenci_prospec_arq_agendamentos_architect_id_fkey;
ALTER TABLE tendenci_prospec_arq_agendamentos 
  ADD CONSTRAINT tendenci_prospec_arq_agendamentos_architect_id_fkey 
  FOREIGN KEY (architect_id) 
  REFERENCES architects(id) 
  ON DELETE CASCADE;

-- 9. Fix tendenci_prospec_arq_campaign_architects.architect_id constraint (CASCADE - campaign associations should be deleted with architect)
ALTER TABLE tendenci_prospec_arq_campaign_architects DROP CONSTRAINT IF EXISTS tendenci_prospec_arq_campaign_architects_architect_id_fkey;
ALTER TABLE tendenci_prospec_arq_campaign_architects 
  ADD CONSTRAINT tendenci_prospec_arq_campaign_architects_architect_id_fkey 
  FOREIGN KEY (architect_id) 
  REFERENCES architects(id) 
  ON DELETE CASCADE;

-- 10. Fix tendenci_prospec_arq_logs.architect_id constraint (CASCADE - logs should be deleted with architect)
ALTER TABLE tendenci_prospec_arq_logs DROP CONSTRAINT IF EXISTS tendenci_prospec_arq_logs_architect_id_fkey;
ALTER TABLE tendenci_prospec_arq_logs 
  ADD CONSTRAINT tendenci_prospec_arq_logs_architect_id_fkey 
  FOREIGN KEY (architect_id) 
  REFERENCES architects(id) 
  ON DELETE CASCADE;