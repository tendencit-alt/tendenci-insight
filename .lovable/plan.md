## Objetivo

Unificar as duas abas atuais em **Cadastros Financeiros** — "Compromissos Sobre Venda" e "Responsáveis" — em uma única aba "Compromissos Sobre Venda", onde o cadastro de responsáveis fica embutido e é reutilizado nos Pedidos.

## Mudanças

### 1. `src/pages/CadastrosFinanceiros.tsx`
- Remover o `TabsTrigger` e o `TabsContent` da aba `responsibles`.
- Remover `responsibles` do conjunto `RECORDS_TABS`.
- Atualizar a descrição do módulo para refletir a unificação.
- Manter o import do `OrderResponsiblesManager` (usado agora dentro de Compromissos).

### 2. `src/components/financeiro/masters/StrategicResourceCategoriesManager.tsx`
- Estruturar o conteúdo em duas seções dentro do mesmo card / página:
  1. **Categorias (Plano de Contas 2.2)** — bloco atual com switch, %, centro de custo (sem alterações funcionais).
  2. **Responsáveis vinculados** — renderizar `<OrderResponsiblesManager />` logo abaixo, com título "Responsáveis para uso nos Pedidos" e um texto curto explicando que estes responsáveis aparecem no seletor de cada compromisso ao criar/editar um Pedido.
- Separação visual com `Separator` e espaçamento adequado.

### 3. Comportamento nos Pedidos
- Nenhuma mudança lógica necessária: `OrderCompromissosCard` já consome `useOrderResponsibles()`, que lê a mesma tabela `order_responsibles` que o `OrderResponsiblesManager` alimenta. A unificação é apenas de UI/cadastro.

### 4. Roteamento / Deep links
- Qualquer URL antiga `?tab=responsibles` cai no fallback `bank-accounts`. Para preservar links, mapear `responsibles` → `commitments` em `CadastrosFinanceiros.tsx` (redirect simples no `useEffect` ou no cálculo de `recordsTab`).

## Fora de escopo
- Schema do banco (tabelas `order_responsibles` e `fin_strategic_resource_account_configs` permanecem como estão).
- Lógica de comissão / provisões financeiras.
- Telas de Pedidos (Create/Edit/Detail) — continuam funcionando sem alterações.
