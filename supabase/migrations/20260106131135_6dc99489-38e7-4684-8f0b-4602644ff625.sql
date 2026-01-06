-- 1. Criar clientes para conversas IA que não têm cliente
INSERT INTO clients (name, phone, notes)
SELECT 
  COALESCE(NULLIF(icm.client_name, ''), 'Cliente ' || RIGHT(icm.phone_number, 4)),
  icm.phone_number,
  'Cliente criado via migração - conversas IA WhatsApp'
FROM ia_client_memory icm
WHERE icm.created_at >= '2026-01-01'
  AND icm.interaction_count >= 2
  AND NOT EXISTS (
    SELECT 1 FROM clients c 
    WHERE c.phone = icm.phone_number 
       OR RIGHT(c.phone, 8) = RIGHT(icm.phone_number, 8)
  );

-- 2. Criar leads para clientes que não têm lead
INSERT INTO leads (client_id, status, temperature, utm_source)
SELECT 
  c.id,
  'novo',
  'quente',
  'whatsapp_ia'
FROM ia_client_memory icm
JOIN clients c ON c.phone = icm.phone_number 
               OR RIGHT(c.phone, 8) = RIGHT(icm.phone_number, 8)
WHERE icm.created_at >= '2026-01-01'
  AND icm.interaction_count >= 2
  AND NOT EXISTS (
    SELECT 1 FROM leads l WHERE l.client_id = c.id
  );

-- 3. Criar deals para leads que não têm deal (usando IDs corretos do pipeline)
INSERT INTO crm_deals (
  title, 
  lead_id, 
  pipeline_id, 
  stage_id, 
  from_ai, 
  status, 
  ai_status,
  last_interaction,
  followup_enabled
)
SELECT 
  'Lead IA - ' || c.name,
  l.id,
  '34747cb5-063a-4369-b619-d4afa6095d0d',
  '5771c6a1-8820-4db4-976f-d263a37543ab',
  true,
  'aberto',
  'quente',
  icm.last_interaction,
  true
FROM ia_client_memory icm
JOIN clients c ON c.phone = icm.phone_number 
               OR RIGHT(c.phone, 8) = RIGHT(icm.phone_number, 8)
JOIN leads l ON l.client_id = c.id
WHERE icm.created_at >= '2026-01-01'
  AND icm.interaction_count >= 2
  AND NOT EXISTS (
    SELECT 1 FROM crm_deals d WHERE d.lead_id = l.id
  );