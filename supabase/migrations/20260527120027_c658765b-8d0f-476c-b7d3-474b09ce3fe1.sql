
-- Restringir resíduos do WhatsApp a admin do tenant (ou owner / service_role)

-- 1) tendenci_whatsapp_connections (contém evolution_apikey, webhook_url)
DROP POLICY IF EXISTS "Usuários atualizam próprias instâncias, admins atualizam tod" ON public.tendenci_whatsapp_connections;
DROP POLICY IF EXISTS "Usuários criam próprias instâncias" ON public.tendenci_whatsapp_connections;
DROP POLICY IF EXISTS "Usuários deletam próprias instâncias, admins deletam todas" ON public.tendenci_whatsapp_connections;
DROP POLICY IF EXISTS "Usuários veem próprias instâncias, admins veem todas" ON public.tendenci_whatsapp_connections;
DROP POLICY IF EXISTS tenant_isolation_modify_tendenci_whatsapp_connections ON public.tendenci_whatsapp_connections;
DROP POLICY IF EXISTS tenant_isolation_select_tendenci_whatsapp_connections ON public.tendenci_whatsapp_connections;

CREATE POLICY whatsapp_conn_admin_select ON public.tendenci_whatsapp_connections
  FOR SELECT TO authenticated
  USING (is_owner() OR is_tenant_admin(tenant_id));
CREATE POLICY whatsapp_conn_admin_modify ON public.tendenci_whatsapp_connections
  FOR ALL TO authenticated
  USING (is_owner() OR is_tenant_admin(tenant_id))
  WITH CHECK (is_owner() OR is_tenant_admin(tenant_id));

-- 2) tendenci_ia_config (credenciais/config IA em jsonb)
DROP POLICY IF EXISTS "Admins podem gerenciar config IA" ON public.tendenci_ia_config;
DROP POLICY IF EXISTS "Autenticados podem ler config IA" ON public.tendenci_ia_config;
DROP POLICY IF EXISTS tenant_isolation_modify_tendenci_ia_config ON public.tendenci_ia_config;
DROP POLICY IF EXISTS tenant_isolation_select_tendenci_ia_config ON public.tendenci_ia_config;

CREATE POLICY ia_config_admin_select ON public.tendenci_ia_config
  FOR SELECT TO authenticated
  USING (is_owner() OR is_tenant_admin(tenant_id));
CREATE POLICY ia_config_admin_modify ON public.tendenci_ia_config
  FOR ALL TO authenticated
  USING (is_owner() OR is_tenant_admin(tenant_id))
  WITH CHECK (is_owner() OR is_tenant_admin(tenant_id));

-- 3) ia_conversations (conteúdo de conversas WhatsApp + telefone)
DROP POLICY IF EXISTS tenant_select_ia_conversations ON public.ia_conversations;
DROP POLICY IF EXISTS tenant_isolation_restrict_ia_conversations ON public.ia_conversations;
DROP POLICY IF EXISTS admin_delete_ia_conversations ON public.ia_conversations;

CREATE POLICY ia_conv_admin_select ON public.ia_conversations
  FOR SELECT TO authenticated
  USING (is_owner() OR is_tenant_admin(tenant_id));
CREATE POLICY ia_conv_admin_modify ON public.ia_conversations
  FOR ALL TO authenticated
  USING (is_owner() OR is_tenant_admin(tenant_id))
  WITH CHECK (is_owner() OR is_tenant_admin(tenant_id));

-- 4) ia_client_memory (telefones/notas)
DROP POLICY IF EXISTS tenant_select_ia_client_memory ON public.ia_client_memory;
DROP POLICY IF EXISTS tenant_update_ia_client_memory ON public.ia_client_memory;
DROP POLICY IF EXISTS tenant_isolation_restrict_ia_client_memory ON public.ia_client_memory;
DROP POLICY IF EXISTS admin_delete_ia_client_memory ON public.ia_client_memory;

CREATE POLICY ia_mem_admin_select ON public.ia_client_memory
  FOR SELECT TO authenticated
  USING (is_owner() OR is_tenant_admin(tenant_id));
CREATE POLICY ia_mem_admin_modify ON public.ia_client_memory
  FOR ALL TO authenticated
  USING (is_owner() OR is_tenant_admin(tenant_id))
  WITH CHECK (is_owner() OR is_tenant_admin(tenant_id));
