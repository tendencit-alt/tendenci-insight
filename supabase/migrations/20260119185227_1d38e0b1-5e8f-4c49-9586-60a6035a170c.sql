-- Tabela para armazenar registros excluídos com rastreabilidade
CREATE TABLE public.deleted_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação do registro original
  original_table TEXT NOT NULL,
  original_id UUID NOT NULL,
  original_data JSONB NOT NULL,
  
  -- Rastreabilidade
  deleted_by UUID REFERENCES public.profiles(id),
  deleted_by_name TEXT,
  deleted_at TIMESTAMPTZ DEFAULT now(),
  
  -- Informações adicionais
  deletion_reason TEXT,
  record_type TEXT NOT NULL,
  record_identifier TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_deleted_records_table ON public.deleted_records(original_table);
CREATE INDEX idx_deleted_records_type ON public.deleted_records(record_type);
CREATE INDEX idx_deleted_records_deleted_at ON public.deleted_records(deleted_at DESC);
CREATE INDEX idx_deleted_records_deleted_by ON public.deleted_records(deleted_by);

-- RLS
ALTER TABLE public.deleted_records ENABLE ROW LEVEL SECURITY;

-- Apenas usuários admin podem ver registros excluídos
CREATE POLICY "Admins can view deleted records" ON public.deleted_records
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Usuários autenticados podem inserir registros de exclusão
CREATE POLICY "Authenticated users can insert deleted records" ON public.deleted_records
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Função para registrar exclusão
CREATE OR REPLACE FUNCTION public.log_deletion(
  p_table TEXT,
  p_id UUID,
  p_data JSONB,
  p_type TEXT,
  p_identifier TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_name TEXT;
  v_record_id UUID;
BEGIN
  -- Obter informações do usuário que está excluindo
  SELECT id, COALESCE(full_name, username, email) 
  INTO v_user_id, v_user_name
  FROM profiles 
  WHERE id = auth.uid();
  
  -- Inserir registro de exclusão
  INSERT INTO deleted_records (
    original_table, original_id, original_data,
    deleted_by, deleted_by_name, deletion_reason,
    record_type, record_identifier
  ) VALUES (
    p_table, p_id, p_data,
    v_user_id, v_user_name, p_reason,
    p_type, p_identifier
  ) RETURNING id INTO v_record_id;
  
  RETURN v_record_id;
END;
$$;