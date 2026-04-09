

## Problema

Os itens de menu estão aparecendo **triplicados** porque a query de `menu_items` no `AppNavbar.tsx` não filtra por `tenant_id`. Como o usuário Owner tem bypass de RLS, ele vê os itens de **todos** os tenants (3 empresas = 3x cada módulo).

## Solução

Alterar o `fetchMenuItems` no `AppNavbar.tsx` para filtrar pelo `tenant_id` do perfil do usuário logado:

1. **`AppNavbar.tsx`** — Adicionar filtro `.eq('tenant_id', profile.tenant_id)` na query de menu_items
2. Aguardar o `profile` estar carregado antes de buscar os itens (adicionar `profile?.tenant_id` como dependência do `useEffect`)
3. Para o Owner (que pode não ter tenant_id), usar o `tenant_id` do primeiro tenant ativo ou exibir um seletor de empresa

## Detalhes Técnicos

- Modificar `fetchMenuItems` para receber `tenantId` como parâmetro
- Atualizar o `useEffect` para re-buscar quando `profile?.tenant_id` mudar
- Garantir que o Owner veja apenas os itens do seu próprio tenant (campo `tenant_id` do profile)

**Arquivo alterado:** `src/components/layout/AppNavbar.tsx`

