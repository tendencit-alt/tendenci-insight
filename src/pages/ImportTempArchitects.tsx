import { useEffect, useState } from 'react';
import { bulkInsertArchitects } from '@/utils/bulkInsertArchitects';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function ImportTempArchitects() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const navigate = useNavigate();

  const handleImport = async () => {
    setLoading(true);
    try {
      const res = await bulkInsertArchitects();
      setResult(res);
      toast.success(`${res.successCount} parceiros profissionais cadastrados com sucesso!`);
      
      // Redirecionar após 3 segundos
      setTimeout(() => {
        navigate('/prospeccao');
      }, 3000);
    } catch (error: any) {
      toast.error('Erro ao importar parceiros profissionais: ' + error.message);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Importação de Parceiros Profissionais</h1>
        
        {!result && (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Clique no botão abaixo para importar todos os parceiros profissionais da planilha.
            </p>
            
            <Button
              onClick={handleImport}
              disabled={loading}
              size="lg"
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Importando...' : 'Iniciar Importação'}
            </Button>
          </div>
        )}
        
        {result && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-green-600">
              Importação Concluída!
            </h2>
            
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p>Total processado: {result.total}</p>
              <p className="text-green-600">Sucesso: {result.successCount}</p>
              {result.errorCount > 0 && (
                <p className="text-red-600">Erros: {result.errorCount}</p>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground">
              Redirecionando para Prospecção em 3 segundos...
            </p>
            
            <Button
              onClick={() => navigate('/prospeccao')}
              className="w-full"
            >
              Ir para Prospecção Agora
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
