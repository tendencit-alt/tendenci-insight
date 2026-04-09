
-- Record deletion audit for Tendenci Mobiliarios
INSERT INTO public.deleted_records (original_table, original_id, record_type, record_identifier, original_data, deletion_reason)
SELECT 'tenants', id, 'empresa', name, to_jsonb(t.*), 'Exclusão solicitada pelo Owner via painel'
FROM tenants t WHERE id = '7087195b-cf1f-41e8-bdad-c237ae126a6d';

-- Record deletion audit for Tendenci Planejados
INSERT INTO public.deleted_records (original_table, original_id, record_type, record_identifier, original_data, deletion_reason)
SELECT 'tenants', id, 'empresa', name, to_jsonb(t.*), 'Exclusão solicitada pelo Owner via painel'
FROM tenants t WHERE id = '284398d9-38f2-40d3-a4da-4ebe8a9a8759';

-- Delete menu_items for both tenants
DELETE FROM public.menu_items WHERE tenant_id IN ('7087195b-cf1f-41e8-bdad-c237ae126a6d', '284398d9-38f2-40d3-a4da-4ebe8a9a8759');

-- Delete company_settings for both tenants
DELETE FROM public.company_settings WHERE tenant_id IN ('7087195b-cf1f-41e8-bdad-c237ae126a6d', '284398d9-38f2-40d3-a4da-4ebe8a9a8759');

-- Delete profiles for both tenants
DELETE FROM public.profiles WHERE tenant_id IN ('7087195b-cf1f-41e8-bdad-c237ae126a6d', '284398d9-38f2-40d3-a4da-4ebe8a9a8759');

-- Delete the tenants
DELETE FROM public.tenants WHERE id IN ('7087195b-cf1f-41e8-bdad-c237ae126a6d', '284398d9-38f2-40d3-a4da-4ebe8a9a8759');
