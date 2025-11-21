-- Adicionar campos tipo_tarefa e whatsapp_number na tabela tendenci_prospec_arq_agendamentos
ALTER TABLE tendenci_prospec_arq_agendamentos
ADD COLUMN tipo_tarefa TEXT NOT NULL DEFAULT 'interna' CHECK (tipo_tarefa IN ('interna', 'automatizada')),
ADD COLUMN whatsapp_number TEXT;