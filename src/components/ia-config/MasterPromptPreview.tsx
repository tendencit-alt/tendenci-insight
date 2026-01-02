import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Copy, Eye, Loader2, Check, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MasterPromptData {
  prompt: string;
  version: number;
  updated_at: string;
  sections: {
    identidade: boolean;
    negocio: boolean;
    comunicacao: boolean;
    qualificacao: boolean;
    vendas: boolean;
    produtos: number;
    conhecimento: number;
    comportamento: boolean;
    regras: boolean;
  };
}

export default function MasterPromptPreview() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MasterPromptData | null>(null);
  const [copied, setCopied] = useState(false);

  const loadPrompt = async () => {
    setLoading(true);
    try {
      const { data: responseData, error } = await supabase.functions.invoke('generate-master-prompt');

      if (error) throw error;

      if (responseData?.success) {
        setData(responseData);
      } else {
        throw new Error(responseData?.error || 'Erro ao gerar prompt');
      }
    } catch (error) {
      console.error('Error loading prompt:', error);
      toast.error('Erro ao carregar prompt master');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !data) {
      loadPrompt();
    }
  };

  const copyPrompt = async () => {
    if (!data?.prompt) return;
    
    try {
      await navigator.clipboard.writeText(data.prompt);
      setCopied(true);
      toast.success('Prompt copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Prompt Master
        </CardTitle>
        <CardDescription>
          Visualize e copie o prompt completo gerado a partir de todas as configurações
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={handleOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Eye className="h-4 w-4" />
              Ver Prompt Master
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Prompt Master Gerado</span>
                {data && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">v{data.version}</Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={loadPrompt}
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                )}
              </DialogTitle>
            </DialogHeader>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : data ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {data.sections.identidade && <Badge>Identidade ✓</Badge>}
                  {data.sections.negocio && <Badge>Negócio ✓</Badge>}
                  {data.sections.comunicacao && <Badge>Comunicação ✓</Badge>}
                  {data.sections.qualificacao && <Badge>Qualificação ✓</Badge>}
                  {data.sections.vendas && <Badge>Vendas ✓</Badge>}
                  {data.sections.produtos > 0 && <Badge>Produtos ({data.sections.produtos})</Badge>}
                  {data.sections.conhecimento > 0 && <Badge>Conhecimento ({data.sections.conhecimento})</Badge>}
                  {data.sections.comportamento && <Badge>Comportamento ✓</Badge>}
                  {data.sections.regras && <Badge>Regras ✓</Badge>}
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={copyPrompt} className="gap-2">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copiado!' : 'Copiar Prompt'}
                  </Button>
                </div>
                
                <ScrollArea className="h-[400px] rounded-md border p-4">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {data.prompt}
                  </pre>
                </ScrollArea>
                
                <p className="text-xs text-muted-foreground">
                  Última atualização: {new Date(data.updated_at).toLocaleString('pt-BR')}
                </p>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum dado carregado
              </p>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
