## Plano — Produção: Trava de Prazo + Histórico de Fases + Fix de Bugs

Escopo grande mas bem delimitado. Vou executar em 5 frentes + sandbox E2E + cleanup, sem pausar entre etapas.

### Frente 1 — Banco de dados (migration única)

**Nova tabela `production_order_phase_history`**
- Colunas: `id`, `tenant_id`, `production_order_id`, `phase`, `entered_at`, `exited_at`, `moved_by`, `direction` (`forward|regress|initial`), `reason`, `created_at`.
- RLS por `tenant_id` (helper `has_tenant_access`).
- GRANTs para `authenticated` e `service_role`.
- Índices: `(production_order_id, entered_at DESC)` e `(tenant_id)`.

**Trigger `production_orders_phase_log`**
- AFTER INSERT: cria registro `initial` com `entered_at = NEW.created_at`.
- AFTER UPDATE OF status: se status mudou → fecha registro anterior (`exited_at = now()`), insere novo. Direção = `forward` se sort_order > anterior, senão `regress`. `moved_by = auth.uid()`.
- SECURITY DEFINER, `search_path = public`.

**Trigger `lock_due_date`**
- BEFORE UPDATE em `production_orders`: se `OLD.due_date IS NOT NULL` e `NEW.due_date != OLD.due_date` e o update **não** vier marcado via `current_setting('app.allow_due_date_change', true) = 'true'` → RAISE EXCEPTION. Assim a única forma de alterar é via modal "Reprogramar OP" que seta esse setting na sessão (ou via RPC dedicada `reprogram_op(op_id, new_due_date, reason)`).
- Optei pela RPC `public.reprogram_op` (mais limpa que GUC): valida permissão, atualiza `due_date`, grava em `audit_log` (`action='reprogram_op'`, metadata com previous/new/reason).

**Config tenant**
- Inserir chave default em `modules_config`: `production.regress_policy = 'supervisor'` para tenants existentes sem a chave.

**Backfill**
- Para toda OP existente sem registro em `production_order_phase_history`: inserir 1 linha `initial` com `entered_at = created_at`, `phase = status atual`. Aplica a Planejados, Mobiliários e demais tenants reais — apenas dados de histórico, não muda nada operacional.

**Auditoria "Caderno Executivo"**
- `SELECT` em `production_phases` filtrando por `name ILIKE '%caderno%'` no tenant Planejados antes de qualquer correção. Se for fase real fica; se for produto migrado errado, remover/renomear via insert tool (data fix, não migration).

### Frente 2 — RPC e helpers

**`public.move_production_phase(op_id, target_phase, reason)`**
- Função única usada por dropdown E drag-drop.
- Carrega `sort_order` atual e alvo. Define `direction`.
- Se `regress`: valida `reason` (≥10 chars) + `regress_policy` do tenant vs role do usuário.
- Atualiza `production_orders.status` (o trigger cuida do histórico).
- Em regress: insere `audit_log`, `cross_module_events` (`production.phase_regress`), `erp_notifications` para supervisores.
- SECURITY DEFINER, `search_path = public`.

**`public.reprogram_op(op_id, new_due_date, reason)`**
- Valida permissão + reason. Atualiza due_date com bypass da trava. Insere audit_log.

### Frente 3 — Frontend

**Hook `useMoveProductionPhase`** (novo, em `useProductionStatusColumns.ts` ou arquivo novo)
- Chama RPC `move_production_phase`. Lida com erro de regress sem reason → abre modal.

**`OpsOrdersTab.tsx`**
- Substituir `useUpdateProductionOrderStatus` por `useMoveProductionPhase` em **ambos** os fluxos: `onDragEnd` e `Select onValueChange`.
- Card redesenhado conforme spec (5 linhas hierárquicas):
  1. `#N - Nome do pedido`
  2. Cliente
  3. Badges: prioridade · tenant · `↩️ N` (se retrocessos > 0, clicável)
  4. Prazo `Xd / Yd` com cor (verde ≤60%, amarelo 61–90%, vermelho >90%/atrasado)
  5. `⏱ tempo na fase atual` (do `phase_history`)
- Remover `Sem prazo` + `0/10d` simultâneos. Se sem due_date → cinza "Sem prazo definido" + botão "Definir prazo".

**Novos dialogs**
- `RegressReasonDialog.tsx`: textarea obrigatória ≥10 chars.
- `ReprogramOpDialog.tsx`: novo due_date + reason.
- `PhaseHistoryDialog.tsx`: lista cronológica das fases com duração, direção e quem moveu.

**Hook novo `useProductionPhaseHistory(opId)`** para query da timeline e cálculo de `tempo na fase atual` + contagem de retrocessos.

### Frente 4 — Sandbox E2E destrutivo

Tenant `Tendenci E2E Sandbox - Produção Trava`. Seed mínimo: 1 cliente, 2 perfis (supervisor + operador), 3 produtos, 3 pedidos com due_dates distintos, 3 OPs em fases Corte/Montagem/Finalização.

Executar via SQL os 8 cenários da tabela do briefing, capturando obtido e status. Cenários 3 e 4 testam a `move_production_phase` com policy variável; cenário 6 valida a trava do due_date; cenário 8 valida que dropdown e drag chamam a mesma RPC (verifico via assertion no banco — phase_history tem 2 linhas novas após as 2 movimentações).

### Frente 5 — Cleanup

`DELETE` em cascata do tenant sandbox e tudo vinculado via `tenant_id`. Verificar contagem=0 em: `tenants`, `production_orders`, `production_order_phase_history`, `orders`, `order_items`, `customers` (clientes), `products`, `profiles` (do seed), `audit_log` (filtrado pelo tenant), `cross_module_events`, `erp_notifications`, `tenant_subscriptions`.

Filtro de segurança em **todo** delete: `name ILIKE '%E2E%'` para tenant; demais deletes por `tenant_id` do sandbox apenas. **Nunca** tocar Planejados/Mobiliários.

### Ordem de execução

1. Migration única (tabela + RLS + GRANTs + triggers + RPCs + backfill + defaults de config).
2. Auditoria + fix de "Caderno Executivo" via insert tool (se confirmado bug de dados).
3. Frontend: hooks + dialogs + redesign do card + unificação dropdown/drag.
4. Sandbox seed + 8 cenários + relatório.
5. Cleanup + verificação 0 em todas as tabelas.
6. Relatório final com tabela, bugs corrigidos, migrations, cleanup.

### Pontos que assumo (sem perguntar para não travar)

- `production_phases` é a fonte de `sort_order` por tenant; se não existir, uso `production_status_columns`.
- Supervisor = role `gestor` ou `admin` na tabela `user_roles`. Operador = `operacional`.
- "Tenant" no badge do card = `tenants.name` da OP (multi-tenant visão owner).
- Trigger só dispara em mudança de `status` (text). Outras colunas não afetam histórico.

Aprova? Em seguida executo tudo direto, começando pela migration.
