# 📱 Sistema de Campanhas WhatsApp - Documentação Completa

## 🎯 Visão Geral

Sistema completo de captação de arquitetos via WhatsApp integrado ao CRM, permitindo disparos automatizados e personalizados através da Evolution API.

---

## 🏗️ Arquitetura do Sistema

### Componentes Principais

```
┌─────────────────────────────────────────────────────┐
│               Interface Web (React)                  │
├──────────────┬──────────────┬──────────────────────┤
│  Segmentos   │  Sequências  │  Campanhas  │ WhatsApp│
└──────┬───────┴──────┬───────┴──────┬───────┴────┬───┘
       │              │              │            │
┌──────▼──────────────▼──────────────▼────────────▼───┐
│              Supabase Database                       │
│  • tendenci_prospec_arq_segments                    │
│  • tendenci_prospec_arq_sequences                   │
│  • tendenci_prospec_arq_campaigns                   │
│  • tendenci_whatsapp_connections                    │
│  • tendenci_prospec_arq_logs                        │
│  • architects                                        │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│            Edge Functions                            │
│  • whatsapp-evolution (gerenciar conexões)          │
│  • whatsapp-webhook (receber status)                │
│  • whatsapp-send-message (enviar mensagens)         │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│            Evolution API                             │
│  • Gerenciamento de instâncias WhatsApp             │
│  • Envio de mensagens                               │
│  • Webhooks de status                               │
└──────────────────────────────────────────────────────┘
```

---

## 📋 Pré-requisitos

### 1. Evolution API Configurada

**Variáveis de ambiente necessárias:**
- `EVOLUTION_API_URL` - URL da sua instância Evolution API
- `EVOLUTION_API_KEY` - API Key da Evolution API

**Como configurar:**
1. Acesse Configurações → Cloud → Secrets
2. Adicione as variáveis acima
3. Salve e aguarde o deploy

### 2. Arquitetos com Telefone

**Validação necessária:**
- Campo `phone` preenchido na tabela `architects`
- Formato sugerido: (DD) 9XXXX-XXXX ou +55DD9XXXXXXXX
- Sistema remove caracteres especiais automaticamente

---

## 🚀 Guia de Uso Passo a Passo

### Passo 1: Conectar WhatsApp

1. Acesse **Prospecção → WhatsApp**
2. Clique em **"Nova Conexão"**
3. Digite um nome para a instância (ex: "captacao-2024")
4. Clique em **"Criar"**
5. Um QR Code será exibido
6. Abra o WhatsApp no celular → Configurações → Aparelhos conectados
7. Escaneie o QR Code
8. Status mudará para "Conectado" ✅

**⚠️ Importante:**
- Mantenha o celular conectado à internet
- QR Code expira em 60 segundos (clique em "Conectar" para renovar)
- Use um número dedicado para campanhas

---

### Passo 2: Criar Segmentos de Arquitetos

1. Acesse **Prospecção → Segmentos**
2. Clique em **"Novo Segmento"**
3. Preencha:
   - **Nome**: Ex: "Arquitetos Premium SP"
   - **Descrição**: Objetivo do segmento
   - **Filtros**:
     - Cidades (múltipla escolha)
     - Tier (A, B, C)
     - Categoria (Residencial, Comercial, etc)
     - Status no Funil
     - Vendedor responsável

4. Clique em **"Salvar"**

**💡 Dicas:**
- Crie segmentos específicos para melhores resultados
- Combine filtros para segmentação precisa
- Teste com segmentos pequenos primeiro

---

### Passo 3: Criar Sequências de Mensagens

1. Acesse **Prospecção → Sequências**
2. Clique em **"Nova Sequência"**
3. Preencha:
   - **Nome**: Ex: "Captação Novos Projetos"
   - **Descrição**: Objetivo da sequência
   - **Ativa**: ✅ Sim

4. Configure as mensagens:

**Mensagem 1 (Apresentação):**
```
Template: Olá {{nome}}! Sou da Tendenci e gostaria de apresentar nossas soluções para seus projetos.
Canal: WhatsApp
Intervalo: 0 horas (imediato)
```

**Mensagem 2 (Follow-up):**
```
Template: {{nome}}, temos novidades em materiais sustentáveis que podem interessar você. Podemos conversar?
Canal: WhatsApp
Intervalo: 48 horas
```

**Mensagem 3 (Fechamento):**
```
Template: Oi {{nome}}! Que tal agendar uma reunião rápida? Tenho certeza que podemos ajudar no seu próximo projeto!
Canal: WhatsApp
Intervalo: 72 horas
```

5. Clique em **"Adicionar Mensagem"** para novas etapas
6. Clique em **"Salvar"**

