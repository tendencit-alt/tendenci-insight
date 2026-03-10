ALTER TABLE architect_files DROP CONSTRAINT architect_files_uploaded_by_fkey;
ALTER TABLE architect_files ADD CONSTRAINT architect_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE architect_history DROP CONSTRAINT architect_history_created_by_fkey;
ALTER TABLE architect_history ADD CONSTRAINT architect_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE project_files DROP CONSTRAINT project_files_uploaded_by_fkey;
ALTER TABLE project_files ADD CONSTRAINT project_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE project_history DROP CONSTRAINT project_history_created_by_fkey;
ALTER TABLE project_history ADD CONSTRAINT project_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE system_activities DROP CONSTRAINT system_activities_user_id_fkey;
ALTER TABLE system_activities ADD CONSTRAINT system_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE tendenci_company_goals DROP CONSTRAINT tendenci_company_goals_criado_por_fkey;
ALTER TABLE tendenci_company_goals ADD CONSTRAINT tendenci_company_goals_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE tendenci_ia_config DROP CONSTRAINT tendenci_ia_config_updated_by_fkey;
ALTER TABLE tendenci_ia_config ADD CONSTRAINT tendenci_ia_config_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE tendenci_seller_goals DROP CONSTRAINT tendenci_seller_goals_criado_por_fkey;
ALTER TABLE tendenci_seller_goals ADD CONSTRAINT tendenci_seller_goals_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE tendenci_whatsapp_connections DROP CONSTRAINT tendenci_whatsapp_connections_created_by_fkey;
ALTER TABLE tendenci_whatsapp_connections ADD CONSTRAINT tendenci_whatsapp_connections_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;