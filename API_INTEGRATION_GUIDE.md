# 📋 Guia de Integração n8n → Tendenci CRM

## 🔗 Informações da API

### Endpoint da Edge Function
```
https://emnwuzrysqoiwapzmnbv.supabase.co/functions/v1/create-lead-from-ai
```

### Configuração do HTTP Request no n8n

| Campo | Valor |
|-------|-------|
| **HTTP Method** | `POST` |
| **URL** | `https://emnwuzrysqoiwapzmnbv.supabase.co/functions/v1/create-lead-from-ai` |
| **Authentication** | `None` (ou Generic Credential Type se preferir) |
| **Headers** | Ver abaixo |
| **Body Content** | `JSON` |

---

## 📝 Headers Obrigatórios

```json
{
  "Content-Type": "application/json",
  "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtbnd1enJ5c3FvaXdhcHptbmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MjkxMjMsImV4cCI6MjA3ODEwNTEyM30.tzEXZQShQWgyyJHxvCVYIGQg0gal-LuO4jlKQDFjq-c",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtbnd1enJ5c3FvaXdhcHptbmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MjkxMjMsImV4cCI6MjA3ODEwNTEyM30.tzEXZQShQWgyyJHxvCVYIGQg0gal-LuO4jlKQDFjq-c"
}
```

---

## 📤 Estrutura do JSON (Body)

### ✨ Campos Aceitos (Português OU Inglês)

**Campos Obrigatórios:**
- `name` ou `nome`: Nome completo do cliente
- `phone` ou `contato_whatsapp` ou `telefone`: Telefone/WhatsApp
  - Aceita com ou sem `@s.whatsapp.net`
  - Apenas números serão salvos (formatação automática)

**Dados do Cliente (opcionais):**
- `email`: E-mail do cliente
- `city` ou `cidade`: Cidade
- `state` ou `estado`: Estado (UF)

**Dados do Lead (opcionais):**
- `source` ou `origem`: Origem do lead
  - Valores: `"Instagram"`, `"WhatsApp"`, `"Meta Ads"`, `"Indicação"`, `"Outros"`
- `temperature` ou `temperatura`: Temperatura do lead
  - Valores: `"frio"`, `"morno"`, `"quente"` (padrão: `"frio"`)

**Dados do Negócio (opcionais - para criar deal automaticamente):**
- `deal_title` ou `titulo_negocio`: Título do negócio/projeto
- `deal_value` ou `valor_negocio`: Valor estimado (número)
- `product_type` ou `tipo_produto`: `"Planejado"` ou `"Móvel"`
- `pipeline_id` ou `funil_id`: UUID do funil (ver IDs disponíveis abaixo)
- `stage_id` ou `etapa_id`: UUID da etapa inicial (opcional)
- `conversation_history` ou `conversa_whatsapp` ou `historico_conversa`: Histórico completo da conversa
- `ai_status` ou `status_ia`: Status identificado pela IA

### Exemplo Mínimo (Português)
```json
{
  "nome": "Felipe",
  "contato_whatsapp": "553484297404@s.whatsapp.net"
}
```

### Exemplo Mínimo (Inglês)
```json
{
  "name": "Felipe",
  "phone": "34984297404"
}
```

### Exemplo Completo com IA (Português)
```json
{
  "nome": "Felipe",
  "contato_whatsapp": "553484297404",
  "temperatura": "quente",
  "conversa_whatsapp": "Vamos avançar com a visita técnica pra medir e iniciar o 3D. Tenho hoje às 16h ou amanhã às 10h, qual você prefere?",
  "status_ia": "Aguardando agendamento",
  "titulo_negocio": "Cozinha Planejada",
  "valor_negocio": 15000,
  "tipo_produto": "Planejado",
  "funil_id": "34747cb5-063a-4369-b619-d4afa6095d0d"
}
```

---

## 📋 Descrição Detalhada dos Campos