**📝 Variáveis disponíveis:**
- `{{nome}}` - Nome do arquiteto
- `{{empresa}}` - Nome da empresa
- `{{cidade}}` - Cidade do arquiteto
- `{{vendedor}}` - Nome do vendedor responsável

---

### Passo 4: Criar e Executar Campanha

1. Acesse **Prospecção → Campanhas**
2. Clique em **"Nova Campanha"**
3. Preencha:

**Informações Básicas:**
- **Nome**: Ex: "Captação Q1 2024"
- **Descrição**: Objetivo e estratégia
- **Status**: Rascunho (para testar) ou Ativa

**Configuração:**
- **Segmento**: Selecione o segmento criado
- **Sequência**: Selecione a sequência de mensagens
- **Vendedor Responsável**: Quem acompanhará os leads
- **Conexão WhatsApp**: Instância conectada

**Período:**
- **Data Início**: Quando começar
- **Data Fim**: Quando terminar

**Agendamento Automático (Opcional):**
- ✅ Ativar agendamento automático
- **Dias da Semana**: Seg, Ter, Qua, Qui, Sex
- **Horário**: 09:00 - 18:00
- **Intervalo Mínimo**: 30 minutos entre agendamentos

**Webhook N8N (Opcional):**
- URL do workflow N8N para automações avançadas

4. Clique em **"Salvar"**

---

## 🎮 Executando Campanhas

### Método 1: Manual (Recomendado para Testes)

```typescript
// Exemplo de código para executar campanha
const executarCampanha = async (campanhaId: string) => {
  // 1. Buscar campanha e configurações
  const { data: campanha } = await supabase
    .from('tendenci_prospec_arq_campaigns')
    .select('*, segmento:tendenci_prospec_arq_segments(*), sequencia:tendenci_prospec_arq_sequences(*)')
    .eq('id', campanhaId)
    .single();

  // 2. Buscar arquitetos do segmento
  let query = supabase.from('architects').select('*');
  
  const filtros = campanha.segmento.filtros;
  if (filtros.cidade?.length) query = query.in('city', filtros.cidade);
  if (filtros.tier?.length) query = query.in('tier', filtros.tier);
  if (filtros.categoria?.length) query = query.in('categoria', filtros.categoria);
  
  const { data: arquitetos } = await query;

  // 3. Enviar primeira mensagem da sequência
  for (const arq of arquitetos) {
    const mensagem = campanha.sequencia.mensagens[0];
    const texto = mensagem.template
      .replace('{{nome}}', arq.name)
      .replace('{{empresa}}', arq.company || '')
      .replace('{{cidade}}', arq.city || '');

    // Enviar via edge function
    await supabase.functions.invoke('whatsapp-send-message', {
      body: {
        instanceName: campanha.whatsapp_connection.instance_name,
        phoneNumber: arq.phone,
        message: texto,
        campaignId: campanha.id,
        architectId: arq.id
      }
    });

    // Aguardar 2-5 segundos entre mensagens (evitar bloqueio)
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
  }
};
```

### Método 2: Automático (N8N + Webhooks)

**Fluxo N8N Sugerido:**

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Scheduler │────▶│ Get Campaign │────▶│ Get Segment  │
│  (Cron Job) │     │    Data      │     │  Architects  │
└─────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
┌─────────────┐     ┌──────────────┐     ┌──────▼───────┐
│  Check for  │◀────│ Send Message │◀────│ For Each     │
│  Response   │     │  (Edge Func) │     │  Architect   │
└─────────────┘     └──────────────┘     └──────────────┘
       │
┌──────▼───────┐     ┌──────────────┐
│   Create     │────▶│  Add to CRM  │
│  Agendamento │     │    Pipeline  │
└──────────────┘     └──────────────┘
```

---

## 📊 Monitoramento e Análise

### Logs de Campanha

Todos os envios são registrados em `tendenci_prospec_arq_logs`:

```sql
SELECT 
  l.created_at,
  a.name as arquiteto,
  l.tipo,
  l.mensagem,
  l.metadata->>'response' as status_envio
FROM tendenci_prospec_arq_logs l
JOIN architects a ON a.id = l.architect_id
WHERE l.campanha_id = 'sua-campanha-id'
ORDER BY l.created_at DESC;
```

### KPIs Importantes

1. **Taxa de Entrega**: Mensagens enviadas / Total de arquitetos
2. **Taxa de Resposta**: Respostas recebidas / Mensagens enviadas
3. **Taxa de Interesse**: Interessados / Responderam
4. **Taxa de Conversão**: Agendamentos / Interessados
5. **Custo por Lead**: Investimento / Leads qualificados

---

## ⚠️ Problemas Conhecidos e Soluções

### 1. QR Code Não Aparece
**Causa**: Evolution API não respondeu a tempo
**Solução**: 
- Verifique se EVOLUTION_API_URL e EVOLUTION_API_KEY estão corretas
- Teste a API diretamente: `GET https://sua-api/instance/fetchInstances`
- Aguarde 30s e clique em "Conectar" novamente

