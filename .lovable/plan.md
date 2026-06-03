
# Plano: Comunicação Produção ↔ Cronograma + Integração 100% entre abas

Escopo grande e estruturalmente delicado (mexe em schema de produção, UI de timeline, navegação cruzada e ciclo E2E completo). Antes de executar, alinho o plano abaixo. Faço tudo em sequência sem pedir confirmação extra — exceto se aparecer um DROP fora do tenant sandbox.

## 0. Achados rápidos da exploração

- `production_phase_templates` (por tenant + por tipo de produção): aqui já existem `sla_hours` e `sla_dias_uteis`. **É aqui que entra `duration_days`** (não em `production_phases`, que é a instância por OP).
- `production_phases` (por OP): instância de fase ligada ao template. Aqui entra `planned_duration_days`, `planned_start`, `planned_end` (override por OP). Isso substitui a necessidade de uma tabela nova `production_order_phase_plan` — só criamos a tabela se o usuário preferir separar; por padrão, mantenho enxuto e uso colunas adicionais em `production_phases`.
- `production_order_phase_history` já existe (transições com `entered_at`/`exited_at`/`direction`).
- Aba Cronograma hoje é praticamente vazia (só sub-abas Planejamento/Execução stub). Vamos transformar em Gantt real.
- A nomenclatura do briefing fala em `production_phases` para definição por tenant; vou tratar isso como **`production_phase_templates`** (definição) + **`production_phases`** (instância por OP) para não quebrar o que já existe.

## 1. Schema (migration única, aditiva)

```text
ALTER production_phase_templates
  ADD COLUMN duration_days int          -- prazo planejado da fase (por tenant/tipo)
;

ALTER production_phases
  ADD COLUMN planned_duration_days int  -- override por OP
  ADD COLUMN planned_start timestamptz
  ADD COLUMN planned_end   timestamptz
;

-- View consolidada para Cronograma (fonte única)
CREATE OR REPLACE VIEW v_production_timeline AS
SELECT
  po.id, po.tenant_id, po.order_number, po.title, po.status, po.priority,
  po.client_id, po.planned_start_date, po.planned_end_date,
  po.actual_start_date, po.actual_end_date, po.current_phase_id,
  -- fase atual + tempo na fase a partir do phase_history aberto
  -- ETA = max(planned_end_date, now() + soma(duration restante das fases))
  ...
FROM production_orders po;

-- RPC: get_production_timeline(_tenant_id) → JSON com OPs + segmentos por fase + ETA
-- SECURITY DEFINER, search_path = public, valida acesso por has_tenant_access().

-- Backfill conservador em tenants reais (Planejados, Mobiliários e demais não-E2E):
UPDATE production_phase_templates
  SET duration_days = COALESCE(
    NULLIF(sla_dias_uteis,0),
    CEIL(sla_hours::numeric/24),
    7
  )
WHERE duration_days IS NULL;
```

GRANTs e RLS reaproveitam as policies das tabelas-base. Nenhuma alteração em `production_orders`.

## 2. Hook compartilhado (fonte única no frontend)

`src/hooks/useProductionTimeline.ts`:
- Query única chamando `get_production_timeline`.
- Retorna `{ ops, kpis }` derivados — Produção (Kanban/Lista) e Cronograma consomem o mesmo hook → KPIs ficam idênticos por construção.
- Realtime: subscribe em `production_orders` e `production_order_phase_history` → invalidate query.

`src/hooks/useProductionKPIs.ts` (reaproveita timeline): em produção / aguardando / atrasadas / alerta de prazo / concluídas / % concluídas — usado em Produção, Cronograma e Custos&Analytics.

## 3. Nova aba Cronograma (Gantt)

Substitui o stub atual. Componentes novos em `src/components/ops/timeline/`:

- `TimelineGantt.tsx` — uma linha por OP, segmentos coloridos por fase (cor vem de `production_phase_templates.color`), barra de progresso na fase atual, linha tracejada vermelha no `planned_end_date`. Render virtualizado (react-window) quando >100 OPs.
- `TimelineFilters.tsx` — cliente, prioridade, fase atual, atrasadas, período (semana/mês/trimestre), densidade (compacto/normal/expandido), agrupamento (cliente/fase/prioridade).
- `TimelineHeader.tsx` — escala temporal (dia/semana/mês conforme zoom).
- `OpTimelineDrawer.tsx` — drawer lateral com: pedido + cliente, produto, fase atual + % consumido, tempo na fase (Xd Yh), próxima fase + duração planejada, ETA + desvio vs `planned_end_date`, lista de fases anteriores com tempo real, botão **"Abrir no Kanban"** (navega `/producao-operacoes?tab=producao&op={id}`).

