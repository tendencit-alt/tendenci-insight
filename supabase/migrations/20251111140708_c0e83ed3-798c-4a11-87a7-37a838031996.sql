-- Remover TODOS os triggers antigos relacionados a deal history para evitar duplicação
DROP TRIGGER IF EXISTS trigger_log_deal_creation ON public.crm_deals;
DROP TRIGGER IF EXISTS trigger_log_deal_changes ON public.crm_deals;
DROP TRIGGER IF EXISTS log_deal_stage_change_trigger ON public.crm_deals;
DROP TRIGGER IF EXISTS log_deal_history_trigger ON public.crm_deals;
DROP TRIGGER IF EXISTS update_deal_stage_trigger ON public.crm_deals;

-- Recriar apenas os triggers corretos
CREATE TRIGGER trigger_log_deal_creation
  AFTER INSERT ON public.crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.log_deal_creation();

CREATE TRIGGER trigger_log_deal_changes
  AFTER UPDATE ON public.crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.log_deal_changes();