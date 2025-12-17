
-- =============================================
-- FASE 1: Criar funções de trigger
-- =============================================

-- Função de atribuição automática de vendedor
CREATE OR REPLACE FUNCTION auto_assign_vendor_on_update()
RETURNS trigger AS $$
BEGIN
  -- Não mexe se já tem vendedor ou se está no status novo_arquiteto
  IF NEW.vendedor_responsavel IS NULL 
     AND NEW.status_funil IS DISTINCT FROM 'novo_arquiteto'
     AND auth.uid() IS NOT NULL THEN
    NEW.vendedor_responsavel := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função de log de mudanças
CREATE OR REPLACE FUNCTION log_architect_changes()
RETURNS trigger AS $$
BEGIN
  -- Mudança de status_funil
  IF OLD.status_funil IS DISTINCT FROM NEW.status_funil THEN
    INSERT INTO architect_history 
      (architect_id, event_type, description, field_name, old_value, new_value, created_by)
    VALUES 
      (NEW.id, 'status_change', 
       format('Status alterado de %s para %s', 
         COALESCE(OLD.status_funil, 'N/A'), 
         COALESCE(NEW.status_funil, 'N/A')),
       'status_funil',
       OLD.status_funil,
       NEW.status_funil,
       auth.uid());
  END IF;
  
  -- Mudança de vendedor_responsavel
  IF OLD.vendedor_responsavel IS DISTINCT FROM NEW.vendedor_responsavel THEN
    INSERT INTO architect_history 
      (architect_id, event_type, description, field_name, old_value, new_value, created_by)
    VALUES 
      (NEW.id, 'vendor_change', 
       'Vendedor responsável alterado',
       'vendedor_responsavel',
       OLD.vendedor_responsavel::TEXT,
       NEW.vendedor_responsavel::TEXT,
       auth.uid());
  END IF;
  
  -- Mudança de tier
  IF OLD.tier IS DISTINCT FROM NEW.tier THEN
    INSERT INTO architect_history 
      (architect_id, event_type, description, field_name, old_value, new_value, created_by)
    VALUES 
      (NEW.id, 'tier_change',
       format('Tier alterado de %s para %s', COALESCE(OLD.tier, 'N/A'), COALESCE(NEW.tier, 'N/A')),
       'tier',
       OLD.tier,
       NEW.tier,
       auth.uid());
  END IF;
  
  -- Mudança de telefone
  IF OLD.phone IS DISTINCT FROM NEW.phone THEN
    INSERT INTO architect_history 
      (architect_id, event_type, description, field_name, old_value, new_value, created_by)
    VALUES 
      (NEW.id, 'data_update', 'Telefone alterado', 'phone', OLD.phone, NEW.phone, auth.uid());
  END IF;
  
  -- Mudança de email
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    INSERT INTO architect_history 
      (architect_id, event_type, description, field_name, old_value, new_value, created_by)
    VALUES 
      (NEW.id, 'data_update', 'Email alterado', 'email', OLD.email, NEW.email, auth.uid());
  END IF;
  
  -- Mudança de nome
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    INSERT INTO architect_history 
      (architect_id, event_type, description, field_name, old_value, new_value, created_by)
    VALUES 
      (NEW.id, 'data_update', 'Nome alterado', 'name', OLD.name, NEW.name, auth.uid());
  END IF;
  
  -- Mudança de empresa
  IF OLD.company IS DISTINCT FROM NEW.company THEN
    INSERT INTO architect_history 
      (architect_id, event_type, description, field_name, old_value, new_value, created_by)
    VALUES 
      (NEW.id, 'data_update', 'Empresa alterada', 'company', OLD.company, NEW.company, auth.uid());
  END IF;
  
  -- Mudança de tag_prospeccao
  IF OLD.tag_prospeccao IS DISTINCT FROM NEW.tag_prospeccao THEN
    INSERT INTO architect_history 
      (architect_id, event_type, description, field_name, old_value, new_value, created_by)
    VALUES 
      (NEW.id, 'tag_change', 
       format('Tag alterada de %s para %s', COALESCE(OLD.tag_prospeccao, 'N/A'), COALESCE(NEW.tag_prospeccao, 'N/A')),
       'tag_prospeccao',
       OLD.tag_prospeccao,
       NEW.tag_prospeccao,
       auth.uid());
  END IF;
  
  -- Mudança de ativo/inativo
  IF OLD.active IS DISTINCT FROM NEW.active THEN
    INSERT INTO architect_history 
      (architect_id, event_type, description, field_name, old_value, new_value, created_by)
    VALUES 
      (NEW.id, 'status_change', 
       CASE WHEN NEW.active THEN 'Arquiteto ativado' ELSE 'Arquiteto inativado' END,
       'active',
       OLD.active::TEXT,
       NEW.active::TEXT,
       auth.uid());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FASE 2: Criar triggers
