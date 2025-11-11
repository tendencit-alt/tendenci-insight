-- Corrigir search_path da função generate_username_from_email
DROP FUNCTION IF EXISTS generate_username_from_email(TEXT);

CREATE OR REPLACE FUNCTION generate_username_from_email(email_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::TEXT;
  END LOOP;
  
  RETURN final_username;
END;
$$;