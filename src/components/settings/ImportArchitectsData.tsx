import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { useAuth } from "@/contexts/AuthContext";

export const ImportArchitectsData = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ success: number; errors: number; total: number } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const cleanPhone = (phone: string | undefined): string | null => {
    if (!phone || phone === "—") return null;
    return phone.replace(/\D/g, "");
  };

  const cleanEmail = (email: string | undefined): string | null => {
    if (!email || email === "—") return null;
    return email.trim();
  };

  const cleanText = (text: string | undefined): string | null => {
    if (!text || text === "—") return null;
    return text.trim();
  };

  const processExcelFile = async (file: File) => {
    setIsProcessing(true);
    setResults(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      console.log("Dados extraídos da planilha:", jsonData.length, "linhas");

      let successCount = 0;
      let errorCount = 0;

      // Processar em lotes de 10 para evitar sobrecarga
      const batchSize = 10;
      for (let i = 0; i < jsonData.length; i += batchSize) {
        const batch = jsonData.slice(i, i + batchSize);
        
        const promises = batch.map(async (row) => {
          try {
            // Determinar o nome: usar "Nome do Profissional" se disponível, senão usar "Empresa"
            const name = cleanText(row["Nome do Profissional"]) || cleanText(row["Empresa"]);
            
            if (!name) {
              console.warn("Linha ignorada - sem nome válido:", row);
              return { success: false };
            }

            const phone = cleanPhone(row["Telefone"]);
            const email = cleanEmail(row["E-mail"]);
            const company = cleanText(row["Empresa"]);
            const categoria = cleanText(row["Categoria"]) || "metropolitano";

            // Verificar se já existe (por telefone ou email)
            let existingArchitect = null;
            if (phone || email) {
              const { data: existing } = await supabase
                .from("architects")
                .select("id")
                .or(phone ? `phone.eq.${phone}` : email ? `email.eq.${email}` : "id.is.null")
                .limit(1)
                .single();
              
              existingArchitect = existing;
            }

            if (existingArchitect) {
              console.log(`Arquiteto já existe: ${name}`);
              return { success: true, skipped: true };
            }

            // Inserir novo arquiteto
            const { error: insertError } = await supabase
              .from("architects")
              .insert({
                name,
                company: company !== name ? company : null,
                phone,
                email,
                categoria: categoria.toLowerCase(),
                created_by: user?.id,
                status_funil: "novo_arquiteto",
              });

            if (insertError) {
              console.error("Erro ao inserir arquiteto:", name, insertError);
              return { success: false };
            }

            return { success: true };
          } catch (error) {
            console.error("Erro ao processar linha:", error);
            return { success: false };
          }
        });

        const batchResults = await Promise.all(promises);
        batchResults.forEach((result) => {
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        });

        // Delay entre lotes para não sobrecarregar
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      setResults({
        success: successCount,
        errors: errorCount,
        total: jsonData.length,
      });

      toast({
        title: "Importação concluída!",
        description: `${successCount} arquitetos importados, ${errorCount} erros.`,
      });
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast({
        title: "Erro na importação",
        description: "Não foi possível processar o arquivo Excel.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processExcelFile(file);
    }
  };

  const processDefaultFile = async () => {
    try {
      const response = await fetch("/data/Metropolitano_01.xlsx");
      const blob = await response.blob();
      const file = new File([blob], "Metropolitano_01.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      processExcelFile(file);
    } catch (error) {
      console.error("Erro ao carregar arquivo padrão:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o arquivo de importação.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Upload className="w-6 h-6" />
          Importação de Arquitetos
        </h2>
        <p className="text-muted-foreground">
          Importe arquitetos em massa a partir de planilhas Excel
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex flex-col gap-4">
            <Button
              onClick={processDefaultFile}
              disabled={isProcessing}
              className="gap-2"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Importar Planilha Metropolitano
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Ou</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <label htmlFor="file-upload" className="w-full">
                <Button
                  variant="outline"
                  disabled={isProcessing}
                  className="gap-2 w-full"
                  size="lg"
                  asChild
                >
                  <span>
                    <Upload className="w-4 h-4" />
                    Escolher Outro Arquivo Excel
                  </span>
                </Button>
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground">
                Formatos suportados: .xlsx, .xls
              </p>
            </div>
          </div>

          {results && (
            <div className="mt-6 p-4 rounded-lg bg-muted space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Resultados da Importação
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total de registros:</span>
                  <span className="font-medium">{results.total}</span>
                </div>
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Importados com sucesso:</span>
                  <span className="font-medium">{results.success}</span>
                </div>
                {results.errors > 0 && (
                  <div className="flex justify-between text-red-600 dark:text-red-400">
                    <span>Erros/Duplicados:</span>
                    <span className="font-medium">{results.errors}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-muted p-4 rounded-lg space-y-2">
          <p className="font-medium text-sm">Formato esperado da planilha:</p>
          <ul className="text-sm space-y-1 list-disc list-inside">
            <li><strong>Empresa</strong> - Nome da empresa (opcional)</li>
            <li><strong>Nome do Profissional</strong> - Nome do arquiteto (obrigatório)</li>
            <li><strong>Telefone</strong> - Telefone com DDD</li>
            <li><strong>E-mail</strong> - E-mail de contato</li>
            <li><strong>Categoria</strong> - Categoria do arquiteto</li>
          </ul>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Importante:
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Arquitetos duplicados (mesmo telefone ou e-mail) serão automaticamente ignorados durante a importação.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
