
Objetivo

- Fazer com que os lançamentos automáticos gerados a partir dos Recursos Estratégicos já saiam com a Categoria (Plano de Contas) preenchida.
- Como você escolheu “Configurável em Cadastros”, a melhor solução é criar uma parametrização administrativa por recurso estratégico.

O que identifiquei no sistema atual

- Os títulos automáticos são gerados pelas funções do backend:
  - `create_receivable_from_order()`
  - `update_financial_entries_on_order_edit()`
- Hoje os `fin_payables` gerados para:
  - Comissão Vendedor
  - Comissão Orçamentista
  - Comissão Projetista
  - Comissão Montador
  - Comissão Produção
  são criados com:
  - `cost_center_id`
  - `project_id`
  - `supplier_id`
  mas sem `chart_account_id`.
- O mesmo vale para os lançamentos de despesa em `fin_ledger_entries`: hoje também entram sem `chart_account_id`.
- Portanto, o problema não é só “mostrar a categoria”; a automação ainda não sabe qual conta contábil usar para cada recurso.

Solução proposta

1. Criar uma tabela de configuração de mapeamento
- Exemplo conceitual:
  - recurso = `vendedor | orcamentista | projetista | montador | producao | rt`
  - `chart_account_id` = conta do Plano de Contas
  - opcionalmente no futuro: descrição padrão, ativo/inativo
- Essa tabela vira a fonte de verdade para a automação financeira.

2. Criar uma tela de configuração em Cadastros Financeiros
- Adicionar uma nova seção/aba em `Cadastros Financeiros`, algo como:
  - “Configuração de Recursos Estratégicos”
- Nela o usuário escolhe, para cada recurso:
  - a categoria do Plano de Contas (somente contas de despesa ativas)
- Exemplo de uso:
  - Vendedor → Despesas Comerciais / Comissão de Vendas
  - Orçamentista → Despesas com Pessoal / Orçamentos
  - Projetista → Despesas com Pessoal / Projetos
  - Montador → Custo dos Serviços / Montagem
  - Produção → Custo dos Serviços / Produção
  - RT → conta específica de RT

3. Atualizar as funções automáticas do pedido
- Nas duas funções de geração/atualização financeira:
  - buscar o `chart_account_id` configurado para cada recurso
  - gravar esse valor em:
    - `fin_payables.chart_account_id`
    - `fin_ledger_entries.chart_account_id`
- Isso garante consistência entre:
  - Contas a Pagar
  - Livro Razão
  - filtros e relatórios do Financeiro

4. Definir regra de segurança/fallback
- Se um recurso estiver sem categoria configurada, temos duas opções de implementação:
  - bloquear a geração e avisar claramente
  - gerar sem categoria e registrar aviso
- Recomendo bloquear apenas o recurso afetado com mensagem clara, porque evita títulos incompletos no financeiro.

Como isso ficaria no fluxo

```text
Pedido aprovado/editado
→ automação identifica recursos estratégicos ativos
→ consulta tabela de configuração
→ obtém categoria correta de cada recurso
→ cria contas a pagar + lançamento contábil já com:
   - categoria
   - centro de custo
   - projeto
   - descrição
```

Decisão de design recomendada

- Usar uma tabela de configuração separada, em vez de gravar isso no cadastro de responsáveis.
- Motivo:
  - a categoria pertence ao tipo do recurso estratégico, não à pessoa
  - um “Projetista” pode trocar de responsável, mas a categoria contábil continua a mesma
  - fica mais simples de administrar e mais seguro

Impacto técnico

- Backend:
  - nova tabela de configuração
  - ajuste nas 2 funções automáticas do pedido
- Frontend:
  - nova aba/seção em `Cadastros Financeiros`
  - formulário simples com selects de Plano de Contas
- Relatórios:
  - passam a receber os títulos já categorizados automaticamente
- Compatibilidade:
  - pedidos novos e pedidos editados passam a respeitar a configuração
  - títulos antigos sem categoria podem permanecer como estão, ou depois podemos criar uma rotina de correção em massa

Observação importante

- Hoje a automação também não preenche `chart_account_id` no lançamento de despesa do razão para esses recursos.
- No ajuste, eu trataria os dois juntos:
  - Contas a Pagar
  - Livro Razão
- Assim evitamos divergência entre módulos.

Plano de implementação

1. Mapear os recursos estratégicos suportados e padronizar seus identificadores.
2. Criar tabela de configuração com vínculo ao Plano de Contas.
3. Adicionar a interface de configuração em `Cadastros Financeiros`.
4. Atualizar `create_receivable_from_order()` para preencher categoria automaticamente.
5. Atualizar `update_financial_entries_on_order_edit()` para manter a categoria ao recalcular os títulos.
6. Validar fallback quando faltar configuração.
7. Testar o fluxo completo:
   - novo pedido
   - edição de pedido
   - geração de contas a pagar
   - conferência no razão e nos filtros do financeiro

Resultado esperado

- Cada recurso estratégico passa a gerar seus lançamentos com a categoria correta automaticamente.
- A configuração fica administrável por você em `Cadastros Financeiros`, sem depender de ajuste técnico a cada mudança.
