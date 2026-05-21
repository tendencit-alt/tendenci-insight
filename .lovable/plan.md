# Relatórios de Pedidos

Hoje a aba **Relatórios** em `/pedidos` está vazia ("Em breve"). A proposta é preencher esse slot com um painel didático focado no que o dono do negócio realmente precisa enxergar todo dia/mês — sem virar mais um "mini-BI" duplicando o Dashboard.

## Princípios

- **Tudo em uma tela só**, com um filtro global de período no topo (Hoje · 7d · Este mês · 30d · Customizado) — sem sub-abas.
- **Cada bloco responde uma pergunta de negócio** em linguagem simples.
- **Drill-down**: clicar em qualquer linha/barra abre os pedidos correspondentes na aba Registros já filtrados.
- **Export CSV** por bloco (botão discreto no cabeçalho de cada card).
- Visual coerente com o resto: tokens semânticos, sem gradientes/emojis.

## Os 6 relatórios

### 1. Resumo do período (linha de KPIs)
Faixa horizontal compacta no topo, comparando com o período anterior (variação % colorida):
- Pedidos emitidos · Faturamento bruto · Ticket médio · Taxa de conversão (recebidos → aprovados) · Tempo médio até aprovação

### 2. Evolução de vendas
Gráfico de barras (dia ou mês conforme período). Mostra: nº de pedidos + valor faturado. Tendência ajuda a ver sazonalidade.

### 3. Ranking de vendedores
Tabela compacta: Vendedor · Pedidos · Faturamento · Ticket médio · % do total. Ordenada por faturamento. Atende quem precisa decidir comissão e meta.

### 4. Vendas por Centro de Custo
Tabela ou barras horizontais agregando `order_items.centro_custo`. Mostra de onde vem a receita (qual unidade de negócio vende mais). Útil para mix de produto.

### 5. Top clientes
Tabela: Cliente · Nº pedidos · Faturamento · Último pedido. Top 20. Identifica concentração de receita e ajuda em ações de relacionamento.

### 6. Pedidos por status (funil)
Mini-funil horizontal: Rascunho → Confirmado → Em produção → Entregue → Cancelado. Cada barra clicável abre Registros filtrado pelo status. Mostra onde os pedidos "travam".

## O que NÃO vamos colocar aqui

- Análise financeira (DRE/Cashflow) → já vive no módulo BI.
- Performance de produção (OPs, prazos) → módulo Produção.
- Forecast de vendas → CRM (Visão Gestor).

Isso evita duplicar dados e mantém o relatório de Pedidos focado em **o que foi vendido e por quem**.

## Implementação (técnico)

- Novo componente `src/components/orders/OrdersReports.tsx` agrupando os 6 blocos.
- Componentes filhos por bloco: `ReportKPIs`, `ReportSalesChart`, `ReportSellerRanking`, `ReportByCostCenter`, `ReportTopClients`, `ReportStatusFunnel`.
- Um único hook `useOrdersReports(filters)` consolida as queries direto no Supabase (regra do projeto: Dashboard/relatórios **sempre** via Postgres direto, nunca API externa).
- Filtro global: período + vendedor + centro de custo, persistido em `?reportPeriod=` na URL.
- `Orders.tsx` passa `<OrdersReports />` no slot `reports={...}` do `ModuleShell`.
- Gráficos com `recharts` (já no projeto).
- Export CSV usando função utilitária simples (sem nova lib).

## Não-objetivos

- Não criar nova tabela nem migração — todos os dados saem de `orders`, `order_items`, `clients`, `profiles`.
- Não mexer em RLS (já restringe por tenant).
- Não alterar o `ModuleShell`.

## Próximo passo

Se aprovado, implemento os 6 blocos em uma única passada e ligo na aba Relatórios. Algum bloco você quer cortar ou adicionar antes de eu começar?
