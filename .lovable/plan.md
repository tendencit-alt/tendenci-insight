## Objetivo
Mover os filtros para a faixa entre **abas (Registros/Relatórios…)** e os **cards de KPIs**, tornando-os a primeira ação visível em qualquer módulo. Essa posição vira o padrão do ERP via `ModuleShell`.

## Layout final (padrão único)

```text
[ Header: ícone + título + descrição ················· Ações ]
[ Abas: Registros | Relatórios | … ]
[ FILTROS — faixa única, sticky leve ]      ← nova posição padrão
[ KPIs (cards) ]                             ← só na aba Registros
[ Conteúdo da aba ativa (tabela / relatórios) ]
```

Regras:
- Filtros aparecem sempre logo abaixo das abas, independente da aba ativa.
- Os cards de KPIs continuam no topo de Registros, mas agora **abaixo** dos filtros.
- Em Relatórios, os filtros do módulo se aplicam também ao dashboard (mesma fonte de verdade).

## Mudanças

### 1. `src/components/layout/ModuleShell.tsx`
- Adicionar slot opcional `filters?: ReactNode`.
- Renderizar `filters` numa faixa fixa logo após o `TabsList` e antes do `TabsContent`, com estilo enxuto (`rounded-lg border bg-card/50 p-2 md:p-3`).
- Remover a injeção implícita de `overview` dentro de `records` quando `filters` estiver presente — a ordem passa a ser: filtros → KPIs (overview) → tabela (records).

### 2. `src/pages/Orders.tsx`
- Tirar `<OrdersFilters />` de dentro do slot `records`.
- Passar via novo prop: `filters={<OrdersFilters filters={filters} onFiltersChange={setFilters} />}`.
- `records` fica só com `<OrdersTable />`.

### 3. Aplicar o padrão nas demais páginas que já usam ModuleShell + filtros próprios
Mover o componente de filtros de dentro de `records=` (ou de tabs internas) para o novo slot `filters=`:
- `src/pages/Production.tsx` → `ProductionFilters`
- `src/pages/Suppliers.tsx` → `SuppliersFilters`
- `src/pages/Inventory.tsx` → `InventoryFilters`
- `src/pages/Financeiro.tsx` → `FinanceiroFilters` (hoje renderizado no topo do records; passar para o slot)
- `src/pages/Clientes.tsx`, `src/pages/Produtos.tsx`, `src/pages/Leads.tsx` → extrair a barra de filtros inline para o slot

Páginas sem filtros estruturados (CRM, Cadastros, RH, Suprimentos, Projetos, Relatórios) ficam como estão — slot opcional, nada quebra.

### 4. Pequenos ajustes visuais
- `OrdersFilters` perde a borda/wrap externos (o slot já fornece o container).
- `OrdersKPIs` continua igual.

## Fora do escopo
- Não mexer nas queries nem nos componentes de filtro em si (só na posição).
- Não alterar layout do CRM (que já tem topbar própria com atalhos).
- Sem mudanças em RLS, schema ou edge functions.

## Validação
- Em `/pedidos?section=records`: filtros aparecem entre abas e os 4 cards (Pedidos / Valor Total / Em Produção / Ticket Médio).
- Em `/pedidos?section=reports`: filtros continuam visíveis logo abaixo das abas, aplicando-se ao relatório.
- Mesmo padrão verificado em Produção, Fornecedores, Estoque, Financeiro, Clientes, Produtos, Leads.
