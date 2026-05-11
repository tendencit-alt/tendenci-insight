import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { readExcelFromUrl } from '@/utils/excelReader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function BulkImportFinal() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [result, setResult] = useState<{ total: number; inserted: number; skipped: number } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    processAndInsertAll();
  }, []);

  const processAndInsertAll = async () => {
    try {
      console.log('Iniciando importação massiva...');
      
      // Carregar a planilha
      const data = await readExcelFromUrl('/data/Metropolitano_01.xlsx');
      
      console.log(`Total de registros na planilha: ${data.length}`);
      
      // Processar todos os registros
      const architects = data.map((row: any) => {
        // Determinar o nome (prioridade: Nome do Profissional > Empresa)
        let name = '';
        if (row['Nome do Profissional'] && row['Nome do Profissional'] !== '—' && row['Nome do Profissional'] !== '') {
          name = String(row['Nome do Profissional']).trim();
        } else if (row['Empresa'] && row['Empresa'] !== '—' && row['Empresa'] !== '') {
          name = String(row['Empresa']).trim();
        }

        // Limpar telefone
        const phone = String(row['Telefone'] || '').replace(/\D/g, '');
        
        // Limpar email
        let email = String(row['E-mail'] || '').trim();
        if (email === '—') email = '';
        
        // Empresa
        let company = String(row['Empresa'] || '').trim();
        if (company === '—') company = '';

        return {
          name,
          company,
          email: email || null,
          phone,
          categoria: 'metropolitano',
          status_funil: 'novo_arquiteto',
        };
      }).filter((a: any) => {
        // Filtrar apenas se tiver nome E telefone válido
        return a.name && a.phone && a.phone.length >= 8;
      });

      console.log(`Total de profissionais parceiros válidos para inserir: ${architects.length}`);
      
      // Buscar telefones já existentes para evitar duplicatas
      const { data: existingArchitects } = await supabase
        .from('architects')
        .select('phone')
        .in('phone', architects.map((a: any) => a.phone));
      
      const existingPhones = new Set(existingArchitects?.map(a => a.phone) || []);
      console.log(`Telefones já existentes no banco: ${existingPhones.size}`);
      
      // Filtrar profissionais parceiros que ainda não existem
      const newArchitects = architects.filter((a: any) => !existingPhones.has(a.phone));
      console.log(`Novos profissionais parceiros a inserir: ${newArchitects.length}`);
      
      if (newArchitects.length === 0) {
        console.log('Todos os profissionais parceiros já existem no banco!');
        setResult({
          total: architects.length,
          inserted: 0,
          skipped: architects.length
        });
        setStatus('success');
        toast.success('Todos os profissionais parceiros já existem no banco!');
        setTimeout(() => navigate('/prospeccao'), 2000);
        return;
      }

      // Inserir TODOS de uma vez (Supabase aceita até 1000 registros por vez)
      const batchSize = 500;
      let totalInserted = 0;
      
      for (let i = 0; i < newArchitects.length; i += batchSize) {
        const batch = newArchitects.slice(i, i + batchSize);
        console.log(`Inserindo lote ${Math.floor(i / batchSize) + 1}: ${batch.length} registros`);
        
        const { error } = await supabase
          .from('architects')
          .insert(batch);
        
        if (error) {
          console.error('Erro ao inserir lote:', error);
          throw error;
        }
        
        totalInserted += batch.length;
        console.log(`Total inserido até agora: ${totalInserted}`);
      }
      
      setResult({
        total: architects.length,
        inserted: totalInserted,
        skipped: architects.length - totalInserted
      });
      
      setStatus('success');
      toast.success(`${totalInserted} profissionais parceiros importados com sucesso!`);
      
      console.log('Importação concluída!');
      setTimeout(() => navigate('/prospeccao'), 3000);
      
    } catch (error) {
      console.error('Erro na importação:', error);
      setStatus('error');
      toast.error('Erro ao importar profissionais parceiros');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-6 space-y-4">
        {status === 'loading' && (
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h2 className="text-xl font-semibold">Processando importação massiva...</h2>
            <p className="text-sm text-muted-foreground">
              Inserindo todos os profissionais parceiros do arquivo Metropolitano_01.xlsx
            </p>
          </div>
        )}

        {status === 'success' && result && (
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <h2 className="text-xl font-semibold text-green-600">Importação Concluída!</h2>
            <div className="space-y-2 text-sm">
              <p><strong>Total na planilha:</strong> {result.total}</p>
              <p className="text-green-600"><strong>Novos inseridos:</strong> {result.inserted}</p>
              <p className="text-gray-500"><strong>Já existiam:</strong> {result.skipped}</p>
            </div>
            <Button onClick={() => navigate('/prospeccao')} className="w-full">
              Ir para Prospecção
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500" />
            <h2 className="text-xl font-semibold text-red-600">Erro na Importação</h2>
            <p className="text-sm text-muted-foreground">
              Ocorreu um erro ao importar os arquitetos. Verifique os logs do console.
            </p>
            <Button onClick={() => processAndInsertAll()} variant="outline" className="w-full">
              Tentar Novamente
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
