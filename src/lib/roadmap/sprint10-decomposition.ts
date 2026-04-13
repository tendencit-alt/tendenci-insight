// ══════════════════════════════════════════════════════════════════════
// DECOMPOSIÇÃO TÉCNICA — SPRINT 10: INTEGRAÇÕES EXTERNAS, API E CONECTIVIDADE
// ══════════════════════════════════════════════════════════════════════

import type { DecompositionBlock, DecompositionItem, SprintDecomposition } from "./sprint1-decomposition";

// ══════════════════════════════════════════════════════════════════════
// BLOCO 1 — NF-e
// ══════════════════════════════════════════════════════════════════════

const BLOCK_1: DecompositionBlock = {
  id: "s10-b1-nfe",
  number: 1,
  name: "NF-e (Nota Fiscal Eletrônica)",
  objective: "Emissão, cancelamento e inutilização de NF-e integrada ao pedido de venda",
  status: "pending",
  doneWhen: [
    "Tabela nfe_documents com pedido, cliente, chave_acesso, xml, status, data_emissao, valor_total",
    "Status: rascunho, autorizada, cancelada, inutilizada, rejeitada",
    "Integração com API de emissão (Sefaz via provedor)",
    "Geração automática a partir do pedido aprovado",
    "Download de XML e DANFE (PDF)",
  ],
  items: [
    {
      id: "s10-b1-01",
      name: "Tabela e integração NF-e",
      status: "pending",
      existing: [],
      gaps: [
        "Criar tabela 'nfe_documents' (id, tenant_id, order_id, client_id, access_key, xml_content text, danfe_url, status, issue_date, total_value, series, number, nature_operation, cfop, notes, error_message, cancelled_at, cancel_protocol, created_at, updated_at, created_by)",
        "RLS por tenant_id",
        "Edge Function 'emit-nfe' para comunicação com provedor (ex: Nuvem Fiscal, Focus NFe, eNotas)",
        "UI: NFePage com listagem, filtros por status/período, ações de emitir/cancelar",
        "UI: EmitNFeDialog vinculado ao pedido com preview dos dados fiscais",
        "Download de XML e geração de DANFE (PDF)",
        "Configuração: dados fiscais da empresa (CNPJ, IE, regime tributário) em company_settings",
        "Secret: API key do provedor de NF-e",
      ],
      files: [],
      estimatedHoursRemaining: 16,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 2 — NFS-e
// ══════════════════════════════════════════════════════════════════════

const BLOCK_2: DecompositionBlock = {
  id: "s10-b2-nfse",
  number: 2,
  name: "NFS-e (Nota Fiscal de Serviço)",
  objective: "Emissão de NFS-e para serviços com integração municipal",
  status: "pending",
  doneWhen: [
    "Tabela nfse_documents com pedido, cliente, município, código_serviço, xml, status",
    "Status: rascunho, emitida, cancelada",
    "Integração com API municipal (via provedor)",
    "Configuração de código de serviço e alíquota ISS",
  ],
  items: [
    {
      id: "s10-b2-01",
      name: "Tabela e integração NFS-e",
      status: "pending",
      existing: [],
      gaps: [
        "Criar tabela 'nfse_documents' (id, tenant_id, order_id, client_id, municipality_code, service_code, service_description, iss_rate, xml_content, status, issue_date, total_value, rps_number, rps_series, nfse_number, verification_code, error_message, cancelled_at, created_at, updated_at, created_by)",
        "RLS por tenant_id",
        "Edge Function 'emit-nfse' para comunicação com provedor",
        "UI: NFSePage com listagem e ações",
        "Configuração: códigos de serviço e alíquotas por município",
      ],
      files: [],
      estimatedHoursRemaining: 14,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 3 — INTEGRAÇÃO BANCÁRIA
// ══════════════════════════════════════════════════════════════════════

const BLOCK_3: DecompositionBlock = {
  id: "s10-b3-bank-integration",
  number: 3,
  name: "Integração Bancária",
  objective: "Importação de extratos, match automático e conciliação inteligente",
  status: "done",
  doneWhen: [
    "Importação de extrato bancário (OFX/CSV)",
    "Match automático de transações com obrigações internas",
    "Conciliação automática inteligente com scores",
    "Painel de conciliação com explicações",
  ],
  items: [
    {
      id: "s10-b3-01",
      name: "Conciliação bancária inteligente",
      status: "done",
      existing: [
        "smart-reconcile Edge Function com match por valor/data/conta + classificação automática",
        "LedgerReconciliationTab com painel de conciliação e scores",
        "BankAccountExtractTab com extrato por conta e saldo progressivo",
        "ReconciliationTab com conciliação manual e automática",
        "Sincronização automática de saldos bancários em fin_bank_accounts",
        "Auto-conciliação: pagamento/recebimento → reconciled=true automaticamente",
      ],
      gaps: [],
      files: [
        "supabase/functions/smart-reconcile/index.ts",
        "src/components/financeiro/LedgerReconciliationTab.tsx",
        "src/components/financeiro/ReconciliationTab.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 4 — IMPORTAÇÃO OFX
// ══════════════════════════════════════════════════════════════════════

const BLOCK_4: DecompositionBlock = {
  id: "s10-b4-ofx-import",
  number: 4,
  name: "Importação OFX",
  objective: "Parser de arquivos OFX com importação de transações bancárias",
  status: "done",
  doneWhen: [
    "Parser OFX com extração de data, valor, descrição, tipo",
    "Dialog de importação com preview das transações",
    "Detecção de duplicatas",
    "Vinculação automática à conta bancária",
  ],
  items: [
    {
      id: "s10-b4-01",
      name: "Parser e importação OFX",
      status: "done",
      existing: [
        "ofx-parser.ts com parseOFX() que extrai transações do formato OFX",
        "OFXImportDialog com upload, preview de transações e importação",
        "Detecção de duplicatas por data/valor/descrição",
        "Registro em audit_import_logs para rastreabilidade",
        "Integração com smart-reconcile após importação",
      ],
      gaps: [],
      files: [
        "src/lib/ofx-parser.ts",
        "src/components/financeiro/OFXImportDialog.tsx",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 5 — WEBHOOKS EXTERNOS
// ══════════════════════════════════════════════════════════════════════

const BLOCK_5: DecompositionBlock = {
  id: "s10-b5-webhooks",
  number: 5,
  name: "Webhooks Externos",
  objective: "Notificação de eventos do sistema para sistemas externos via HTTP POST",
  status: "pending",
  doneWhen: [
    "Tabela webhook_endpoints com URL, eventos, secret, status",
    "Eventos: pedido_criado, pedido_aprovado, nota_emitida, pagamento_recebido, estoque_alterado",
    "Assinatura HMAC para segurança",
    "Retry com backoff exponencial (3 tentativas)",
    "Logs de entrega com status e resposta",
  ],
  items: [
    {
      id: "s10-b5-01",
      name: "Sistema de webhooks",
      status: "pending",
      existing: [
        "whatsapp-webhook Edge Function (recepção de webhooks do WhatsApp, não envio)",
        "cross_module_events para eventos internos",
        "process-business-event para processamento de eventos",
      ],
      gaps: [
        "Criar tabela 'webhook_endpoints' (id, tenant_id, url, events text[], secret_key, active, description, created_at, updated_at, created_by)",
        "Criar tabela 'webhook_deliveries' (id, endpoint_id, event_type, payload JSONB, response_status int, response_body text, attempt int, delivered_at, error_message, created_at)",
        "RLS por tenant_id",
        "Edge Function 'dispatch-webhook' que: busca endpoints ativos por evento, assina payload com HMAC-SHA256, envia POST, registra delivery, retry 3x com backoff",
        "Integração: ao disparar evento no cross_module_events, chamar dispatch-webhook",
        "UI: WebhookEndpointsManager com CRUD de endpoints",
        "UI: WebhookDeliveriesLog com histórico de entregas por endpoint",
        "Teste manual: botão 'Enviar teste' por endpoint",
      ],
      files: [],
      estimatedHoursRemaining: 12,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 6 — EVENT BUS INTERNO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_6: DecompositionBlock = {
  id: "s10-b6-event-bus",
  number: 6,
  name: "Event Bus Interno",
  objective: "Barramento de eventos centralizado para comunicação entre módulos",
  status: "done",
  doneWhen: [
    "cross_module_events como barramento de eventos entre módulos",
    "Eventos: criação, alteração_status, aprovação, conclusão",
    "Processamento via Edge Function",
    "Rastreabilidade: source_module, target_module, status, payload",
  ],
  items: [
    {
      id: "s10-b6-01",
      name: "Event bus centralizado",
      status: "done",
      existing: [
        "cross_module_events com source_module, target_module, event_type, source_entity, source_entity_id, payload, status",
        "process-business-event Edge Function para processamento de eventos",
        "automation_rules com event_type e event_module para regras configuráveis",
        "automation_execution_logs para rastreabilidade de execução",
        "Integração: pedido→financeiro, pedido→produção, produção→estoque via eventos",
      ],
      gaps: [],
      files: [
        "supabase/functions/process-business-event/index.ts",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 7 — API PÚBLICA
// ══════════════════════════════════════════════════════════════════════

const BLOCK_7: DecompositionBlock = {
  id: "s10-b7-public-api",
  number: 7,
  name: "API Pública REST",
  objective: "Endpoints REST para clientes, fornecedores, produtos, pedidos, financeiro e estoque",
  status: "pending",
  doneWhen: [
    "Edge Function 'public-api' com roteamento RESTful",
    "Endpoints: /clients, /suppliers, /products, /orders, /finance, /inventory",
    "Métodos: GET (listagem + detalhe), POST (criação), PATCH (atualização)",
    "Autenticação via API token (Bearer)",
    "Rate limiting básico",
    "Documentação OpenAPI/Swagger",
    "Paginação, filtros e ordenação",
  ],
  items: [
    {
      id: "s10-b7-01",
      name: "Edge Function API pública",
      status: "pending",
      existing: [
        "Supabase SDK já expõe tabelas via PostgREST (mas sem controle de escopo)",
        "RLS por tenant_id em todas as tabelas",
      ],
      gaps: [
        "Edge Function 'public-api' com Hono para roteamento: GET/POST/PATCH por recurso",
        "Validação de API token: buscar token em api_tokens, validar escopo e expiração",
        "Endpoints mínimos: /clients, /suppliers, /products, /orders, /finance/receivables, /finance/payables, /inventory/products, /inventory/movements",
        "Paginação: ?page=1&per_page=50, ordenação: ?sort=created_at&order=desc",
        "Filtros: ?status=ativo&client_id=xxx",
        "Rate limiting: 100 req/min por token (via tabela api_rate_limits ou in-memory)",
        "Documentação: gerar OpenAPI spec estática ou endpoint /docs",
        "Logging: registrar cada request em integration_logs",
      ],
      files: [],
      estimatedHoursRemaining: 16,
      dependencies: ["s10-b8-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 8 — TOKENS DE API
// ══════════════════════════════════════════════════════════════════════

const BLOCK_8: DecompositionBlock = {
  id: "s10-b8-api-tokens",
  number: 8,
  name: "Tokens de Integração",
  objective: "Gerenciamento de API tokens com escopos, expiração e revogação",
  status: "pending",
  doneWhen: [
    "Tabela api_tokens com user_id, tenant_id, scopes, expires_at, status, last_used_at",
    "Geração de token seguro (crypto random)",
    "Escopos: read:clients, write:orders, read:finance, etc.",
    "Revogação imediata",
    "UI de gestão de tokens em Configurações",
  ],
  items: [
    {
      id: "s10-b8-01",
      name: "CRUD de tokens de API",
      status: "pending",
      existing: [],
      gaps: [
        "Criar tabela 'api_tokens' (id, tenant_id, user_id, name, token_hash text, token_prefix text, scopes text[], expires_at, status [ativo/revogado/expirado], last_used_at, last_used_ip, created_at, created_by)",
        "RLS por tenant_id",
        "Token gerado com crypto.randomUUID() ou similar, armazenar apenas hash (bcrypt/SHA-256)",
        "Exibir token completo apenas uma vez na criação",
        "Escopos granulares: read:clients, write:clients, read:orders, write:orders, read:finance, read:inventory, write:inventory",
        "UI: ApiTokensManager com criação, listagem, revogação",
        "Validação em Edge Function: buscar por prefix, comparar hash, verificar expiração e escopos",
      ],
      files: [],
      estimatedHoursRemaining: 8,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 9 — INTEGRAÇÃO WHATSAPP
// ══════════════════════════════════════════════════════════════════════

const BLOCK_9: DecompositionBlock = {
  id: "s10-b9-whatsapp",
  number: 9,
  name: "Integração WhatsApp",
  objective: "Envio automático de mensagens por eventos do sistema via Evolution API",
  status: "done",
  doneWhen: [
    "Envio de mensagens via Evolution API",
    "Eventos: pedido aprovado, pedido atrasado, parcela vencendo, material entregue",
    "Templates de mensagem configuráveis",
    "Logs de envio e status",
  ],
  items: [
    {
      id: "s10-b9-01",
      name: "WhatsApp via Evolution API",
      status: "done",
      existing: [
        "whatsapp-webhook Edge Function para recepção de mensagens",
        "whatsapp-send-message Edge Function para envio",
        "send-followup-whatsapp para follow-up automático",
        "whatsapp-evolution para processamento de eventos Evolution",
        "sync-whatsapp-status para sincronização de status",
        "check-evolution-health para monitoramento de saúde",
        "dispatch-followup para despacho de follow-ups",
        "CRM integrado com WhatsApp para comunicação com leads",
        "Cadências automáticas com steps de WhatsApp",
      ],
      gaps: [],
      files: [
        "supabase/functions/whatsapp-webhook/index.ts",
        "supabase/functions/whatsapp-send-message/index.ts",
        "supabase/functions/send-followup-whatsapp/index.ts",
      ],
      estimatedHoursRemaining: 0,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 10 — EMAIL ENGINE
// ══════════════════════════════════════════════════════════════════════

const BLOCK_10: DecompositionBlock = {
  id: "s10-b10-email-engine",
  number: 10,
  name: "Email Engine",
  objective: "Envio de emails transacionais: propostas, pedidos, cobranças e alertas do sistema",
  status: "pending",
  doneWhen: [
    "Edge Function para envio de emails transacionais",
    "Templates: proposta, pedido, cobrança, alerta",
    "Fila de envio com retry",
    "Logs de envio com status (enviado/falhou/bounce)",
    "Configuração de domínio de envio",
  ],
  items: [
    {
      id: "s10-b10-01",
      name: "Email transacional engine",
      status: "pending",
      existing: [
        "Lovable Email infrastructure disponível (Lovable Cloud)",
        "Nenhum email transacional configurado atualmente",
      ],
      gaps: [
        "Configurar domínio de email via Lovable Cloud",
        "Scaffold transactional email via email_domain tools",
        "Templates: envio_proposta (PDF anexo), envio_pedido (confirmação), cobranca (vencimento), alerta_sistema",
        "Trigger: ao aprovar proposta → enviar email ao cliente",
        "Trigger: ao confirmar pedido → enviar confirmação",
        "Trigger: X dias antes do vencimento → enviar lembrete de cobrança",
        "Logs em email_send_log com status e rastreabilidade",
      ],
      files: [],
      estimatedHoursRemaining: 10,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 11 — EXPORTAÇÃO BI
// ══════════════════════════════════════════════════════════════════════

const BLOCK_11: DecompositionBlock = {
  id: "s10-b11-bi-export",
  number: 11,
  name: "Exportação BI",
  objective: "Exportação de dados em CSV, Excel e JSON para BI externo",
  status: "pending",
  doneWhen: [
    "Botão de exportação nos relatórios e listagens principais",
    "Formatos: CSV, Excel (XLSX), JSON",
    "Exportação com filtros aplicados",
    "Download direto no navegador",
    "Suporte a grandes volumes (streaming)",
  ],
  items: [
    {
      id: "s10-b11-01",
      name: "Componente de exportação universal",
      status: "pending",
      existing: [
        "Nenhum componente de exportação universal existe",
        "Algumas telas têm exportação ad-hoc",
      ],
      gaps: [
        "Criar componente reutilizável 'ExportButton' com dropdown de formatos (CSV, XLSX, JSON)",
        "Biblioteca: usar SheetJS (xlsx) para geração de Excel no frontend",
        "CSV: geração nativa com Blob + download",
        "JSON: serialização dos dados filtrados",
        "Integrar em: DRE, Fluxo de Caixa, Listagem de Pedidos, Estoque, Produção, Compras",
        "Suporte a colunas configuráveis (selecionar quais campos exportar)",
        "Nome do arquivo: '{modulo}_{data}_{filtro}.{ext}'",
      ],
      files: [],
      estimatedHoursRemaining: 8,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 12 — LOGS DE INTEGRAÇÃO
// ══════════════════════════════════════════════════════════════════════

const BLOCK_12: DecompositionBlock = {
  id: "s10-b12-integration-logs",
  number: 12,
  name: "Logs de Integração",
  objective: "Registro centralizado de todas as chamadas de integração com status e retry",
  status: "partial",
  doneWhen: [
    "Tabela integration_logs com origem, evento, payload, status, tentativas, erro",
    "Registro automático em todas as Edge Functions de integração",
    "Consulta com filtros por origem, evento, status, período",
    "Retry manual de itens falhos",
  ],
  items: [
    {
      id: "s10-b12-01",
      name: "Tabela e UI de logs de integração",
      status: "partial",
      existing: [
        "automation_execution_logs para logs de automação",
        "audit_log para auditoria geral",
        "audit_import_logs para importações",
        "logError helper em _shared/logError.ts para erros de Edge Functions",
      ],
      gaps: [
        "Criar tabela 'integration_logs' (id, tenant_id, source [nfe/nfse/whatsapp/webhook/api/bank], event_type, direction [inbound/outbound], endpoint_url, method, request_payload JSONB, response_status int, response_body text, status [success/error/timeout/retry], attempts int, error_message, duration_ms int, created_at)",
        "RLS por tenant_id",
        "Helper: logIntegration() para registrar em todas as Edge Functions de integração",
        "UI: IntegrationLogsPanel com filtros por source, status, período",
        "Ação: retry manual de itens com status=error",
      ],
      files: [
        "supabase/functions/_shared/logError.ts",
      ],
      estimatedHoursRemaining: 6,
      dependencies: [],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// BLOCO 13 — MONITOR DE INTEGRAÇÕES
// ══════════════════════════════════════════════════════════════════════

const BLOCK_13: DecompositionBlock = {
  id: "s10-b13-integration-monitor",
  number: 13,
  name: "Monitor de Integrações",
  objective: "Painel executivo com status de todas as integrações: webhooks, bancos, NF-e, API, WhatsApp",
  status: "pending",
  doneWhen: [
    "Dashboard com status de cada integração (ativo/erro/inativo)",
    "Métricas: requests/dia, taxa de sucesso, tempo médio de resposta",
    "Alertas de integração com falha",
    "Health check periódico (WhatsApp, bancos)",
  ],
  items: [
    {
      id: "s10-b13-01",
      name: "Dashboard de monitoramento",
      status: "pending",
      existing: [
        "check-evolution-health para health check do WhatsApp",
        "automation_execution_logs com métricas de automação",
      ],
      gaps: [
        "UI: IntegrationMonitorDashboard com cards por integração",
        "Cards: WhatsApp (status Evolution, msgs/dia), NF-e (notas emitidas/dia, erros), Bancos (último sync, conciliações), API (requests/dia, tokens ativos), Webhooks (entregas/dia, taxa sucesso), Email (enviados/dia, bounces)",
        "Dados: agregar de integration_logs por source nos últimos 24h/7d/30d",
        "Health check: pg_cron periódico que verifica status de cada integração",
        "Alertas: se taxa de erro > 10% ou integração offline > 1h → notification",
        "Acessível em Configurações → Integrações → Monitor",
      ],
      files: [],
      estimatedHoursRemaining: 8,
      dependencies: ["s10-b12-01"],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════
// SPRINT 10 CONSOLIDADO
// ══════════════════════════════════════════════════════════════════════

export const SPRINT_10_DECOMPOSITION: SprintDecomposition = {
  sprint: 10,
  name: "Integrações Externas, API Pública e Conectividade",
  objective: "NF-e/NFS-e → Bancos → Webhooks → API Pública → WhatsApp → Email → Exportação → Monitoramento",
  totalBlocks: 13,
  totalItems: 13,
  estimatedHoursRemaining: 98,
  blocks: [
    BLOCK_1, BLOCK_2, BLOCK_3, BLOCK_4, BLOCK_5, BLOCK_6, BLOCK_7,
    BLOCK_8, BLOCK_9, BLOCK_10, BLOCK_11, BLOCK_12, BLOCK_13,
  ],
  doneCriteria: [
    "Emitir NF-e a partir do pedido aprovado",
    "Emitir NFS-e para serviços",
    "Importar extrato bancário OFX e conciliar automaticamente",
    "Configurar webhooks para notificar sistemas externos",
    "Event bus interno funcionando entre módulos",
    "API pública REST com autenticação por token",
    "Gerenciar tokens de integração com escopos e expiração",
    "Enviar mensagens WhatsApp por eventos do sistema",
    "Enviar emails transacionais (proposta, pedido, cobrança)",
    "Exportar dados em CSV, Excel e JSON",
    "Visualizar logs de todas as integrações",
    "Monitorar status de todas as integrações em painel único",
  ],
};

// ══════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════

export function getSprint10PendingItems(): DecompositionItem[] {
  return SPRINT_10_DECOMPOSITION.blocks.flatMap(b =>
    b.items.filter(i => i.status !== "done" && i.status !== "not_needed")
  );
}

export function getSprint10ReadyItems(): DecompositionItem[] {
  const doneIds = new Set(
    SPRINT_10_DECOMPOSITION.blocks
      .flatMap(b => b.items)
      .filter(i => i.status === "done")
      .map(i => i.id)
  );
  return getSprint10PendingItems().filter(item =>
    item.dependencies.every(dep => doneIds.has(dep))
  );
}

export function getSprint10BlockSummary() {
  return SPRINT_10_DECOMPOSITION.blocks.map(b => ({
    block: b.number,
    name: b.name,
    status: b.status,
    hoursRemaining: b.items.reduce((sum, i) => sum + i.estimatedHoursRemaining, 0),
  }));
}
