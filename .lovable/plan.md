

## Plano: Filtro Lançado / Executado no BI

### O que será feito
Adicionar um filtro visual no BI Dashboard que permite alternar entre três visões:
- **Lançado** — mostra apenas lançamentos em aberto/vencidos (status ABERTO, VENCIDO)
- **Executado** — mostra apenas lançamentos realizados (status PAGO_RECEBIDO)
- **Ambos** — mostra todos juntos (comportamento atual)

### Como será implementado

**1. Adicionar estado do filtro no `DashboardBI.tsx`**
- Novo state `statusView`: `"all" | "lancado" | "executado"` (default: `"all"`)
- Renderizar um grupo de botões (toggle) logo acima dos KPIs, com as 3 opções

**2. Aplicar filtro na query de dados**
- No `queryFn`, incluir `statusView` na queryKey
- Quando `statusView === "lancado"`: adicionar `.in("status", ["ABERTO", "VENCIDO"])`
- Quando `statusView === "executado"`: adicionar `.eq("status", "PAGO_RECEBIDO")`
- Quando `statusView === "all"`: manter como está (apenas `.neq("status", "CANCELADO")`)
- Aplicar o mesmo filtro na query de saldo consolidado (`balanceQuery`)

**3. UI do filtro**
- Grupo de 3 botões estilizados (similar aos botões de ordenação já existentes nos filtros)
- Posicionado acima dos cards de KPI, alinhado à direita
- Indicação visual clara de qual opção está ativa

### Arquivo editado
- `src/components/financeiro/DashboardBI.tsx`

