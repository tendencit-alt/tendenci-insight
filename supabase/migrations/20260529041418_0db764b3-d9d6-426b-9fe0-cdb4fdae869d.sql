UPDATE public.fin_payables p
SET document_number = 'PED-' || o.order_number || '/' || COALESCE(ca.code, 'CMP'),
    order_id = COALESCE(p.order_id, osc.order_id),
    chart_account_id = COALESCE(p.chart_account_id, osc.chart_account_id)
FROM public.order_strategic_commitments osc
JOIN public.orders o ON o.id = osc.order_id
LEFT JOIN public.fin_chart_accounts ca ON ca.id = osc.chart_account_id
WHERE p.document_number = 'COMP-' || osc.id::text;

UPDATE public.fin_ledger_entries le
SET document_number = 'PED-' || o.order_number || '/' || COALESCE(ca.code, 'CMP'),
    order_id = COALESCE(le.order_id, osc.order_id),
    chart_account_id = COALESCE(le.chart_account_id, osc.chart_account_id)
FROM public.order_strategic_commitments osc
JOIN public.orders o ON o.id = osc.order_id
LEFT JOIN public.fin_chart_accounts ca ON ca.id = osc.chart_account_id
WHERE le.document_number = 'COMP-' || osc.id::text;