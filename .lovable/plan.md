

## Plano: Criar Usuário OWNER no Sistema

### Problema Identificado

Existe um **bug crítico** que impede a criação de qualquer usuário: a trigger `set_default_permissions_for_new_user` referencia uma coluna `permission_key` que **não existe mais** na tabela `user_permissions`. Isso causa erro 500 no signup (confirmado nos logs de autenticação).

### Etapas

1. **Corrigir trigger quebrada** — Recriar a função `set_default_permissions_for_new_user` para usar as colunas atuais (`module`, `can_view`, `can_create`, `can_edit`, `can_delete`) em vez da antiga `permission_key`/`granted`. Ou simplesmente removê-la, já que existem outras triggers (`trigger_apply_default_permissions` e `initialize_user_permissions`) que já fazem o mesmo trabalho corretamente.

2. **Criar o usuário OWNER via edge function** — Usar a API admin do backend para criar o usuário com:
   - Email: `pablo@tendenci.com.br`
   - Senha: `tendenci123`
   - Nome: Pablo
   - Marcar `is_owner: true` e `role: admin` no perfil

### Detalhes Técnicos

- **Migration SQL**: `DROP TRIGGER on_user_created_initialize_permissions ON profiles; DROP FUNCTION set_default_permissions_for_new_user;`
- **Criação do usuário**: Via `supabase.auth.admin.createUser()` seguido de `UPDATE profiles SET is_owner = true, role = 'admin'` para o novo user ID
- O email será confirmado automaticamente (`email_confirm: true`)

