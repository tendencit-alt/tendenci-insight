## Problema

Ao clicar em "Salvar" no diálogo de permissões de usuário, o backend rejeita o `INSERT` em `user_permissions` e o frontend mostra "Não foi possível atualizar as permissões."

## Causa raiz (duas falhas combinadas)

Investiguei as policies da tabela `public.user_permissions` e o código de `src/components/settings/UserPermissionsDialog.tsx`:

1. **Policies permissivas restritas demais**
   As policies `Admins can insert/update/delete permissions` só liberam quando `profiles.role = 'admin'`. Mas no enum `user_role` existe também `owner` e `tenant_owner`, e o usuário `pablo@tendenci.com.br` (que é dono do sistema) tem `role = 'owner'` + `is_owner = true`. Para ele, o `auth.uid()` nunca casa com a policy → operação negada.

2. **`tenant_id` ausente no INSERT**
   Existe uma policy **RESTRICTIVE** `tenant_isolation_modify_user_permissions` exigindo `tenant_rls_check(tenant_id)`. O diálogo monta o payload sem `tenant_id` (fica `NULL`), o que reprova a checagem mesmo para um admin legítimo do tenant.

Resultado: até admins de tenant tropeçam no item 2, e o owner/tenant_owner tropeça nos dois.

## Mudanças propostas

### 1. Migration — relaxar policies permissivas para incluir owner/tenant_owner
Substituir as 4 policies "Admins can ..." por versões que também aceitam `is_owner = true` ou `role IN ('admin','owner','tenant_owner')`, mantendo as policies de tenant restritivas como segunda camada:

```sql
DROP POLICY "Admins can view all permissions" ON public.user_permissions;
DROP POLICY "Admins can insert permissions"   ON public.user_permissions;
DROP POLICY "Admins can update permissions"   ON public.user_permissions;
DROP POLICY "Admins can delete permissions"   ON public.user_permissions;

CREATE POLICY "Admins manage permissions"
ON public.user_permissions
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.id = auth.uid()
    AND (p.is_owner = true OR p.role IN ('admin','owner','tenant_owner'))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.id = auth.uid()
    AND (p.is_owner = true OR p.role IN ('admin','owner','tenant_owner'))
));

-- Mantém a policy "Users can view their own permissions" como está.
```

A policy restritiva de tenant continua valendo — owner do sistema (`is_owner=true`) é tratada como bypass dentro de `tenant_rls_check`, então segue funcionando.

### 2. Frontend — incluir `tenant_id` no payload
Em `src/components/settings/UserPermissionsDialog.tsx`, no `useEffect` que busca o perfil, ler também `tenant_id` do usuário-alvo e usá-lo no `insert`:

```ts
const { data: profile } = await supabase
  .from('profiles')
  .select('role, profile_type_id, tenant_id')
  .eq('id', userId)
  .single();
// guarda em estado: setTargetTenantId(profile.tenant_id)

// no handleSave:
.insert(permissions.map(p => ({
  user_id: userId,
  tenant_id: targetTenantId,   // <- novo
  module: p.module as any,
  can_view: p.can_view,
  can_create: p.can_create,
  can_edit: p.can_edit,
  can_delete: p.can_delete,
})));
```

Se `targetTenantId` vier nulo (caso raro), abortar com toast explicativo em vez de mandar `NULL` e receber erro genérico.

### 3. Mensagem de erro mais útil
No `catch` do `handleSave`, exibir `error.message` (quando existir) no toast, para futuros incidentes ficarem diagnosticáveis sem inspecionar console.

## Fora de escopo

- Não mexo na estrutura da tabela nem nas policies restritivas de tenant.
- Não altero o modelo de papéis (`user_role` enum).
- Não toco em `profile_type_permissions` nem na matriz por perfil já validada.

## Validação

1. Logado como `pablo@tendenci.com.br` (owner), abrir Configurações → Usuários → editar permissões de um usuário não-admin → salvar → toast de sucesso.
2. Logado como `pablomobiliarios@tendenci.com.br` (admin de tenant) → repetir → sucesso, e linhas inseridas devem ter `tenant_id` = tenant do usuário-alvo.
3. Conferir via SQL: `SELECT tenant_id, count(*) FROM user_permissions GROUP BY 1;` — sem nulos novos.
4. Tentar como usuário operacional comum → continua bloqueado (esperado).
