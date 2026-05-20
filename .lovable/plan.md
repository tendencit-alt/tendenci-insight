## Diagnóstico

A rota `/projetos` está implementada e funcional, mas não aparece no menu lateral porque em `modules_config` o módulo está como:

- `module_key='projetos'` → `category='futuro'`, `visible_in_menu=false`

O hook `useVisibleModuleGroups` filtra por `visible_in_menu=true`, então o item nunca renderiza. Os módulos `producao` e `producao-operacoes` estão na mesma situação.

## Plano (apenas dados / sem mudança de código)

1. **Migration** atualizando `modules_config`:
   - `projetos` → `category='operacional'`, `visible_in_menu=true`, `sort_order=35`
   - `producao-operacoes` → `category='operacional'`, `visible_in_menu=true`, `sort_order=40` (já existe a aba nova "Projetos" dentro dela)
   - `producao` permanece em `futuro` (legado, mantemos escondido)

2. Resultado esperado no menu lateral, grupo **Operação**:
   - Projetos → `/projetos`
   - Produção / Operações → `/producao-operacoes` (com a nova aba "Projetos")

## Fora de escopo
- Nenhuma alteração em código React, RLS, schema ou permissões.
- Não mexo no `HomeLauncher` nem em outras categorias.

## Pergunta rápida
Confirma que quer ativar **ambos** (`projetos` e `producao-operacoes`) na categoria Operação, ou só `projetos`?