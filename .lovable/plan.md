
Situação atual

- O cadastro já foi criado na tela `Cadastros Financeiros`, rota `/cadastros-financeiros`.
- Dentro dessa tela já existe a aba `Responsáveis`, onde ficam:
  - Vendedor
  - Orçamentista
  - Projetista
  - Montador
- O motivo de “não aparecer em Cadastros” é que o item de menu `Cadastros Financeiros` está hoje classificado no menu como categoria `financeiro`, não `cadastros`.

O que identifiquei no projeto

- A página existe e está pronta:
  - `src/pages/CadastrosFinanceiros.tsx`
  - aba `Responsáveis` com `OrderResponsiblesManager`
- A rota existe e está protegida por permissão:
  - módulo `cadastros_financeiros`
- O menu superior é dinâmico e vem da tabela `menu_items`.
- O item `Cadastros Financeiros` está salvo no backend com:
  - `route = /cadastros-financeiros`
  - `module = cadastros_financeiros`
  - `category = financeiro`

Decisão confirmada por você

- Essa tela deve aparecer em `Cadastros`.

Plano de ajuste

1. Mover o item de navegação
- Alterar o item `Cadastros Financeiros` na tabela de menu para categoria `cadastros`.
- Assim ele sairá do dropdown `Financeiro` e passará a aparecer no dropdown `Cadastros`.

2. Manter a estrutura da tela
- Não vou mudar a página em si.
- O cadastro continuará sendo feito em:
  - `Cadastros > Cadastros Financeiros > aba Responsáveis`

3. Preservar permissões
- A permissão continuará sendo `cadastros_financeiros`.
- Ou seja: muda o lugar no menu, mas não quebra controle de acesso.

4. Validar consistência da navegação
- Conferir desktop e mobile, porque o navbar separa os itens por categoria.
- Garantir que o item apareça dentro de `Cadastros` nos dois formatos.

Resultado esperado

```text
Hoje
Financeiro > Cadastros Financeiros > Responsáveis

Depois
Cadastros > Cadastros Financeiros > Responsáveis
```

Resumo objetivo

- Os cadastros acima serão feitos na tela `Cadastros Financeiros`, na aba `Responsáveis`.
- Eles não estão aparecendo em `Cadastros` porque o menu ainda está configurado como item de `Financeiro`.
- Vou ajustar a navegação para que fique exatamente onde você pediu: em `Cadastros`.
