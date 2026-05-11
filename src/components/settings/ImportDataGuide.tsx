import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Table } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const ImportDataGuide = () => {
  const downloadTemplate = (type: 'clients' | 'leads' | 'deals') => {
    let csvContent = '';
    let filename = '';

    if (type === 'clients') {
      csvContent = `nome,telefone,email,cidade,estado,observacoes
João Silva,11987654321,joao@email.com,São Paulo,SP,Cliente importante
Maria Santos,21987654321,maria@email.com,Rio de Janeiro,RJ,Indicação de parceiro profissional`;
      filename = 'template_clientes.csv';
    } else if (type === 'leads') {
      csvContent = `nome_cliente,telefone,email,origem,temperatura,status,cidade,estado
Pedro Costa,11912345678,pedro@email.com,Instagram,quente,novo,Campinas,SP
Ana Paula,21912345678,ana@email.com,WhatsApp,morno,em_contato,Niterói,RJ`;
      filename = 'template_leads.csv';
    } else {
      csvContent = `titulo_negocio,nome_cliente,telefone,email,valor,tipo_produto,temperatura,origem,observacoes,historico_whatsapp
Projeto Cozinha Planejada,Carlos Souza,11923456789,carlos@email.com,15000,Planejado,quente,Site,Cliente pediu orçamento urgente,Primeira conversa em 10/11
Projeto Móvel Sala,Juliana Lima,21923456789,juliana@email.com,8000,Móvel,morno,Indicação,Aguardando retorno,Enviou fotos por WhatsApp`;
      filename = 'template_negocios.csv';
    }

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Table className="w-6 h-6" />
          Importação de Dados
        </h2>
        <p className="text-muted-foreground">
          Baixe os templates e preencha com seus dados para migração de CRM
        </p>
      </div>

      <Tabs defaultValue="clients" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="deals">Negócios CRM</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Template: Clientes</h3>
              <Button onClick={() => downloadTemplate('clients')} className="gap-2">
                <Download className="w-4 h-4" />
                Baixar CSV
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Use este template para importar sua base de clientes
              </p>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="font-medium text-sm">Campos obrigatórios:</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li><strong>nome</strong> - Nome completo do cliente</li>
                  <li><strong>telefone</strong> - Apenas números (ex: 11987654321)</li>
                </ul>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="font-medium text-sm">Campos opcionais:</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li><strong>email</strong> - E-mail do cliente</li>
                  <li><strong>cidade</strong> - Cidade</li>
                  <li><strong>estado</strong> - UF (ex: SP, RJ)</li>
                  <li><strong>observacoes</strong> - Notas sobre o cliente</li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  💡 Dica: Salve sua planilha como CSV (separado por vírgulas) no Excel ou Google Sheets
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Template: Leads</h3>
              <Button onClick={() => downloadTemplate('leads')} className="gap-2">
                <Download className="w-4 h-4" />
                Baixar CSV
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Use este template para importar leads do seu CRM anterior
              </p>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="font-medium text-sm">Campos obrigatórios:</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li><strong>nome_cliente</strong> - Nome completo</li>
                  <li><strong>telefone</strong> - Apenas números (ex: 11912345678)</li>
                </ul>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="font-medium text-sm">Campos opcionais:</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li><strong>email</strong> - E-mail do lead</li>
                  <li><strong>origem</strong> - Instagram, WhatsApp, Site, Indicação, Outros</li>
                  <li><strong>temperatura</strong> - frio, morno, quente (padrão: frio)</li>
                  <li><strong>status</strong> - novo, em_contato, qualificado, perdido (padrão: novo)</li>
                  <li><strong>cidade</strong> / <strong>estado</strong> - Localização</li>
                </ul>
              </div>

              <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                  ⚠️ Importante: O sistema criará automaticamente os clientes se não existirem
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="deals" className="space-y-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Template: Negócios CRM</h3>
              <Button onClick={() => downloadTemplate('deals')} className="gap-2">
                <Download className="w-4 h-4" />
                Baixar CSV
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Use este template para importar negócios do CRM Clientes
              </p>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="font-medium text-sm">Campos obrigatórios:</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li><strong>titulo_negocio</strong> - Título do negócio/projeto</li>
                  <li><strong>nome_cliente</strong> - Nome do cliente</li>
                  <li><strong>telefone</strong> - Apenas números</li>
                </ul>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="font-medium text-sm">Campos opcionais:</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li><strong>email</strong> - E-mail do cliente</li>
                  <li><strong>valor</strong> - Valor do negócio (ex: 15000.00)</li>
                  <li><strong>tipo_produto</strong> - Planejado ou Móvel</li>
                  <li><strong>temperatura</strong> - frio, morno, quente</li>
                  <li><strong>origem</strong> - Instagram, WhatsApp, Site, Indicação, Outros</li>
                  <li><strong>observacoes</strong> - Notas sobre o negócio</li>
                  <li><strong>historico_whatsapp</strong> - Histórico de conversas</li>
                </ul>
              </div>

              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  ✅ Os negócios serão criados automaticamente no funil padrão, na primeira etapa
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="p-6 space-y-4 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <h3 className="text-lg font-semibold">📋 Instruções de Importação</h3>
        <ol className="text-sm space-y-2 list-decimal list-inside">
          <li>Baixe o template correspondente ao tipo de dado que deseja importar</li>
          <li>Abra o arquivo CSV no Excel ou Google Sheets</li>
          <li>Preencha suas informações seguindo o formato do exemplo</li>
          <li>Salve como CSV (separado por vírgulas)</li>
          <li>Entre em contato com o suporte para realizar a importação em lote</li>
        </ol>
        
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            <strong>Suporte:</strong> Envie o arquivo CSV preenchido para o suporte técnico que faremos a importação para você. Caso precise de ajuda, estamos à disposição!
          </p>
        </div>
      </Card>
    </div>
  );
};
