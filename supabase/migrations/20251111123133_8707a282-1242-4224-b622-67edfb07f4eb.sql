-- Adicionar campo de username único aos perfis
ALTER TABLE profiles ADD COLUMN username TEXT UNIQUE;

-- Criar índice para busca rápida de username
CREATE INDEX idx_profiles_username ON profiles(username);

-- Criar tabela de notificações
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Criar índice para notificações por usuário e não lidas
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = false;

-- RLS para notificações
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem próprias notificações"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Sistema cria notificações"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Usuários atualizam próprias notificações"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários deletam próprias notificações"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Habilitar realtime para notificações
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Função para gerar username a partir do email
CREATE OR REPLACE FUNCTION generate_username_from_email(email_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INT := 0;
BEGIN
  -- Extrair parte antes do @ do email e limpar caracteres especiais
  base_username := regexp_replace(split_part(email_input, '@', 1), '[^a-zA-Z0-9]', '', 'g');
  base_username := lower(base_username);
  
  -- Garantir que tenha pelo menos 3 caracteres
  IF length(base_username) < 3 THEN
    base_username := base_username || 'user';
  END IF;
  
  final_username := base_username;
  
  -- Adicionar número se username já existir
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::TEXT;
  END LOOP;
  
  RETURN final_username;
END;
$$;

-- Atualizar perfis existentes sem username
UPDATE profiles 
SET username = generate_username_from_email(email)
WHERE username IS NULL;

-- Tornar username obrigatório após preencher existentes
ALTER TABLE profiles ALTER COLUMN username SET NOT NULL;