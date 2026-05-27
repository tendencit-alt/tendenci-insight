-- Limpar projetos órfãos de pedidos já excluídos (order_id NULL com padrão de nome de pedido)
DELETE FROM public.operational_projects
WHERE id IN ('d569ead2-8eb7-4256-8bc7-c6986f8f74b8','264d2c1e-c88b-4c06-8551-51f18096d25e','cea79ec9-e2a0-4b4d-a2cf-618a9c91a7c1');

DELETE FROM public.fin_projects
WHERE id IN ('d569ead2-8eb7-4256-8bc7-c6986f8f74b8','264d2c1e-c88b-4c06-8551-51f18096d25e','cea79ec9-e2a0-4b4d-a2cf-618a9c91a7c1')
  AND order_id IS NULL;