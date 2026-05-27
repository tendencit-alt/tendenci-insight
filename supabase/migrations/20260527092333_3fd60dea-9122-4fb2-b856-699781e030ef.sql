
ALTER TABLE orders ENABLE TRIGGER trg_validate_order_status;
ALTER TABLE orders ENABLE TRIGGER trg_block_order_structural_edit;

UPDATE delivery_orders SET status='entregue', delivered_date=NOW() WHERE order_id='33333333-e2e0-4000-8000-000000000100';
UPDATE installation_orders SET status='concluida', completed_date=NOW() WHERE order_id='33333333-e2e0-4000-8000-000000000100';
