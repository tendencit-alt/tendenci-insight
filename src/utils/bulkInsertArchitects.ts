import { supabase } from '@/integrations/supabase/client';
import { processArchitectsFromFile } from './processArchitectsFile';

export async function bulkInsertArchitects() {
  try {
    // Processar planilha
    const architects = await processArchitectsFromFile('/data/aniversariantes.xlsx');
    
    console.log(`Processando ${architects.length} arquitetos...`);
    
    // Inserir em lotes de 100
    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < architects.length; i += batchSize) {
      const batch = architects.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('architects')
        .insert(
          batch.map(arch => ({
            name: arch.name,
            email: arch.email,
            phone: arch.phone,
            birthday: arch.birthday,
            categoria: arch.categoria,
            status_funil: 'novo_arquiteto',
          }))
        );
      
      if (error) {
        console.error(`Erro no lote ${i / batchSize + 1}:`, error);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
      }
    }
    
    return {
      success: true,
      total: architects.length,
      successCount,
      errorCount,
    };
  } catch (error) {
    console.error('Erro ao importar arquitetos:', error);
    throw error;
  }
}
