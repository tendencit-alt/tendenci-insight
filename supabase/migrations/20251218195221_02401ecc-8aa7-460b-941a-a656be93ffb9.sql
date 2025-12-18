-- Corrigir search_path da função criada
CREATE OR REPLACE FUNCTION sync_deal_notes_to_related()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a nota foi atualizada e não está vazia
  IF NEW.note IS NOT NULL AND NEW.note != '' THEN
    -- Sincronizar para cliente via lead
    UPDATE public.clients c
    SET notes = NEW.note
    FROM public.leads l
    WHERE l.id = NEW.lead_id
      AND l.client_id = c.id;
      
    -- Sincronizar para projeto relacionado
    UPDATE public.projects
    SET notes = NEW.note
    WHERE crm_deal_id = NEW.id OR deal_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;