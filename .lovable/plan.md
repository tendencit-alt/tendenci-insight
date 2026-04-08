
## Plano: Papel OWNER do Sistema

### Hierarquia Final
- **OWNER**: Dono do sistema, vê tudo de todos os tenants, controle técnico e financeiro
- **Admin**: Administrador da empresa (tenant), gerencia sua própria empresa
- **Outros**: Papéis dentro do tenant

### Alterações:

1. **Banco de dados**: Renomear `is_super_admin` para `is_owner` na tabela `profiles` e atualizar funções SQL (`is_super_admin()` → `is_owner()`, `tenant_rls_check()`)

2. **PermissionsContext**: Renomear `isSuperAdmin` → `isOwner`, atualizar lógica

3. **Sidebar**: Renomear "Gestão de Empresas" → usar flag `ownerOnly` em vez de `superAdminOnly`

4. **SuperAdmin page**: Renomear para painel OWNER, adicionar abas de controle técnico e financeiro dos usuários

5. **UserManagement**: Configurações do sistema pertencem ao Admin da empresa (sem mudança, já funciona assim)
