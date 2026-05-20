## Plano: Inserir permissões do módulo `producao` para todos os perfis

Espelhar o mesmo padrão já aplicado ao módulo `operacional`, garantindo que a aba "Produção (legado)" deixe de depender do bypass de admin/owner.

### Matriz a inserir em `profile_type_permissions`

| Perfil | view | create | edit | delete |
|---|---|---|---|---|
| owner | ✅ | ✅ | ✅ | ✅ |
| administrador | ✅ | ✅ | ✅ | ✅ |
| gestor | ✅ | ❌ | ❌ | ❌ |
| operacional | ✅ | ✅ | ✅ | ❌ |
| comercial | ✅ | ❌ | ❌ | ❌ |
| controladoria | ✅ | ❌ | ❌ | ❌ |
| auditoria | ✅ | ❌ | ❌ | ❌ |
| financeiro | ❌ | ❌ | ❌ | ❌ |

### Execução

1. `INSERT` em `profile_type_permissions` com `ON CONFLICT (profile_type_id, module) DO NOTHING` para os 8 perfis × módulo `producao`.
2. Sem mudança de código — sidebar e PermissionsContext já consultam essa tabela.
3. Validar com `SELECT` final confirmando 8 linhas em `module = 'producao'`.
