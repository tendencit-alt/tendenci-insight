-- Atualizar role do Renato para projetista
UPDATE profiles 
SET role = 'projetista' 
WHERE id = '07406cbb-d8b1-45f3-b432-3e2d8939aa9d';

-- Remover todas as permissões atuais do Renato
DELETE FROM user_permissions 
WHERE user_id = '07406cbb-d8b1-45f3-b432-3e2d8939aa9d';

-- Criar permissão restrita apenas para o módulo Projetos
INSERT INTO user_permissions (user_id, module, can_view, can_create, can_edit, can_delete)
VALUES ('07406cbb-d8b1-45f3-b432-3e2d8939aa9d', 'projetos', true, false, true, false);