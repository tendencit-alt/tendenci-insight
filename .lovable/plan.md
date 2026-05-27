## Causa raiz

A tabela `public.fin_chart_accounts` tem **apenas policies RLS RESTRICTIVE** para `INSERT` e `UPDATE` — não há nenhuma **PERMISSIVE**. No Postgres, sem ao menos uma PERMISSIVE, toda operação é **negada silenciosamente**: o UPDATE retorna 0 linhas, o `.single()` do PostgREST estoura `Cannot coerce the result to a single JSON object`, e a mudança parece "salvar" sem persistir. O DELETE funciona porque tem `admin_only_delete` (permissive). 

Resultado: as empresas (Tendenci Planejados, Tendenci Mobiliários — ambas com 81 contas clonadas, `is_core=false`) **não conseguem editar nem criar contas**, mesmo que a UI deixe abrir o diálogo.

## O que vou fazer

### 1. Migration de RLS em `fin_chart_accounts` (corrige a personalização)

Adicionar policies **PERMISSIVE** que liberam o isolamento por tenant, mantendo as RESTRICTIVE existentes como reforço:

- `tenant_can_select` (SELECT, PERMISSIVE, authenticated) — `is_owner() OR tenant_id = get_user_tenant_id()`
- `tenant_can_insert` (INSERT, PERMISSIVE, authenticated) — `WITH CHECK tenant_rls_check(tenant_id)`
- `tenant_can_update` (UPDATE, PERMISSIVE, authenticated) — `USING/CHECK tenant_rls_check(tenant_id)`
- `tenant_can_delete` (DELETE, PERMISSIVE, authenticated) — mantém `admin_only_delete` (já existe)

A policy pública existente (leitura do template Owner com `tenant_id IS NULL AND is_core`) é preservada.

A trigger `protect_chart_account_core` continua barrando alterações destrutivas em linhas `is_core=true` (template do Owner), garantindo que a empresa só personaliza a **própria cópia**.

### 2. Saneamento no front (UX + erros claros)

Em `src/components/financeiro/masters/ChartAccountsManager.tsx` (`handleSubmit`, bulk e move):

- Trocar `.select("id").single()` por `.select("id").maybeSingle()` e, quando vier `null`, exibir toast `"Sem permissão para editar essa conta nesta empresa"` em vez do erro críptico atual.
- Mesmo tratamento nos blocos de renumeração de descendentes e em `handleBulkEdit`/`handleBulkDelete`/move.
- Validar antes do save que `editing.tenant_id` confere com o tenant atual (defesa em profundidade).

### 3. Garantia para empresas novas

A função `seed_chart_of_accounts_from_owner` já é disparada pelo trigger `trg_seed_tenant_defaults` em todo novo tenant — então cada empresa nasce com seus 81 clones editáveis. Não vou mexer nela.

Vou rodar um backfill defensivo (idempotente) na migration: para qualquer tenant em `public.tenants` que não tenha nenhuma conta, chamar `seed_chart_of_accounts_from_owner(t.id)`. Hoje todos têm 81, então o backfill é no-op, mas evita que um tenant futuro fique órfão se o trigger falhar.

### 4. Auditoria pós-fix

- Reexecutar o levantamento de policies para confirmar PERMISSIVE+RESTRICTIVE em INSERT/UPDATE.
- Simular um UPDATE como um tenant Tendenci (via SQL) para confirmar 1 linha afetada.
- Confirmar que linhas `is_core=true` continuam bloqueadas para desativar/excluir por não-owner (trigger).

## Fora de escopo

- `EditOrderDialog`, Pedido #12, gate.
- Outras tabelas com padrão RLS similar (várias `fin_*` aparecem sem permissive — vou listar no relatório final, mas só corrijo `fin_chart_accounts` agora, pois é a única reclamada).
- Mudanças na trigger de proteção (core continua protegido).

## Entregáveis

- 1 migration nova (policies + backfill defensivo).
- Patch em `ChartAccountsManager.tsx` (maybeSingle + toasts claros).
- Relatório curto: o que estava bloqueando, o que ficou liberado, lista de outras tabelas com o mesmo padrão para revisar depois.
