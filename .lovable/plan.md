# Auditoria Plano de Contas — 4 correções estruturais

Sem deletar dados. Tudo aditivo (ALTER ADD COLUMN, INSERT … ON CONFLICT DO NOTHING, UPDATE em backfill).

---

## PROBLEMA 1 — Seed analítico + colunas `pai_codigo` e `grupo_fluxo`

**Migração** (`supabase/migrations/...`):
- `ALTER TABLE fin_chart_accounts ADD COLUMN IF NOT EXISTS pai_codigo TEXT` — código do pai denormalizado (ex: `2.4` para `2.4.1`).
- `ALTER TABLE fin_chart_accounts ADD COLUMN IF NOT EXISTS grupo_fluxo TEXT` — categoriza para Fluxo de Caixa: `OPERACIONAL_ENTRADA`, `OPERACIONAL_SAIDA`, `INVESTIMENTO_ENTRADA`, `INVESTIMENTO_SAIDA`, `FINANCIAMENTO_ENTRADA`, `FINANCIAMENTO_SAIDA`, `NAO_CAIXA`.
- Trigger `BEFORE INSERT/UPDATE` que preenche `pai_codigo` automaticamente via JOIN no `parent_id`.
- Backfill: `UPDATE fin_chart_accounts SET pai_codigo = (SELECT code FROM fin_chart_accounts p WHERE p.id = fin_chart_accounts.parent_id)`.
- Backfill `grupo_fluxo` por raiz: 1.* → OPERACIONAL_ENTRADA; 2.*/3.* → OPERACIONAL_SAIDA; 4.* → NAO_CAIXA; 5.1 → OPERACIONAL_ENTRADA, 5.2 → OPERACIONAL_SAIDA; 6.1/6.3 → FINANCIAMENTO_ENTRADA, 6.2/6.4 → FINANCIAMENTO_SAIDA.

**Seed analítico** (INSERT … ON CONFLICT DO NOTHING) — adiciona ~30 contas folha que faltam para classificação real:
- `1.1.1` Venda à vista, `1.1.2` Venda a prazo
- `1.2.1` Serviço PF, `1.2.2` Serviço PJ
- `2.1.1` ICMS, `2.1.2` ISS, `2.1.3` PIS/COFINS, `2.1.4` Simples Nacional
- `2.2.1` Taxa cartão crédito, `2.2.2` Taxa cartão débito, `2.2.3` Taxa Pix, `2.2.4` Taxa boleto
- `2.4.1` Comissão vendedor interno, `2.4.2` Comissão representante
- `3.1.1` Salários, `3.1.2` Encargos, `3.1.3` Benefícios, `3.1.4` Pró-labore
- `3.2.1` Aluguel, `3.2.2` Energia, `3.2.3` Água, `3.2.4` Internet
- `3.3.1` SaaS/Licenças, `3.3.2` Hospedagem
- `3.4.1` Mídia paga, `3.4.2` Material gráfico
- `3.5.1` Contabilidade, `3.5.2` Jurídico
- `5.1.1` Juros recebidos, `5.1.2` Rendimento aplicações
- `5.2.1` Juros pagos, `5.2.2` IOF

Todas com `is_core=true`, `tenant_id=NULL` (template do sistema), `active=true`.

---

## PROBLEMA 2 — DRE renderizada (`src/components/financeiro/DRETab.tsx`)

Corrigir os bugs de renderização sem mexer em consultas:
1. **Linha calculada `=RL2` (Receita Líquida 2)** — atualmente ausente. Adicionar após raiz `2`: `RL2 = Σ(1) − Σ(2)`.
2. **Ordem dos blocos** — forçar ordenação numérica natural do `code` (1,2,3,4,5,6) usando `numericCodeSort` em vez da string sort atual.
3. **Mostrar EBIT explicitamente** — `EBIT = RL2 − Σ(3) − Σ(4)` (já calculado como "Resultado Operacional" mas com label genérico; renomear para "EBIT (Resultado Operacional)").
4. **Mostrar RAC (Resultado Antes de Capital)** — `RAC = EBIT + Σ(5)`. Adicionar linha calculada antes do bloco 6 com destaque visual.

Linhas calculadas seguem o padrão visual já existente de `Lucro Bruto` (font-bold, fundo `bg-muted/30`, badge `=`).

---

## PROBLEMA 3 — Fluxo de Caixa puxar do banco (`src/components/financeiro/CashflowTab.tsx`)

Substituir o array hardcoded de blocos pela leitura de `fin_chart_accounts.grupo_fluxo`:
- Query: `fin_ledger_entries` agrupado por `chart_account_id` → JOIN `fin_chart_accounts` → agrupa por `grupo_fluxo`.
- Renderiza dinamicamente os 7 blocos do método indireto: Operacional (entradas/saídas), Investimento (entradas/saídas), Financiamento (entradas/saídas), Variação Líquida.
- Mantém a UI atual (cards + tabela), só troca a fonte de dados.
- Fallback: se `grupo_fluxo` for NULL, exibe em "Não Classificados" (warning amarelo) com link para classificar.

---

## PROBLEMA 4 — `conta_plano_codigo` em AP/AR + triggers de classificação

**Migração**:
- `ALTER TABLE fin_payables ADD COLUMN IF NOT EXISTS conta_plano_codigo TEXT`
- `ALTER TABLE fin_receivables ADD COLUMN IF NOT EXISTS conta_plano_codigo TEXT`
- Backfill via JOIN `chart_account_id → fin_chart_accounts.code`.
- Trigger `BEFORE INSERT/UPDATE` em ambas que preenche `conta_plano_codigo` sempre que `chart_account_id` mudar.
- Índice `idx_fin_payables_conta_codigo` e `idx_fin_receivables_conta_codigo` para queries por prefixo (`code LIKE '2.4.%'`).

**Atualizar triggers existentes** (`create_payable_from_purchase_order`, `create_receivable_from_order`) para já gravar `conta_plano_codigo` na criação (evita um round-trip).

---

## Tech notes

- Migrações idempotentes (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).
- Nenhum DROP/DELETE.
- Tipos do Supabase regeneram automaticamente após a migração.
- Componentes DRE/Cashflow são edits in-place (>1900 linhas combinadas) — mudanças cirúrgicas em renderização e fonte de dados, não rewrite.

## Ordem de execução

1. Migração única consolidando schema (1 + 4) + seed (1) + triggers (1 + 4).
2. Após approval da migração: edits em DRETab.tsx (2) e CashflowTab.tsx (3).
