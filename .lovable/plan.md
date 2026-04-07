

## Plano: Edição Completa dos Compromissos Sobre Venda

### Problema Atual
Os compromissos sobre venda têm nomes e descrições fixos no código (hardcoded). Não é possível renomear, editar descrições ou criar novas categorias contábeis diretamente pela interface.

### Solução

#### 1. Migration: Adicionar colunas editáveis à tabela de configuração
Adicionar `display_name` (TEXT) e `description` (TEXT) à tabela `fin_strategic_resource_account_configs`, permitindo personalizar a nomenclatura sem alterar o tipo interno do enum.

```sql
ALTER TABLE fin_strategic_resource_account_configs
  ADD COLUMN display_name TEXT,
  ADD COLUMN description TEXT;
```
Preencher valores iniciais baseados nos labels atuais (RT, Vendedor, etc.).

#### 2. Refatorar o componente StrategicResourceCategoriesManager
- Tornar `display_name` e `description` editáveis inline (inputs de texto)
- Manter o switch de ativação existente
- Manter o seletor de categoria do plano de contas
- Adicionar botão **"+ Criar Categoria no Plano de Contas"** ao lado do seletor, que:
  - Abre um mini-formulário (dialog) pedindo o nome da nova categoria
  - Cria automaticamente uma entrada em `fin_chart_accounts` com `nature = 'DESPESA'`, `in_dre = true`, `in_cashflow = true`, `active = true`
  - Vincula a categoria recém-criada ao compromisso automaticamente
  - Isso garante que a nova categoria aparecerá no DRE e Fluxo de Caixa

#### 3. Fluxo de criação de categoria contábil
Ao clicar em "Criar Categoria":
1. Dialog solicita: nome da categoria e categoria pai (opcional, selecionável entre as existentes de DESPESA)
2. O sistema gera o próximo código sequencial sob o pai selecionado
3. Insere em `fin_chart_accounts` com flags `in_dre = true` e `in_cashflow = true`
4. Já seleciona a nova categoria no compromisso correspondente
5. Invalida queries para atualizar as listas

### Arquivos Afetados
- **1 migration SQL** — adicionar colunas `display_name` e `description`
- **`src/components/financeiro/masters/StrategicResourceCategoriesManager.tsx`** — refatorar para edição inline + botão criar categoria
- Possivelmente extrair o dialog de criação de categoria em um componente separado

### Detalhes Técnicos
- Os tipos internos do enum (`rt`, `vendedor`, etc.) não são alterados — apenas o `display_name` é editável
- A criação de categorias no plano de contas respeita a hierarquia existente e garante visibilidade no DRE/Fluxo de Caixa via flags `in_dre` e `in_cashflow`

