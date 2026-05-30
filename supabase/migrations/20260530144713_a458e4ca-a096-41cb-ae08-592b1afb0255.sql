ALTER TABLE public.erp_notifications DROP CONSTRAINT IF EXISTS erp_notifications_module_check;

ALTER TABLE public.erp_notifications
ADD CONSTRAINT erp_notifications_module_check
CHECK (
  module = ANY (
    ARRAY[
      'comercial',
      'financeiro',
      'operacional',
      'aprovacao',
      'planejamento',
      'sistema',
      'compras',
      'estoque',
      'producao',
      'rh',
      'fulfillment'
    ]
  )
);