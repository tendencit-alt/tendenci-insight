import { supabase } from "@/integrations/supabase/client";

interface FieldChange {
  field_name: string;
  old_value: string;
  new_value: string;
}

export const logDealChange = async (
  dealId: string,
  changes: FieldChange | FieldChange[]
) => {
  const changesArray = Array.isArray(changes) ? changes : [changes];
  const { data: userData } = await supabase.auth.getUser();
  
  const historyEntries = changesArray.map((change) => ({
    deal_id: dealId,
    from_stage_id: null,
    to_stage_id: dealId, // Required field, we use deal_id as placeholder for non-stage changes
    action_type: 'field_change',
    field_name: change.field_name,
    old_value: change.old_value || null,
    new_value: change.new_value || null,
    description: `${getFieldLabel(change.field_name)} alterado de "${change.old_value || 'vazio'}" para "${change.new_value || 'vazio'}"`,
    moved_by: userData.user?.id || null,
    moved_at: new Date().toISOString(),
  }));

  await supabase.from("crm_deal_history").insert(historyEntries);
};

export const logStageChange = async (
  dealId: string,
  fromStageId: string,
  toStageId: string
) => {
  const { data: userData } = await supabase.auth.getUser();
  
  await supabase.from("crm_deal_history").insert({
    deal_id: dealId,
    from_stage_id: fromStageId,
    to_stage_id: toStageId,
    action_type: 'stage_change',
    moved_by: userData.user?.id || null,
    moved_at: new Date().toISOString(),
  });
};

function getFieldLabel(fieldName: string): string {
  const labels: { [key: string]: string } = {
    'title': 'Título',
    'value': 'Valor',
    'owner_id': 'Vendedor Responsável',
    'status': 'Status',
    'note': 'Observação',
    'architect_id': 'Arquiteto',
    'scheduled_call': 'Ligação Agendada',
    'last_interaction': 'Última Interação',
    'lost_reason': 'Motivo da Perda',
    'lost_note': 'Nota da Perda',
    'product_type': 'Tipo de Produto',
    'categoria': 'Categoria',
    'centro_custo': 'Centro de Custo',
    'tipo_produto': 'Tipo de Produto',
    'pipeline_id': 'Pipeline',
    'stage_id': 'Etapa',
  };
  
  return labels[fieldName] || fieldName;
}

// Helper to get display value for certain fields
export const getDisplayValue = async (fieldName: string, value: any): Promise<string> => {
  if (!value) return '';
  
  // Handle specific fields that need lookup
  switch (fieldName) {
    case 'owner_id':
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', value)
        .single();
      return profile?.full_name || profile?.email || value;
      
    case 'architect_id':
      const { data: architect } = await supabase
        .from('architects')
        .select('name')
        .eq('id', value)
        .single();
      return architect?.name || value;
      
    case 'pipeline_id':
      const { data: pipeline } = await supabase
        .from('crm_pipelines')
        .select('name')
        .eq('id', value)
        .single();
      return pipeline?.name || value;
      
    case 'stage_id':
      const { data: stage } = await supabase
        .from('crm_stages')
        .select('name')
        .eq('id', value)
        .single();
      return stage?.name || value;
      
    default:
      return String(value);
  }
};
