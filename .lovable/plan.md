

## Plano: Opção "Rateio" para Centro de Custo

### Contexto
Lançamentos sem centro de custo específico precisam ser rateados entre todos os centros de custo ativos, com percentuais configuráveis. O sistema já possui infraestrutura de splits (`fin_ledger_splits`, `SplitEntryDialog`, flag `has_splits`).

### Abordagem
Adicionar uma opção **"Rateio"** no campo de Centro de Custo dos formulários de criação de lançamentos (Contas a Pagar e Contas a Receber). Ao selecionar "Rateio", um painel expandido aparece permitindo configurar o percentual de cada centro de custo. Ao salvar, o sistema cria o lançamento principal (sem `cost_center_id`) com `has_splits = true` e gera automaticamente registros na tabela `fin_ledger_splits` — um para cada centro de custo com percentual > 0.

### Mudanças

1. **Criar componente `CostCenterApportionmentPanel.tsx`**
   - Lista todos os centros de custo ativos com campo de percentual editável
   - Botão "Distribuir Igual" para dividir 100% igualmente
   - Indicador visual de soma dos percentuais (deve totalizar 100%)
   - Exibe o valor calculado (R$) ao lado de cada percentual

2. **Atualizar `CreatePayableDialog.tsx` e `CreateReceivableDialog.tsx`**
   - Adicionar opção "Rateio entre Centros de Custo" no Select de Centro de Custo
   - Quando selecionada, exibir o painel de rateio abaixo
   - Na submissão: criar o lançamento principal sem `cost_center_id`, marcar `has_splits = true`, e inserir os splits em `fin_ledger_splits`

3. **Atualizar `ViewEditPayableDialog.tsx` e `ViewEditReceivableDialog.tsx`**
   - Exibir os splits de rateio quando `has_splits = true` (visualização somente leitura dos centros de custo e seus percentuais)

### Detalhes Técnicos

- Reutiliza a tabela `fin_ledger_splits` existente — sem alteração de schema
- Cada split recebe: `parent_entry_id`, `cost_center_id`, `percentage`, `amount` (calculado), `description` (herdada do pai), `chart_account_id` (herdado do pai)
- Validação: soma dos percentuais deve ser exatamente 100%
- Nenhuma migração de banco necessária