Cores ETA: verde se `eta ≤ planned_end_date`, amarelo se `eta` dentro de 10% do prazo, vermelho se `eta > planned_end_date`.

## 4. Integração entre abas

- Produção (Kanban) → cada `ProductionCard` ganha botão "Ver no Cronograma" que navega `/producao-operacoes?tab=cronograma&op={id}` e abre o drawer.
- Cronograma → "Abrir no Kanban" faz o caminho inverso e dá scroll/highlight no card.
- `ProducaoOperacoes.tsx` lê `?tab=` e `?op=` da URL para coordenar foco entre abas.
- Detalhe da OP (`ProductionOrderDetailSheet`) ganha tab interna **"Cronograma desta OP"** com timeline individual (fases concluídas + atual + previstas).

## 5. E2E sandbox + 10 testes

Script SQL único (via `code--exec` + `psql`) que:
1. Cria tenant `Tendenci E2E Sandbox - Producao Cronograma`.
2. Seed: 1 cliente, 3 produtos, 3 pedidos, 3 OPs em fases distintas, com `planned_end_date` diferentes.
3. Configura `production_phase_templates.duration_days` (ex: 3, 5, 4, 2).
4. Roda os 10 testes — todos como SQL/RPC comparando "esperado vs obtido". Cada teste retorna `✅/❌`.
5. Coleta KPIs (Produção, Cronograma, Custos&Analytics) — mesmos valores via mesmo hook.

## 6. Cleanup destrutivo (apenas tenant sandbox)

`DELETE` em cascata via `tenant_id` em todas as tabelas com `tenant_id`. Filtro de segurança: `name ILIKE '%E2E Sandbox%'`. Reporto contagem=0 por tabela. **Não toco em Planejados, Mobiliários nem qualquer tenant real**.

## 7. Backfill em tenants reais

Apenas `UPDATE production_phase_templates SET duration_days = ...` conservador (descrito na migração). Sem mexer em `production_orders`, `production_phases` ou qualquer dado operacional.

## 8. Relatório final

Tabelas:
- 10 testes (esperado | obtido | status).
- Cleanup (tabela | contagem) — todas 0.
- KPIs (KPI | Produção | Cronograma | Custos&Analytics | Match).
- Bugs encontrados / corrigidos.
- Migrations criadas.
- Status final.

## Arquivos criados/alterados (estimado)

```
NEW   supabase/migrations/<ts>_production_timeline.sql
NEW   src/hooks/useProductionTimeline.ts
NEW   src/hooks/useProductionKPIs.ts
NEW   src/components/ops/timeline/TimelineGantt.tsx
NEW   src/components/ops/timeline/TimelineFilters.tsx
NEW   src/components/ops/timeline/TimelineHeader.tsx
NEW   src/components/ops/timeline/OpTimelineDrawer.tsx
NEW   src/components/ops/timeline/OpTimelineMini.tsx     (usado dentro do detail sheet)
EDIT  src/components/ops/OpsCronogramaTab.tsx            (substitui stub)
EDIT  src/pages/ProducaoOperacoes.tsx                    (sincronia ?tab&op)
EDIT  src/components/production/ProductionKanban.tsx     (botão "Ver no Cronograma" + scroll/highlight)
EDIT  src/components/production/ProductionKPIs.tsx       (passa a usar useProductionKPIs)
EDIT  src/components/production/ProductionOrderDetailSheet.tsx (tab cronograma individual)
EDIT  src/components/ops/OpsCostsTab.tsx / OpsAnalyticsTab.tsx (KPIs unificados)
```

## Pontos de atenção / decisões já tomadas

1. **Nomenclatura**: `production_phases` no briefing = `production_phase_templates` no schema atual. Mantenho as duas (template = definição por tenant; phase = instância por OP). Isso preserva tudo da rodada anterior.
2. **Sem `production_order_phase_plan` separada** — uso colunas em `production_phases` (instância). Se quiser tabela separada depois, é trivial migrar.
3. **Virtualização**: react-window já está no projeto? Verifico no primeiro passo; se não, instalo.
4. **Realtime**: já temos publicação em `cross_module_events`; adiciono `production_orders` e `production_order_phase_history` se ainda não estiverem.

---

Se aprovar, executo na ordem: (1) migration → (2) hooks compartilhados → (3) UI Gantt + drawer → (4) integração entre abas → (5) detail sheet com timeline individual → (6) E2E sandbox + 10 testes → (7) cleanup → (8) backfill tenants reais → (9) relatório final consolidado.
