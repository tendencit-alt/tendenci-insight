-- Vincular instâncias WhatsApp existentes aos vendedores corretos
UPDATE tendenci_whatsapp_connections 
SET user_id = 'bbf765ae-10fe-4a56-9956-531641d2f633'
WHERE instance_name = 'Maíra' AND user_id IS NULL;

UPDATE tendenci_whatsapp_connections 
SET user_id = '2f572303-3b1e-4ecb-9de4-cca0a25ffb4b'
WHERE instance_name = 'POLLYANNA' AND user_id IS NULL;