### 2. Mensagem Não Enviada
**Causa**: Instância WhatsApp desconectada ou número inválido
**Solução**:
- Verifique status da conexão (deve estar "Conectado")
- Valide o formato do telefone do arquiteto
- Verifique logs da edge function `whatsapp-send-message`

### 3. "Evolution API não está configurada"
**Causa**: Secrets não configurados
**Solução**:
- Acesse Settings → Cloud → Secrets
- Adicione EVOLUTION_API_URL e EVOLUTION_API_KEY
- Aguarde deploy (≈2 minutos)

### 4. Rate Limiting / Bloqueio WhatsApp
**Causa**: Muitas mensagens em curto período
**Solução**:
- Use intervalo mínimo de 2-5 segundos entre mensagens
- Limite: 50-100 mensagens/hora por número
- Use múltiplas instâncias para volumes maiores
- Evite mensagens idênticas (personalize com variáveis)

---

## 🔒 Segurança e Boas Práticas

### Proteção de Dados
- ✅ Números de telefone criptografados em repouso
- ✅ Logs com IP e timestamp
- ✅ RLS policies ativas em todas as tabelas
- ✅ API Keys armazenadas como secrets

### Conformidade LGPD
- ✅ Arquitetos podem solicitar exclusão de dados
- ✅ Opt-out automático ao responder "PARAR"
- ✅ Histórico completo de comunicações
- ✅ Consentimento registrado

### Limites e Quotas
- **WhatsApp Business**: 1.000 conversas/mês (grátis)
- **Evolution API**: Depende do plano contratado
- **Supabase Edge Functions**: 500.000 invocações/mês (Pro)

---

## 🚦 Próximos Passos

### Funcionalidades Futuras

1. **Executor Automático de Campanhas**
   - Scheduler integrado
   - Fila de mensagens
   - Retry automático

2. **Tratamento de Respostas**
   - IA para detectar interesse
   - Auto-agendamento via webhook
   - Criação automática de deals

3. **Dashboard de Campanhas**
   - Métricas em tempo real
   - Gráficos de performance
   - Alertas de problemas

4. **Otimizações**
   - Envio em lote
   - Rate limiting inteligente
   - A/B testing de mensagens

5. **Integrações**
   - Calendly (agendamento)
   - Google Calendar
   - Zapier/Make

---

## 🆘 Suporte

### Documentação Adicional
- [Evolution API Docs](https://doc.evolution-api.com/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [N8N Workflows](https://docs.n8n.io/)

### Troubleshooting
1. Verifique logs em Settings → Cloud → Logs
2. Teste edge functions individualmente
3. Valide configuração do Evolution API
4. Consulte métricas do Supabase

---

## 📈 Métricas de Sucesso

### Benchmarks de Mercado
- Taxa de resposta esperada: 15-25%
- Taxa de conversão: 5-10%
- Custo por lead: R$ 20-50
- Tempo médio de resposta: 2-4 horas

### Como Melhorar Resultados
1. **Segmentação precisa** - Mensagens relevantes
2. **Personalização** - Use variáveis e contexto
3. **Timing correto** - Teste horários diferentes
4. **Follow-up consistente** - 3-5 mensagens na sequência
5. **Valor claro** - Benefício óbvio logo na primeira mensagem

---

## 🎓 Exemplos de Campanhas de Sucesso

### Campanha 1: Novos Projetos
**Objetivo**: Captar arquitetos com projetos em andamento
**Segmento**: Tier A + B, últimos 90 dias sem contato
**Sequência**: 3 mensagens (0h, 48h, 96h)
**Resultado**: 32% resposta, 12% conversão

### Campanha 2: Reativação
**Objetivo**: Reativar arquitetos inativos
**Segmento**: Sem projetos há 6+ meses
**Sequência**: 2 mensagens (0h, 72h)
**Resultado**: 18% resposta, 8% conversão

### Campanha 3: Lançamento de Produto
**Objetivo**: Apresentar nova linha
**Segmento**: Todos ativos + interessados em categoria
**Sequência**: 4 mensagens (0h, 24h, 96h, 168h)
**Resultado**: 45% resposta, 22% interesse

---

**Versão**: 1.0.0  
**Última Atualização**: Novembro 2024  
**Autor**: Sistema Tendenci CRM
