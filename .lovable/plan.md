## Objetivo

Tornar o Plano de Contas (conta 2.3 "Custos diretos da venda") a fonte única dos "Compromissos sobre Venda". As subcategorias cadastradas em 2.3 — com percentual padrão configurável — aparecerão automaticamente na criação do pedido, pré-preenchidas e editáveis.

## O que já existe (reaproveitar)

- Pedido (`CreateOrderDialog` / `OrderCompromissosCard`) já lê os compromissos do hook `useCompromissosVendaCategories`, que consulta filhos da conta `2.3`.
- Tabela `fin_strategic_resource_account_configs` já guarda `chart_account_id`, `active`, `default_percentage`.
- Aba "Compromissos Sobre Venda" (`StrategicResourceCategoriesManager`) já lista filhos de 2.3 e edita ativo/percentual.

## O que falta (a fazer)

### 1. Banco — semear subcategorias em 2.3

Inserir 6 contas filhas em `fin_chart_accounts` sob `code = '2.3'` para todos os tenants existentes, com `is_core = false` (permite edição/exclusão manual pelo usuário):

```
2.3.1  Comissão vendedor
2.3.2  Premiação de terceiros
2.3.3  Comissão de parceiros
2.3.4  Bônus comercial
2.3.5  Comissão de representantes
2.3.6  Afiliados e indicações
```

Criar entrada correspondente em `fin_strategic_resource_account_configs` com `active = true` e `default_percentage` inicial (0). Usuário ajusta depois.

Atualizar `supabase/functions/seed-chart-of-accounts/index.ts` (`COMMON_ROOTS` / template comum) para garantir que novos tenants já recebam essa estrutura.

### 2. Plano de Contas — coluna "% padrão" sincronizada

Em `ChartAccountsManager.tsx`, para contas filhas de 2.3:
- Mostrar input numérico "% padrão" na linha.
- Mostrar toggle "Ativo no pedido".
- Persistir via `fin_strategic_resource_account_configs` (mesmo upsert usado em `StrategicResourceCategoriesManager`).
- Ao salvar, invalidar queries `["compromissos-venda-categories"]`, `["fin-strategic-resource-account-configs"]` e `["strategic-resource-defaults"]` para refletir na aba dedicada e no pedido em tempo real.

### 3. Aba "Compromissos Sobre Venda" — manter sincronia

Nenhuma mudança estrutural: já lê de 2.3 e grava em `fin_strategic_resource_account_configs`. Garantir que invalida as mesmas query keys do item 2 para refletir no Plano de Contas.

### 4. Criação do pedido — sem alterações de lógica

`buildInitialCompromissos` já gera estado pré-preenchido a partir das categorias + `defaultPercentage`. `OrderCompromissosCard` já permite edição manual linha-a-linha. Apenas confirmar visualmente que tudo aparece após o seed.

## Arquivos afetados

- `supabase/migrations/*` (nova) — seed das 6 contas filhas em 2.3 para tenants atuais + configs default.
- `supabase/functions/seed-chart-of-accounts/index.ts` — incluir filhos de 2.3 no template comum.
- `src/components/financeiro/masters/ChartAccountsManager.tsx` — coluna % padrão + toggle para filhos de 2.3.
- `src/components/financeiro/masters/StrategicResourceCategoriesManager.tsx` — adicionar invalidação cruzada de cache.

## Comportamento final

- Admin abre **Configurações → Plano de Contas**, expande "2.3 Custos diretos da venda", vê as 6 categorias com input "% padrão" e toggle de ativo.
- Edita ali OU na aba "Compromissos Sobre Venda" — ambos sincronizados.
- Pode criar, renomear ou excluir subcategorias de 2.3 manualmente — refletem automaticamente no pedido.
- Ao criar novo pedido, o card "Compromissos sobre Venda" lista as categorias ativas com % pré-preenchido e permite edição pontual sem alterar o padrão global.
