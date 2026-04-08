## Plano de Execução

### Parte 1: Limpar dados operacionais existentes
Deletar todos os dados de demonstração das tabelas operacionais, mantendo apenas:
- Tabelas de configuração do SaaS: `tenants`, `tenant_plans`, `profiles`
- Tabelas de permissão: `menu_items`, `module_permissions`, `user_permissions`

Tabelas que serão limpas (dados operacionais):
- `clients`, `orders`, `order_items`, `order_commissions`
- `architects`, `architect_*` (files, history, indications, projects, timeline)
- `crm_deals`, `crm_activities`, `crm_timeline`, `crm_tasks`, `crm_deal_files`, `crm_deal_history`
- `leads`, `deals`, `activities`
- `fin_ledger_entries`, `fin_payables`, `fin_receivables`, `fin_attachments`, `fin_audit_logs`
- `budget_*` (products, product_lines, global_costs, templates)
- `company_settings`
- `dashboards_personalizados`
- `dispatch_sessions`, `dispatch_session_items`
- `deleted_records`
- `ai_conversations`, `ai_messages`
- Demais tabelas operacionais com dados de tenant

### Parte 2: Simplificar o Painel Owner
O Painel Owner (`/super-admin`) passará a ter apenas:
- **Visão Geral**: Total de empresas, usuários, planos (sem dados financeiros/operacionais)
- **Gestão de Empresas** (Tenants): Criar, editar, ativar/desativar
- **Gestão de Planos**: Configurar planos e preços
- **Usuários**: Visualizar usuários por tenant

Remover do painel:
- Aba "Oversight Financeiro" (MRR, receitas, etc.)
- Dados operacionais do monitoramento técnico

### Parte 3: Atualizar componentes
- Remover `OwnerFinancialPanel` 
- Simplificar `OwnerTechnicalPanel` para apenas contagem de usuários/status
- Atualizar a página SuperAdmin para refletir as mudanças