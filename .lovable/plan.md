

## Plano: Compromissos Sobre Venda espelham o Plano de Contas

### Mudança de Lógica
Atualmente o cadastro lista 6 tipos fixos (enum) com campos editáveis de nome, descrição e seletor de categoria. A nova lógica inverte a origem: **os compromissos vêm diretamente das subcategorias filhas de "3.1 - Compromissos Sobre Vendas" no Plano de Contas**. O cadastro apenas exibe essas categorias (read-only) e permite editar o **percentual padrão** de cada uma.

### O que muda

#### 1. Migration: Adicionar coluna `default_percentage` à tabela de configs
```sql
ALTER TABLE fin_strategic_resource_account_configs
  ADD COLUMN IF NOT EXISTS default_percentage NUMERIC(5,2) DEFAULT 0;
```
Preencher valores iniciais baseados nos percentuais atuais mais comuns (RT=10, Vendedor=5, etc.) se desejado.

#### 2. Refatorar `StrategicResourceCategoriesManager.tsx`
- **Origem dos dados**: Query busca subcategorias filhas de `parent_id = 'd2982e7d-...'` (3.1 Compromissos Sobre Vendas) no `fin_chart_accounts`
- **Exibição**: Para cada subcategoria (RT, Comissão Vendedor, Premio Orçamentista, etc.), mostra:
  - Código e nome da categoria (read-only, vindo do Plano de Contas)
  - Input editável de **percentual padrão** (%)
  - Switch de ativo/inativo
- **Informativo**: Texto explicativo no header: *"Os compromissos refletem as categorias cadastradas no Plano de Contas (3.1). Para adicionar ou renomear compromissos, edite o Plano de Contas."*
- **Remover**: Inputs de nome/descrição editáveis, seletor de categoria e botão "Criar Categoria" (tudo isso passa a ser gerido no Plano de Contas)
- **Salvar**: Ao alterar percentual ou ativar/desativar, persiste em `fin_strategic_resource_account_configs` vinculando pelo `chart_account_id`

#### 3. Lógica de sincronização
- A tabela `fin_strategic_resource_account_configs` continua existindo mas agora é indexada por `chart_account_id` (já existente), não mais apenas pelo `resource_type` enum
- Cada subcategoria do Plano de Contas terá uma linha correspondente na config com `active` e `default_percentage`
- Se uma subcategoria não tiver config, exibe com percentual 0% e inativa por padrão

### Arquivos Afetados
- **1 migration SQL** — adicionar `default_percentage`
- **`StrategicResourceCategoriesManager.tsx`** — refatorar completo para nova lógica
- **Remover** `CreateChartAccountDialog.tsx` (ou mantê-lo apenas no Plano de Contas se usado lá)

### Impacto nos Pedidos
O percentual padrão configurado aqui será pré-preenchido automaticamente nos campos de comissão ao criar/editar pedidos — essa integração pode ser feita em etapa futura se ainda não existir.

