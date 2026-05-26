REVOKE EXECUTE ON FUNCTION public.sync_product_reserved_stock() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.emit_order_active_event_on_insert() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.auto_create_fulfillment_on_invoice() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.auto_reserve_stock_for_order() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.propagate_deal_history_to_timeline() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.auto_create_strategic_commitments() FROM PUBLIC, anon;