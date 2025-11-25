-- Corrigir RLS na tabela temp_phone_fixes
ALTER TABLE temp_phone_fixes ENABLE ROW LEVEL SECURITY;

-- Permitir que usuários autenticados vejam logs (tabela temporária de auditoria)
CREATE POLICY "Usuários autenticados podem ver logs de correção de telefone"
ON temp_phone_fixes
FOR SELECT
TO authenticated
USING (true);