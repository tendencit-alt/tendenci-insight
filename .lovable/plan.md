

## Plano: Projeto "Administrativo" para Custos Gerais

### O que será feito

Criar um projeto financeiro fixo chamado **"Administrativo"** na tabela `fin_projects` para agrupar custos que não pertencem a nenhum projeto específico (aluguel, energia, salários administrativos, etc.).

### Mudanças

1. **Inserir o projeto "Administrativo"** na tabela `fin_projects` com status "ativo" e sem orçamento definido (ajustável depois pelo usuário)

2. **Nenhuma alteração de código necessária** — o projeto já aparecerá automaticamente nos selects de Projeto nos formulários de Contas a Pagar/Receber e nos KPIs/relatórios financeiros

### Como usar

- Ao criar lançamentos de custos gerais (aluguel, energia, etc.), basta selecionar o projeto **"Administrativo"** no campo Projeto
- O acompanhamento será feito normalmente nos KPIs de projetos, com barra de progresso e comparativo orçado vs. executado
- Se desejar, defina um orçamento mensal/anual no cadastro do projeto para controlar os gastos administrativos

### Detalhes Técnicos
- Uma única inserção na tabela `fin_projects`: `name = 'Administrativo'`, `code = 'ADM'`, `status = 'ativo'`

