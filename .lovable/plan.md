

## Plano: Redesign das Sub-abas de Lançamentos & Conciliação

### Problema
As 3 sub-abas ("Lançamentos", "Extrato Bancário", "Extrato por Conta") aparecem como botões genéricos sem contexto, poluindo a interface e confundindo o usuário sobre a finalidade de cada uma.

### Solução
Substituir os tabs genéricos por **cards informativos clicáveis** com métricas resumidas, transformando a navegação em algo útil por si só.

```text
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ 📖 Lançamentos      │  │ 🔗 Extrato Bancário │  │ 🏛 Extrato por Conta│
│                     │  │                     │  │                     │
│ 42 registros        │  │ 15 transações       │  │ Saldo consolidado   │
│ 3 não conciliados   │  │ 8 não vinculadas    │  │ por conta bancária  │
│ ─────────────────── │  │ ─────────────────── │  │ ─────────────────── │
│ [ativo: borda azul] │  │                     │  │                     │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

### Alterações

**1. `src/components/financeiro/LedgerReconciliationTab.tsx`** (linhas 641-655)
- Substituir o `TabsList` com `grid-cols-3` por 3 cards clicáveis lado a lado
- Cada card mostra: ícone, título, descrição contextual e métricas dinâmicas
  - **Lançamentos**: total de registros no período + quantidade não conciliados (badge de alerta)
  - **Extrato Bancário**: total de transações importadas + não vinculadas
  - **Extrato por Conta**: texto descritivo "Saldo e movimentação por conta"
- Card ativo recebe `ring-2 ring-primary bg-primary/5`, inativos ficam com `hover:bg-muted/50`
- Manter a lógica de `activeSubTab` e `setActiveSubTab` — os cards apenas substituem visualmente os TabsTriggers
- Usar contagem real dos dados já carregados (`entries?.length`, `entries?.filter(e => !e.reconciled).length`, `transactions?.length`, etc.)

### Resultado
Os "botões" viram cards informativos que mostram métricas úteis, orientam o usuário sobre o que cada seção contém e destacam pendências — tornando a navegação mais intuitiva e produtiva.

