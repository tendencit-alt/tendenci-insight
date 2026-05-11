import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { readExcelFromUrl } from '@/utils/excelReader';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function FinalBulkImport() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'processing' | 'success' | 'error'>('loading');
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, errors: 0 });

  useEffect(() => {
    processAndInsertAll();
  }, []);

  const processAndInsertAll = async () => {
    try {
      setStatus('processing');
      console.log('Fetching Excel file...');
      
      const data = await readExcelFromUrl('/data/aniversariantes-2.xlsx');

      console.log(`Excel loaded: ${data.length} rows`);
      setProgress(prev => ({ ...prev, total: data.length }));

      // Get existing phones
      const { data: existingArchitects } = await supabase
        .from('architects')
        .select('phone')
        .eq('categoria', 'metropolitano');

      const existingPhones = new Set(existingArchitects?.map(a => a.phone) || []);
      console.log(`Existing architects: ${existingPhones.size}`);

      // Process all data
      const architectsToInsert: any[] = [];
      
      for (const row of data as any[]) {
        let birthday = null;
        if (row['Data de Nascimento']) {
          const dateStr = String(row['Data de Nascimento']);
          if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/');
            if (year && parseInt(year) > 1900 && parseInt(year) < 2025) {
              birthday = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          } else if (dateStr.includes('-') || dateStr.includes('T')) {
            // ISO format from Date object
            birthday = dateStr.split('T')[0];
          }
        }

        const phone = String(row['Telefone'] || '').replace(/\D/g, '');
        const name = (row['Profissional Parceiro'] || '').trim();
        const email = (row['Email'] || '').trim();

        if (name && phone && phone.length >= 8 && !existingPhones.has(phone)) {
          architectsToInsert.push({
            name,
            email: email || null,
            phone,
            birthday,
            categoria: 'metropolitano',
            status_funil: 'novo_profissional parceiro',
          });
        }
      }

      console.log(`Will insert ${architectsToInsert.length} new architects`);
      setProgress(prev => ({ ...prev, total: architectsToInsert.length }));

      // Insert in batches of 500
      const batchSize = 500;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < architectsToInsert.length; i += batchSize) {
        const batch = architectsToInsert.slice(i, i + batchSize);
        
        const { data: inserted, error } = await supabase
          .from('architects')
          .insert(batch)
          .select();

        if (error) {
          console.error(`Batch error:`, error);
          errorCount += batch.length;
          toast.error(`Erro no lote: ${error.message}`);
        } else {
          successCount += batch.length;
          setProgress(prev => ({ ...prev, current: successCount, success: successCount, errors: errorCount }));
          toast.success(`${successCount} profissionais parceiros importados`);
        }
      }

      console.log(`Import complete: ${successCount} success, ${errorCount} errors`);
      
      setProgress(prev => ({ ...prev, success: successCount, errors: errorCount }));
      setStatus('success');
      
      toast.success(`Importação concluída! ${successCount} profissionais parceiros cadastrados.`);
      
      setTimeout(() => {
        navigate('/prospeccao');
      }, 3000);

    } catch (error) {
      console.error('Import error:', error);
      setStatus('error');
      toast.error('Erro ao importar profissionais parceiros');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Importação Final de Profissionais Parceiros</CardTitle>
        </CardHeader>
        <CardContent>
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Carregando planilha...</p>
            </div>
          )}

          {status === 'processing' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-lg font-medium mb-2">Importando profissionais parceiros...</p>
                <p className="text-sm text-muted-foreground">
                  {progress.current} de {progress.total}
                </p>
                <div className="mt-4 space-y-1">
                  <p className="text-sm text-green-600">✓ Importados: {progress.success}</p>
                  {progress.errors > 0 && (
                    <p className="text-sm text-red-600">✗ Erros: {progress.errors}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle className="h-16 w-16 text-green-600" />
              <div className="text-center">
                <p className="text-xl font-semibold text-green-600 mb-2">
                  Importação Concluída!
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {progress.success} arquitetos importados com sucesso
                </p>
                {progress.errors > 0 && (
                  <p className="text-sm text-amber-600">
                    {progress.errors} registros com erro
                  </p>
                )}
                <Button 
                  onClick={() => navigate('/prospeccao')}
                  className="mt-6"
                >
                  Ir para Prospecção
                </Button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <AlertCircle className="h-16 w-16 text-red-600" />
              <div className="text-center">
                <p className="text-xl font-semibold text-red-600 mb-2">
                  Erro na Importação
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Ocorreu um erro ao importar os arquitetos
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={processAndInsertAll}
                    variant="outline"
                  >
                    Tentar Novamente
                  </Button>
                  <Button 
                    onClick={() => navigate('/prospeccao')}
                  >
                    Voltar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
