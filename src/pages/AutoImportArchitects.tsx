import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AutoImportArchitects() {
  const [status, setStatus] = useState<'loading' | 'processing' | 'success' | 'error'>('loading');
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, errors: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    processFile();
  }, []);

  const processFile = async () => {
    try {
      setStatus('processing');
      
      // Carregar a planilha
      const response = await fetch('/data/aniversariantes.xlsx');
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: any[] = XLSX.utils.sheet_to_json(firstSheet);
      
      console.log(`Total de registros na planilha: ${data.length}`);
      
      // Processar cada linha
      const architects = data.map((row) => {
        // Processar data de nascimento
        let birthday = null;
        if (row['Data de Nascimento']) {
          try {
            const dateStr = String(row['Data de Nascimento']);
            if (dateStr.includes('/')) {
              const [day, month, year] = dateStr.split('/');
              // Corrigir anos com 3 dígitos (0995 -> 1995)
              const fullYear = year.length === 4 ? year : (year.length === 3 ? `1${year}` : `19${year}`);
              birthday = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          } catch (e) {
            console.log('Erro ao processar data:', row['Data de Nascimento']);
          }
        }

        // Limpar email (remover truncamentos)
        let email = String(row['Email'] || '').trim();
        if (email.endsWith('.')) {
          // Email truncado, tentar completar domínios comuns
          if (email.includes('@gmail.')) email = email.replace('@gmail.', '@gmail.com');
          if (email.includes('@hotmail.')) email = email.replace('@hotmail.', '@hotmail.com');
          if (email.includes('@outlook.')) email = email.replace('@outlook.', '@outlook.com');
          if (email.includes('@yahoo.')) email = email.replace('@yahoo.', '@yahoo.com.br');
        }

        return {
          name: String(row['Arquiteto'] || '').trim(),
          email: email,
          phone: String(row['Telefone'] || '').replace(/\D/g, ''),
          birthday,
          categoria: 'metropolitano',
        };
      }).filter(a => a.name && a.phone && a.phone.length >= 8);

      console.log(`Total de arquitetos válidos: ${architects.length}`);
      
      setProgress({ current: 0, total: architects.length, success: 0, errors: 0 });

      // Inserir em lotes de 50
      const batchSize = 50;
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < architects.length; i += batchSize) {
        const batch = architects.slice(i, i + batchSize);
        
        try {
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
            )
            .select();
          
          if (error) {
            console.error(`Erro no lote ${Math.floor(i / batchSize) + 1}:`, error);
            errorCount += batch.length;
          } else {
            successCount += (data?.length || batch.length);
          }
        } catch (err) {
          console.error('Erro ao inserir lote:', err);
          errorCount += batch.length;
        }
        
        setProgress({
          current: Math.min(i + batchSize, architects.length),
          total: architects.length,
          success: successCount,
          errors: errorCount
        });
        
        // Pequeno delay entre lotes
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setStatus('success');
      toast.success(`${successCount} arquitetos cadastrados com sucesso!`);
      
      // Redirecionar após 3 segundos
      setTimeout(() => {
        navigate('/prospeccao');
      }, 3000);
      
    } catch (error: any) {
      console.error('Erro ao processar arquivo:', error);
      setStatus('error');
      toast.error('Erro ao processar arquivo: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="p-8 max-w-2xl w-full">
        <div className="text-center space-y-6">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <h2 className="text-2xl font-bold">Carregando planilha...</h2>
            </>
          )}
          
          {status === 'processing' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <h2 className="text-2xl font-bold">Importando Arquitetos</h2>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                  <p className="text-green-600 dark:text-green-400 font-semibold">Sucesso</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{progress.success}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 font-semibold">Erros</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">{progress.errors}</p>
                </div>
              </div>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold text-green-600">Importação Concluída!</h2>
              
              <div className="bg-muted p-6 rounded-lg space-y-2">
                <p className="text-lg">Total processado: <strong>{progress.total}</strong></p>
                <p className="text-lg text-green-600">Cadastrados: <strong>{progress.success}</strong></p>
                {progress.errors > 0 && (
                  <p className="text-lg text-red-600">Erros: <strong>{progress.errors}</strong></p>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground">
                Redirecionando para Prospecção em 3 segundos...
              </p>
              
              <Button onClick={() => navigate('/prospeccao')} size="lg" className="w-full">
                Ir para Prospecção Agora
              </Button>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto" />
              <h2 className="text-2xl font-bold text-red-600">Erro na Importação</h2>
              
              <p className="text-muted-foreground">
                Ocorreu um erro ao processar a planilha. Tente novamente.
              </p>
              
              <div className="flex gap-4">
                <Button onClick={processFile} variant="default" className="flex-1">
                  Tentar Novamente
                </Button>
                <Button onClick={() => navigate('/prospeccao')} variant="outline" className="flex-1">
                  Voltar
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
