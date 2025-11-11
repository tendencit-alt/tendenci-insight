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

### Campos Obrigatórios
```json
{
  "name": "Nome do Cliente",
  "phone": "34999999999"
}
```

### Exemplo Completo (todos os campos)
```json
{
  "name": "João Silva",
  "phone": "34991234567",
  "email": "joao@email.com",
  "city": "Uberlândia",
  "state": "MG",
  "source": "WhatsApp",
  "temperature": "quente",
  "deal_title": "Projeto Cozinha Planejada",
  "deal_value": 15000,
  "product_type": "Planejado",
  "pipeline_id": "34747cb5-063a-4369-b619-d4afa6095d0d",
  "conversation_history": "Cliente perguntou sobre armários de cozinha. Interessado em orçamento.",
  "ai_status": "Aguardando orçamento"
}
```

---

## 📋 Descrição dos Campos

### Dados do Cliente (obrigatórios)
- **name** (string): Nome completo do cliente
- **phone** (string): Telefone com DDD (apenas números)

### Dados do Cliente (opcionais)
- **email** (string): E-mail do cliente
- **city** (string): Cidade
- **state** (string): Estado (UF)

### Dados do Lead
- **source** (string): Origem do lead
  - Valores aceitos: `"Instagram"`, `"WhatsApp"`, `"Meta Ads"`, `"Indicação"`, `"Outros"`
- **temperature** (string): Temperatura do lead
  - Valores aceitos: `"frio"`, `"morno"`, `"quente"`
  - Padrão: `"frio"`

### Dados do Negócio (opcionais - para criar deal automaticamente)
- **deal_title** (string): Título do negócio/projeto
- **deal_value** (number): Valor estimado do negócio
- **product_type** (string): Tipo de produto
  - Valores aceitos: `"Planejado"`, `"Móvel"`
- **pipeline_id** (string): UUID do funil (ver IDs disponíveis abaixo)
- **stage_id** (string): UUID da etapa inicial (opcional - usa primeira etapa se não informado)
- **conversation_history** (string): Histórico da conversa com a IA
- **ai_status** (string): Status identificado pela IA (ex: "Pediu orçamento", "Aguardando resposta")

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
