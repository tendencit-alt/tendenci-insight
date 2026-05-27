# Hub unificado Clientes/Fornecedores

## Objetivo
Apresentar Clientes e Fornecedores como um único hub na navegação, mantendo as tabelas `clients` e `suppliers` separadas no banco (zero risco para Pedidos, Financeiro, Compras, Comissões).

## Decisões já tomadas
- **Modelo:** Hub visual unificado — sem refatoração de banco.
- **Entrada na navegação:** o item atual "Clientes" passa a se chamar **"Clientes/Fornecedores"**, no mesmo lugar (grupo Comercial / sidebar e navbar). Item separado "Fornecedores" no grupo Operacional é removido.
- **Rota canônica:** `/clientes-fornecedores` com aba ativa via querystring (`?tab=clientes` | `?tab=fornecedores`). `/clientes` e `/fornecedores` continuam funcionando via redirect para a aba correta (compatibilidade com links, focos `?focus=` e busca global).

## Estrutura da página
```text
┌─ Clientes / Fornecedores ──────────────────────────────┐
│ [ Clientes ] [ Fornecedores ]            [+ Novo ▼]    │
│                                                        │
│  KPIs da aba ativa                                     │
│  Filtros da aba ativa                                  │
│  Tabela da aba ativa                                   │
└────────────────────────────────────────────────────────┘
```
- Botão "+ Novo" é um dropdown: **Novo Cliente** / **Novo Fornecedor** (reaproveita `CreateClientDialog` e `CreateSupplierDialog` existentes).
- Cada aba mantém integralmente seu conteúdo atual: KPIs, filtros, tabela, detail sheet — nenhum componente de Clientes ou Fornecedores é reescrito.
- Selo na linha indica se o contato também existe no outro lado (match por `cpf_cnpj` quando preenchido) com link rápido "ver como fornecedor/cliente". Sem migração de dados, é só uma consulta auxiliar.

## Mudanças técnicas

### Rotas (`src/App.tsx` ou onde estão as rotas)
- Nova rota `/clientes-fornecedores` → novo componente `ClientesFornecedores.tsx`.
- `/clientes` → redireciona para `/clientes-fornecedores?tab=clientes` preservando querystring (`focus`, etc.).
- `/fornecedores` → redireciona para `/clientes-fornecedores?tab=fornecedores` preservando querystring.

### Novo arquivo: `src/pages/ClientesFornecedores.tsx`
- `DashboardLayout` + `ModuleShell` com título "Clientes / Fornecedores".
- `Tabs` controladas por `searchParams.tab` (default `clientes`).
- Cada `TabsContent` monta o conteúdo das páginas atuais (`Clientes.tsx` e `Suppliers.tsx`) extraindo seus blocos internos (KPIs, filtros, tabela, dialogs) sem duplicar lógica. As páginas originais podem se tornar wrappers finos que reusam os mesmos blocos.

### Navegação
- `src/components/layout/AppNavbar.tsx`: renomear entrada "Clientes" para "Clientes/Fornecedores" apontando para `/clientes-fornecedores`. Remover entrada "Fornecedores" do grupo "Fornecedores & Estoque" (grupo pode ser renomeado para apenas "Estoque" se ficar só com Estoque).
- Sidebar equivalente (`AppSidebar` / config de navegação): mesma mudança.
- `GlobalSearch`: rotas de cliente/fornecedor passam a apontar para `/clientes-fornecedores?tab=...&focus=...`.

### Busca cruzada (opcional, leve)
- Hook `useContactCrossLink(cpfCnpj)` que faz duas queries pequenas (`clients` e `suppliers` por `cpf_cnpj`) e devolve `{ asClient, asSupplier }`. Usado nas tabelas para mostrar o selo "também é fornecedor/cliente".

## O que NÃO muda
- Schema do banco: `clients` e `suppliers` continuam intactos.
- Pedidos, AP/AR, Compras, Comissões, `OrderResponsiblesManager`, edge functions: nenhuma alteração.
- Permissões: o hub respeita as permissões já existentes de cada módulo (a aba Fornecedores só aparece para quem tem acesso).

## Riscos e mitigação
- **Links antigos** (`/clientes`, `/fornecedores`, `?focus=`): cobertos pelos redirects que preservam querystring.
- **Permissões assimétricas** (usuário com acesso só a Clientes): esconder a aba Fornecedores quando o usuário não tem permissão `suppliers.view`, e vice-versa. Se só tiver uma, abre direto nela.
- **Testes em `src/test/redirects.test.ts`**: adicionar casos para os dois novos redirects.

## Entregáveis
1. `src/pages/ClientesFornecedores.tsx` (novo).
2. Refator leve em `Clientes.tsx` e `Suppliers.tsx` para exportar blocos reusáveis (ou converter em wrappers).
3. Atualização de rotas com redirects.
4. Atualização de `AppNavbar` e sidebar.
5. Ajuste do `GlobalSearch` para as novas URLs.
6. Selo cruzado por `cpf_cnpj` (opcional, mas recomendado — é barato).
7. Testes de redirect.
