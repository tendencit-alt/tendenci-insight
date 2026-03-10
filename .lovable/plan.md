

# Reorganização do Menu — Ordem Lógica para o Dia a Dia

## Problema Atual

O menu está fragmentado em 5 categorias (Comercial, Produção, Financeiro, Cadastros, Configurações), mas com apenas 1-2 itens em cada dropdown. Isso gera cliques desnecessários e confusão visual. Além disso, "Cadastros Financeiros" está separado do "Financeiro", e o BI/Dashboard fica escondido dentro de "Configurações" (categoria master).

## Proposta: Fluxo Natural do Negócio

A ordem ideal segue o **fluxo operacional diário** — da visão geral até a administração:

```text
┌──────────────────────────────────────────────────────────────┐
│ [Logo]  Dashboard │ Pedidos │ Produção │ Financeiro │ Cadastros │ ⚙️  │
└──────────────────────────────────────────────────────────────┘
```

**1. Dashboard** — Primeiro item, visão geral do dia
**2. Pedidos** — Entrada de trabalho, o que chegou
**3. Produção** — Execução, o que está sendo feito
**4. Financeiro** — Resultado, contas a pagar/receber + cadastros financeiros
**5. Cadastros** — Base de dados (fornecedores, produtos/matéria-prima)
**6. ⚙️ Configurações** — Itens administrativos (excluídos, erros) — só ícone, sem texto

## Mudanças Técnicas

1. **Eliminar dropdowns** — Com poucos itens por categoria, exibir como links diretos na navbar (sem clique extra)
2. **Reagrupar "Cadastros Financeiros"** dentro do dropdown de Financeiro (único dropdown com 2 itens)
3. **Dashboard como link direto** (sai da categoria "master" para item fixo)
4. **Configurações vira apenas ícone de engrenagem** com dropdown para: Excluídos, Erros do Sistema
5. **Atualizar posições e categorias** no banco (`menu_items`) e ajustar `CATEGORY_CONFIG` no `AppNavbar.tsx`

## Resultado

- Menos cliques para navegar
- Ordem lógica: ver → vender → produzir → cobrar → cadastrar → administrar
- Visual mais limpo e profissional

