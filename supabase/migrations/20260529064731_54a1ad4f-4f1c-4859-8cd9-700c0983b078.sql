-- Reaplica sync das comissões existentes (re-disparando o trigger via coluna observada)
DO $$
DECLARE o RECORD; v_pct numeric; BEGIN
  FOR o IN SELECT id, comissao_producao_percentual FROM public.orders WHERE COALESCE(comissao_producao_valor,0) > 0 LOOP
    v_pct := o.comissao_producao_percentual;
    UPDATE public.orders SET comissao_producao_percentual = 0 WHERE id = o.id;
    UPDATE public.orders SET comissao_producao_percentual = v_pct WHERE id = o.id;
  END LOOP;
END $$;