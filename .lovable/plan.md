

## Plano: Unificar "Agrupar por Cliente" e "Unificar OPs"

### Problema
- O toggle "Agrupar por Cliente" não tem efeito real — o Kanban ignora o `viewMode`
- O botão "Unificar OPs" faz algo semelhante (agrupa OPs por cliente) mas de forma persistente no banco
- Dois controles para o mesmo conceito confundem o usuário

### Solução
Remover o toggle "Agrupar por Cliente" e manter apenas o botão "Unificar OPs", que é funcional e persistente.

### Alterações

**1. `src/components/production/ProductionFilters.tsx`**
- Remover o toggle Switch "Agrupar por Cliente"
- Remover props `viewMode` e `onViewModeChange`
- Remover imports de `Switch`, `Label`, `Layers` (se não usados em outro lugar)

**2. `src/pages/Production.tsx`**
- Remover state `viewMode` e `setViewMode`
- Remover props `viewMode` e `onViewModeChange` do `<ProductionFilters>`
- Remover props `viewMode` e `onGroupClick` do `<ProductionKanban>`
- Remover `selectedGroupId` state e `<UnifiedOpsDetailSheet>` se não houver outro ponto de acesso aos grupos

**3. `src/components/production/ProductionKanban.tsx`**
- Remover props `viewMode` e `onGroupClick` da interface (limpeza)

### Resultado
Interface mais limpa com um único ponto de ação claro: o botão "Unificar OPs" para agrupar ordens do mesmo cliente.

