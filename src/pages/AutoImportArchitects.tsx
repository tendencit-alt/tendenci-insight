import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { readExcelFromUrl } from '@/utils/excelReader';
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
      const data = await readExcelFromUrl('/data/Metropolitano_01.xlsx');
      
      console.log(`Total de registros na planilha: ${data.length}`);
      
      // Processar cada linha com validação mais robusta
      const architects = data.map((row: any, index: number) => {
        // Processar data de nascimento
        let birthday = null;
        if (row['Data de Nascimento']) {
          try {
            const dateStr = String(row['Data de Nascimento']);
            if (dateStr.includes('/')) {
              const [day, month, year] = dateStr.split('/');
              // Corrigir anos com diferentes formatos
              let fullYear = year;
              if (year.length === 2) fullYear = `19${year}`;
              if (year.length === 3) fullYear = `1${year}`;
              if (year.length === 4) fullYear = year;
              
              birthday = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            } else if (dateStr.includes('-') || dateStr.includes('T')) {
              // ISO format from Date object
              birthday = dateStr.split('T')[0];
            }
          } catch (e) {
            console.log(`Erro ao processar data na linha ${index + 1}:`, row['Data de Nascimento']);
          }
        }

        // Limpar e processar email
        let email = String(row['Email'] || '').trim();
        if (email && email.endsWith('.')) {
          // Completar domínios truncados
          if (email.includes('@gmail.')) email = email.replace('@gmail.', '@gmail.com');
          if (email.includes('@hotmail.')) email = email.replace('@hotmail.', '@hotmail.com');
          if (email.includes('@outlook.')) email = email.replace('@outlook.', '@outlook.com');
          if (email.includes('@yahoo.')) email = email.replace('@yahoo.', '@yahoo.com.br');
        }
        
        // Se email ainda estiver com ponto no final, remover
        if (email && email.endsWith('.')) {
          email = email.slice(0, -1);
        }

        // Processar telefone
        const phone = String(row['Telefone'] || '').replace(/\D/g, '');
        
        // Nome do parceiro profissional
        const name = String(row['Parceiro Profissional'] || '').trim();

        return {
          name,
          email: email || null,
          phone,
          birthday,
          categoria: 'metropolitano',
        };
      }).filter((a: any) => {
        // Filtrar apenas se tiver nome E telefone com pelo menos 8 dígitos
        const isValid = a.name && a.phone && a.phone.length >= 8;
        if (!isValid) {
          console.log('Registro inválido filtrado:', { name: a.name, phone: a.phone });
        }
        return isValid;
      });

      console.log(`Total de parceiros profissionais válidos: ${architects.length}`);
      
      setProgress({ current: 0, total: architects.length, success: 0, errors: 0 });

      let successCount = 0;
      let errorCount = 0;
      
      // Processar um por um para evitar conflitos e duplicatas
      for (let i = 0; i < architects.length; i++) {
        const arch = architects[i];
        
        try {
          // Verificar se já existe
          const { data: existing } = await supabase
            .from('architects')
            .select('id')
            .eq('phone', arch.phone)
            .maybeSingle();
          
          if (!existing) {
            const { error } = await supabase
              .from('architects')
              .insert({
                name: arch.name,
                email: arch.email,
                phone: arch.phone,
                birthday: arch.birthday,
                categoria: arch.categoria,
                status_funil: 'novo_arquiteto',
              });
            
            if (error) {
              console.error(`Erro ao inserir ${arch.name}:`, error.message);
              errorCount++;
            } else {
              successCount++;
            }
          } else {
            console.log(`Parceiro Profissional já existe: ${arch.name}`);
            errorCount++;
          }
        } catch (err: any) {
          console.error(`Erro ao processar ${arch.name}:`, err.message);
          errorCount++;
        }
        
        // Atualizar progresso a cada 10 registros
        if (i % 10 === 0 || i === architects.length - 1) {
          setProgress({
            current: i + 1,
            total: architects.length,
            success: successCount,
            errors: errorCount
          });
        }
      }
      
      setStatus('success');
      toast.success(`${successCount} parceiros profissionais cadastrados com sucesso!`);
      
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
              <h2 className="text-2xl font-bold">Importando Parceiros Profissionais</h2>
              
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
