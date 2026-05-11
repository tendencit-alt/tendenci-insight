
## Diagnóstico atual

Hoje a navegação mostra inconsistências entre **AppNavbar** (menu superior) e **AppSidebar** (lateral, grupo "Vendas"):

| Item               | AppNavbar (Comercial) | AppSidebar (Vendas)        | Rota existe? |
|--------------------|------------------------|----------------------------|--------------|
| CRM & Pipeline     | ❌ ausente             | ✅ ativo                    | `/crm-comercial` |
| Pedidos            | ✅ único ativo         | ✅ ativo                    | `/pedidos` |
| Clientes           | 🔒 Coming Soon         | ✅ ativo                    | `/clientes` |
| Leads              | ❌ ausente             | ❌ ausente                  | `/leads` (existe!) |
| Catálogo Produtos  | ❌ ausente             | ❌ ausente                  | `/catalogo` (existe!) |
| Orçamentos/Propostas | 🔒 Coming Soon       | 🔒 Coming Soon              | não |
| Contratos          | 🔒 Coming Soon         | 🔒 Coming Soon              | não |
| Comissões          | 🔒 Coming Soon         | 🔒 Coming Soon              | não |
| Forecast Comercial | ❌ ausente             | ✅ (alias /crm-comercial)   | aba em CRM |

> Por isso, dentro do menu **Comercial** do AppNavbar, o usuário só vê **Pedidos** habilitado.

## Estrutura proposta (Comercial — 7 abas canônicas)

Ordem segue o ciclo de vida da venda (topo do funil → pós-venda):

1. **CRM & Pipeline** — `/crm-comercial` (já existe, com sub-abas Pipeline / Propostas / Forecast / Analytics)
2. **Leads** — `/leads` (já existe, hoje órfão da navegação)
3. **Orçamentos / Propostas** — `/propostas` (Coming Soon, mantém visível desabilitado)
4. **Pedidos** — `/pedidos` (ativo)
5. **Contratos** — `/contratos` (Coming Soon)
6. **Clientes** — `/clientes` (ativo, promover ao menu superior)
7. **Catálogo de Produtos** — `/catalogo` (já existe, hoje órfão)
8. **Comissões** — `/comissoes` (Coming Soon — integra com Order Responsibles e Plano de Contas 2.4)

Itens "Coming Soon" permanecem visíveis com baixa opacidade (regra de UI Visibility).

## Mudanças concretas

**`src/components/layout/AppNavbar.tsx`** — substituir `items` do grupo `comercial` pela lista acima, marcando `available: true` para CRM, Leads, Pedidos, Clientes e Catálogo; demais como `available: false`.

**`src/components/layout/AppSidebar.tsx`** — alinhar grupo "Vendas" com a mesma ordem e nomes; adicionar **Leads** e **Catálogo de Produtos** (faltantes); remover duplicação "Forecast Comercial" (já é aba interna do CRM).

**`src/pages/HomeLauncher.tsx`** — adicionar entradas rápidas no grupo "Vendas": Leads, Catálogo, Orçamento (quando disponível).

## Pontos a confirmar com você

- **Leads vs CRM**: Leads pode virar uma aba dentro de `/crm-comercial` em vez de menu separado. Prefere consolidar ou manter separado?
- **Catálogo**: ele é produto (Operações) ou venda (Comercial)? Atualmente está acessível por `/catalogo` mas sem menu — proponho duplicar atalho em ambos.
- **Forecast Comercial**: manter apenas como aba interna de CRM (recomendado) ou expor no menu superior?
- **Comissões**: priorizar como próximo módulo a sair do "Coming Soon" (já temos Order Responsibles + plano de contas 2.4 prontos)?

Após sua aprovação, implemento as 3 alterações de navegação e podemos abrir uma sequência de tarefas para tirar Comissões/Orçamentos do Coming Soon.