| Campo Português | Campo Inglês | Tipo | Obrigatório | Descrição |
|-----------------|--------------|------|-------------|-----------|
| `nome` | `name` | string | ✅ Sim | Nome completo do cliente |
| `contato_whatsapp` / `telefone` | `phone` | string | ✅ Sim | Telefone com DDD (aceita `@s.whatsapp.net`, será removido automaticamente) |
| - | `email` | string | ❌ Não | E-mail do cliente |
| `cidade` | `city` | string | ❌ Não | Cidade do cliente |
| `estado` | `state` | string | ❌ Não | Estado (UF) |
| `origem` | `source` | string | ❌ Não | Origem do lead: `"Instagram"`, `"WhatsApp"`, `"Meta Ads"`, `"Indicação"`, `"Outros"` |
| `temperatura` | `temperature` | string | ❌ Não | `"frio"`, `"morno"`, `"quente"` (padrão: `"frio"`) |
| `titulo_negocio` | `deal_title` | string | ❌ Não | Título do negócio/projeto |
| `valor_negocio` | `deal_value` | number | ❌ Não | Valor estimado do negócio |
| `tipo_produto` | `product_type` | string | ❌ Não | `"Planejado"` ou `"Móvel"` |
| `funil_id` | `pipeline_id` | string | ❌ Não | UUID do funil (ver seção abaixo) |
| `etapa_id` | `stage_id` | string | ❌ Não | UUID da etapa inicial (usa primeira etapa se não informado) |
| `conversa_whatsapp` / `historico_conversa` | `conversation_history` | string | ❌ Não | Histórico completo da conversa |
| `status_ia` | `ai_status` | string | ❌ Não | Status identificado pela IA (ex: "Pediu orçamento", "Aguardando resposta") |

---

## 🎯 IDs dos Funis Disponíveis

```
Funil de Vendas Padrão: 34747cb5-063a-4369-b619-d4afa6095d0d
funil tendenci: bb8095bf-3a64-4772-ba9a-9bb1e4899b74
Funil Matheus: e3db5798-b4d3-4223-82a1-0ebcf294f5e7
CRM PLANEJADOS: c7d20562-1599-4be6-a439-a3791b2ff20b
CRM MOBILIARIO: 52420697-b927-4710-9e3b-3e54ebbc582a
```

---

## ✅ Resposta de Sucesso

```json
{
  "success": true,
  "message": "Lead criado com sucesso",
  "data": {
    "client_id": "uuid-do-cliente",
    "lead_id": "uuid-do-lead",
    "deal_id": "uuid-do-deal-ou-null"
  }
}
```

---

## ❌ Exemplos de Erro

### Campos obrigatórios faltando
```json
{
  "error": "Nome e telefone são obrigatórios"
}
```

### Erro interno
```json
{
  "error": "Erro ao criar lead",
  "details": { ... }
}
```

---

## 🔄 Fluxo de Funcionamento

1. **Verifica se cliente existe** (pelo telefone)
   - Se existir: atualiza dados
   - Se não existir: cria novo cliente

2. **Cria lead** vinculado ao cliente

3. **Cria negócio** (opcional)
   - Apenas se `deal_title` e `pipeline_id` forem fornecidos
   - Se `stage_id` não fornecido, usa primeira etapa do funil automaticamente

4. **Retorna IDs** criados para referência

---

## 🧪 Teste Rápido (cURL)

```bash
curl -X POST https://emnwuzrysqoiwapzmnbv.supabase.co/functions/v1/create-lead-from-ai \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtbnd1enJ5c3FvaXdhcHptbmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MjkxMjMsImV4cCI6MjA3ODEwNTEyM30.tzEXZQShQWgyyJHxvCVYIGQg0gal-LuO4jlKQDFjq-c" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtbnd1enJ5c3FvaXdhcHptbmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MjkxMjMsImV4cCI6MjA3ODEwNTEyM30.tzEXZQShQWgyyJHxvCVYIGQg0gal-LuO4jlKQDFjq-c" \
  -d '{
    "name": "Teste Cliente",
    "phone": "34999887766",
    "email": "teste@email.com",
    "source": "WhatsApp",
    "temperature": "quente",
    "deal_title": "Teste Projeto",
    "deal_value": 5000,
    "pipeline_id": "34747cb5-063a-4369-b619-d4afa6095d0d",
    "conversation_history": "Cliente interessado em móveis planejados"
  }'
```

---

## 💡 Dicas para n8n

1. Use **variáveis dinâmicas** do n8n para preencher os campos do JSON baseado nas respostas da IA
2. Capture o telefone do cliente automaticamente do WhatsApp
3. Use lógica condicional para definir `temperature` baseado no engajamento
4. Armazene os IDs retornados para atualizar o lead posteriormente
5. Configure **error handling** para tentar novamente em caso de falha

---

## 🔐 Segurança

- A API aceita apenas requisições autenticadas
- O `apikey` e `Authorization` header são obrigatórios
- Todas as operações são registradas no banco de dados
- A função valida e sanitiza todos os dados recebidos

---

## 📞 Suporte

Para dúvidas ou problemas, verifique os logs da Edge Function no painel do Lovable Cloud.
