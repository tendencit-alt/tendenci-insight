-- Drop old trigger that only works on UPDATE
DROP TRIGGER IF EXISTS trigger_create_order_on_deal_won ON crm_deals;

-- Create new function that handles both INSERT and UPDATE
CREATE OR REPLACE FUNCTION public.create_order_on_deal_won()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_id UUID;
  v_order_exists BOOLEAN;
BEGIN
  -- Para INSERT: verificar se já vem com status 'won'
  -- Para UPDATE: verificar se status mudou para 'won'
  IF NEW.status = 'won' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.status IS NULL OR OLD.status != 'won'))) THEN
    
    -- Verificar se já existe pedido para este deal
    SELECT EXISTS (SELECT 1 FROM orders WHERE deal_id = NEW.id) INTO v_order_exists;
    
    IF NOT v_order_exists THEN
      -- Buscar client_id do lead
      IF NEW.lead_id IS NOT NULL THEN
        SELECT client_id INTO v_client_id
        FROM leads
        WHERE id = NEW.lead_id;
      END IF;
      
      -- Criar pedido somente se houver cliente
      IF v_client_id IS NOT NULL THEN
        INSERT INTO orders (
          client_id,
          deal_id,
          architect_id,
          vendedor_id,
          created_by,
          valor_total,
          subtotal,
          status,
          centro_custo
        ) VALUES (
          v_client_id,
          NEW.id,
          NEW.architect_id,
          NEW.owner_id,
          NEW.owner_id,
          COALESCE(NEW.value, 0),
          COALESCE(NEW.value, 0),
          'rascunho',
          NEW.centro_custo
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger that fires on both INSERT and UPDATE
CREATE TRIGGER trigger_create_order_on_deal_won
  AFTER INSERT OR UPDATE ON public.crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION create_order_on_deal_won();