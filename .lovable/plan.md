# Plano: Remoção total de `/auditoria-permissoes` (Opção C2)

Desmonta página, telemetria e backend de negativas de permissão (`rbac_permission_denials`), incluindo consumidores cruzados.

## 1. Frontend — arquivos a deletar
- `src/pages/PermissionAuditPage.tsx`
- `src/hooks/usePermissionDenials.ts`
- `src/components/smart-permissions/PermissionAnalyticsCard.tsx`
- `supabase/functions/analyze-permission-friction/` (edge function inteira)

## 2. Frontend — arquivos a editar
- `src/App.tsx` — remover import `PermissionAuditPage` e a rota `/auditoria-permissoes`
- `src/hooks/useModulesConfig.ts` — remover entrada `auditoria-permissoes`
- `src/components/governance/GovAuditTab.tsx` — remover a aba/seção alimentada por `usePermissionAudit` (manter o restante do componente; se ficar vazio, remover o arquivo e seu uso)
- `src/hooks/useGovernanceData.ts` — remover `usePermissionAudit` (que lê a tabela)
- `src/components/permission-debug/TimelineTab.tsx` — remover uso de `useDenialAnalytics` e o bloco visual correspondente
- `src/components/settings/ProfileTypePermissionsDialog.tsx` — auditar `logPermissionAudit` (verificar se grava na tabela removida; se sim, neutralizar como no-op silencioso)
- Qualquer outro call site de `log_permission_denial` (guards/`useCan`) — neutralizar

## 3. Backend — migração SQL
- `DROP FUNCTION` `log_permission_denial` (e variantes)
- `DROP TABLE public.rbac_permission_denials CASCADE` (remove índices + policies)
- Confirmar que nenhuma outra função/policy/view do projeto referencia a tabela

## 4. Edge function
- Solicitar desimplantação de `analyze-permission-friction` via `supabase--delete_edge_functions`

## 5. Documentação / Memória
- Atualizar `mem://auth/rbac-profiles-and-permissions` notando que a telemetria de negativas foi descontinuada
- Adicionar item em `mem://index.md` ou marcar como removido (similar ao tratamento do `audit-log-system`)

## 6. Validação
- Build TypeScript limpo (sem imports quebrados)
- Smoke manual: abrir `/governanca`, `/permissoes-debug`, `/configuracoes` (perfis) para confirmar que nada quebra

## Riscos
- **Baixo/médio.** Tabela está com 0 registros. Risco principal é deixar algum `INSERT INTO rbac_permission_denials` órfão em guards client-side — vai virar erro silencioso após o DROP. Mitigação: grep final por `rbac_permission_denials` e `log_permission_denial` antes de fechar.

## Itens explicitamente fora do escopo
- Não mexer em `PermissionsContext`, `useCan`, `usePermissions` além de remover chamadas ao logger de negativas.
- Não alterar o sistema RBAC em si (perfis, templates, matriz).
