

# Hover com Resumo de Títulos (Contas a Pagar / Receber) no BI e DRE

## Problema
O usuário quer ver o status dos títulos (pago, vencido, em aberto) sem poluir a interface com cards ou painéis extras.

## Solução
Adicionar **tooltips enriquecidos** (hover) nos KPIs do BI Dashboard e nas linhas totalizadoras do DRE, mostrando ao passar o mouse um mini-resumo de contas a pagar e a receber.

## O que será feito

### 1. Novo componente `AccountsStatusTooltip`
Componente reutilizável que faz query em `fin_payables` e `fin_receivables` (excluindo `CANCELADO`) e exibe no hover:

```text
┌─────────────────────────────┐
│ CONTAS A PAGAR              │
│ Total: R$ 50.000 (12 títulos)│
│ ✓ Pagas: R$ 30.000 (8)     │
│ ⏳ A vencer: R$ 15.000 (3)  │
│ ⚠ Vencidas: R$ 5.000 (1)   │
├─────────────────────────────┤
│ CONTAS A RECEBER            │
│ Total: R$ 80.000 (15 títulos)│
│ ✓ Recebidas: R$ 60.000 (10)│
│ ⏳ A vencer: R$ 18.000 (4)  │
│ ⚠ Vencidas: R$ 2.000 (1)   │
└─────────────────────────────┘
```

- Usa `HoverCard` (Radix) para suportar conteúdo mais rico que um tooltip simples
- Classifica: `status = 'PAGO'/'RECEBIDO'` → pago; `status = 'ABERTO' AND due_date < hoje` → vencido; demais → a vencer
- Respeita os filtros de data ativos

### 2. Integração no BI Dashboard (`FinanceiroKPIs.tsx`)
- Adicionar um ícone `Info` discreto no card de **Receita Total** e **Resultado Líquido**
- Ao passar o mouse no ícone, exibe o `AccountsStatusTooltip` com o resumo

### 3. Integração no DRE (`DRETab.tsx`)
- Nas linhas totalizadoras (Receita Bruta, Despesas Totais, Resultado), adicionar o mesmo ícone `Info` com hover
- Mostra apenas a seção relevante (ex: linha de Receita mostra só Contas a Receber)

### 4. Integração no Fluxo de Caixa (`CashflowTab.tsx`)
- Mesma lógica nas linhas de totalização

## Arquivos a criar/editar

| Arquivo | Ação |
|---------|------|
| `src/components/financeiro/AccountsStatusTooltip.tsx` | **Criar** — componente com query e HoverCard |
| `src/components/financeiro/FinanceiroKPIs.tsx` | Adicionar hover nos cards de Receita e Resultado |
| `src/components/financeiro/DRETab.tsx` | Adicionar hover nas linhas totalizadoras |
| `src/components/financeiro/CashflowTab.tsx` | Adicionar hover nas linhas totalizadoras |

## Detalhes técnicos
- Query com `useQuery` cacheada (`staleTime: 60s`) para não repetir chamadas a cada hover
- Filtros de data passados como props para o componente
- Cores: verde para pago, amarelo para a vencer, vermelho para vencido
- O HoverCard abre com delay de 200ms para não ser intrusivo

