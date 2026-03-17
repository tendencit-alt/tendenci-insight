

## Plano: Lançamentos financeiros completos a partir do Pedido

### Situação atual
O trigger `create_receivable_from_order` cria apenas **1 lançamento de RECEITA** com o `valor_total` do pedido. Não gera lançamentos para as despesas (taxa cartão, RT, vendedor, orçamentista, projetista, montador) e não preenche `cost_center_id`, `project_id` ou `payment_method` nos registros financeiros.

### Solução
Reescrever o trigger `create_receivable_from_order()` para gerar **múltiplos lançamentos** com rastreabilidade completa:

#### Lançamentos gerados automaticamente:

1. **RECEITA principal** — `valor_total` do pedido (já existe, será enriquecida)
2. **DESPESA — Taxa Cartão** — `taxa_cartao_valor` (se `taxa_cartao_responsavel = 'tendenci'` e valor > 0)
3. **DESPESA — Taxa Boleto** — `taxa_boleto_valor` (se `taxa_boleto_responsavel = 'tendenci'` e valor > 0)
4. **DESPESA — RT** — `rt_valor` (se `rt_habilitado = true` e valor > 0)
5. **DESPESA — Vendedor** — `comissao_vendedor_valor` (se valor > 0)
6. **DESPESA — Orçamentista** — `comissao_orcamentista_valor` (se valor > 0)
7. **DESPESA — Projetista** — `comissao_projetista_valor` (se valor > 0)
8. **DESPESA — Montador** — `comissao_montador_valor` (se valor > 0)

#### Campos preenchidos em TODOS os lançamentos:
- `cost_center_id` — resolvido a partir de `orders.centro_custo` (nome) → busca `fin_cost_centers.id` por nome
- `project_id` — copiado diretamente de `orders.project_id`
- `document_number` — `PED-{order_number}`
- `party_id` / `party_type` — `client_id` / `'client'`
- `competence_date` — data de emissão do pedido
- `notes` — descrição detalhada com percentuais e responsáveis
- `parent_entry_id` — despesas vinculadas ao lançamento principal de receita

#### Campos preenchidos no Receivable (`fin_receivables`):
- `cost_center_id` e `project_id` também serão preenchidos

### Alteração necessária

**1 migration SQL** que recria a função `create_receivable_from_order()`:
- Declara variável `v_cost_center_id` resolvida via `SELECT id FROM fin_cost_centers WHERE name = NEW.centro_custo LIMIT 1`
- Insere o lançamento principal de RECEITA com todos os campos
- Para cada despesa com valor > 0, insere um `fin_ledger_entries` do tipo `DESPESA` com `parent_entry_id` apontando para a receita principal
- Para cada comissão, insere também um `fin_payables` vinculado ao lançamento de despesa (com `supplier_id` = responsável da comissão quando disponível)
- Preenche `cost_center_id` e `project_id` no `fin_receivables`

### Resultado
Ao aprovar/faturar um pedido, o Financeiro receberá automaticamente todos os lançamentos discriminados (receita + despesas), com centro de custo, projeto, e rastreabilidade completa do pedido original.