-- =============================================
DROP TRIGGER IF EXISTS tr_auto_assign_vendor ON architects;
CREATE TRIGGER tr_auto_assign_vendor
  BEFORE UPDATE ON architects
  FOR EACH ROW EXECUTE FUNCTION auto_assign_vendor_on_update();

DROP TRIGGER IF EXISTS tr_log_architect_changes ON architects;
CREATE TRIGGER tr_log_architect_changes
  AFTER UPDATE ON architects
  FOR EACH ROW EXECUTE FUNCTION log_architect_changes();

-- =============================================
-- FASE 3: Adicionar 'pedidos' ao enum app_module
-- =============================================
ALTER TYPE app_module ADD VALUE IF NOT EXISTS 'pedidos';

-- =============================================
-- FASE 4: Atualizar função de permissões padrão
-- =============================================
CREATE OR REPLACE FUNCTION set_default_permissions_for_new_user()
RETURNS trigger AS $$
BEGIN
  -- Permissões para vendedor
  IF NEW.role = 'vendedor' THEN
    INSERT INTO user_permissions (user_id, module, can_view, can_create, can_edit, can_delete)
    VALUES 
      (NEW.id, 'dashboard', true, false, false, false),
      (NEW.id, 'prospeccao', true, true, true, false),
      (NEW.id, 'arquitetos', true, true, true, false),
      (NEW.id, 'crm', true, true, true, false),
      (NEW.id, 'projetos', true, true, true, false),
      (NEW.id, 'metas', true, false, false, false),
      (NEW.id, 'leads', true, true, true, false),
      (NEW.id, 'dashboards_personalizados', false, false, false, false),
      (NEW.id, 'configuracoes', false, false, false, false),
      (NEW.id, 'gestao_usuarios', false, false, false, false),
      (NEW.id, 'producao', true, true, true, false),
      (NEW.id, 'fornecedores', true, true, true, false),
      (NEW.id, 'estoque', true, true, true, false),
      (NEW.id, 'compras', true, true, true, false),
      (NEW.id, 'pedidos', true, true, true, false);
  END IF;
  
  -- Permissões para projetista
  IF NEW.role = 'projetista' THEN
    INSERT INTO user_permissions (user_id, module, can_view, can_create, can_edit, can_delete)
    VALUES 
      (NEW.id, 'dashboard', false, false, false, false),
      (NEW.id, 'prospeccao', false, false, false, false),
      (NEW.id, 'arquitetos', false, false, false, false),
      (NEW.id, 'crm', false, false, false, false),
      (NEW.id, 'projetos', true, false, true, false),
      (NEW.id, 'metas', false, false, false, false),
      (NEW.id, 'leads', false, false, false, false),
      (NEW.id, 'dashboards_personalizados', false, false, false, false),
      (NEW.id, 'configuracoes', false, false, false, false),
      (NEW.id, 'gestao_usuarios', false, false, false, false),
      (NEW.id, 'producao', false, false, false, false),
      (NEW.id, 'fornecedores', false, false, false, false),
      (NEW.id, 'estoque', false, false, false, false),
      (NEW.id, 'compras', false, false, false, false),
      (NEW.id, 'pedidos', true, false, true, false);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
