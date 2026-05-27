CREATE TABLE IF NOT EXISTS public._diag_orphans_audit (k text, v text);
TRUNCATE public._diag_orphans_audit;

INSERT INTO public._diag_orphans_audit
SELECT 'order', concat('id=', id, ' n=', order_number, ' tenant=', tenant_id, ' client=', client_id)
FROM public.orders
WHERE tenant_id IN ('11912d24-f3f2-41cb-8b35-d094352d5995','423ab4ec-9741-464b-948f-9edf6297e783');

INSERT INTO public._diag_orphans_audit
SELECT 'recv_orphan', concat('doc=', document_number, ' tenant=', tenant_id, ' order=', order_id, ' amount=', amount)
FROM public.fin_receivables WHERE id='b9f91f26-e948-4106-8dbc-f67c153ccfb4';

INSERT INTO public._diag_orphans_audit
SELECT 'ledger_orphan', concat('doc=', document_number, ' tenant=', tenant_id, ' order=', order_id, ' amount=', amount)
FROM public.fin_ledger_entries WHERE id='0527de26-2d56-4f9d-a9b3-041031754a08';

GRANT SELECT ON public._diag_orphans_audit TO anon, authenticated;