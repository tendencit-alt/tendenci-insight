import { HelpCircle, AlertTriangle, CheckCircle2, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface HelpEntry {
  question: string;
  answer: string;
}

interface CommonError {
  error: string;
  fix: string;
}

interface ContextualHelpProps {
  screenKey: string;
  title?: string;
  description?: string;
  commonErrors?: CommonError[];
  howToFix?: string[];
  whenToOpenSupport?: string;
  faq?: HelpEntry[];
}

const HELP_DATA: Record<string, ContextualHelpProps> = {
  pedidos: {
    screenKey: 'pedidos',
    title: 'Pedidos',
    description: 'Gerencie pedidos de venda, acompanhe status e vincule a clientes e orçamentos.',
    commonErrors: [
      { error: 'Pedido sem cliente vinculado', fix: 'Selecione um cliente antes de salvar o pedido.' },
      { error: 'Valor total zerado', fix: 'Adicione pelo menos um produto ao pedido.' },
      { error: 'Status não avança', fix: 'Verifique se todas as aprovações necessárias foram concluídas.' },
    ],
    howToFix: ['Verifique os campos obrigatórios', 'Confirme que o cliente possui cadastro completo', 'Revise as condições de pagamento'],
    whenToOpenSupport: 'Quando um pedido estiver travado em status intermediário por mais de 24h sem motivo aparente.',
    faq: [
      { question: 'Como duplicar um pedido?', answer: 'Use o botão de ações no pedido e selecione "Duplicar".' },
      { question: 'Como cancelar um pedido aprovado?', answer: 'Apenas gestores ou admins podem cancelar pedidos já aprovados.' },
    ],
  },
  financeiro: {
    screenKey: 'financeiro',
    title: 'Financeiro',
    description: 'Controle lançamentos, contas a pagar/receber e conciliação bancária.',
    commonErrors: [
      { error: 'Lançamento sem categoria DRE', fix: 'Selecione uma categoria antes de salvar.' },
      { error: 'Lançamento sem centro de custo', fix: 'Defina o centro de custo no formulário.' },
      { error: 'Saldo não confere', fix: 'Execute a conciliação bancária para identificar divergências.' },
    ],
    howToFix: ['Revise categorias e centros de custo', 'Importe OFX atualizado', 'Reconcilie pendências'],
    whenToOpenSupport: 'Quando a conciliação apresentar divergências que não consegue resolver manualmente.',
    faq: [
      { question: 'Como importar extrato OFX?', answer: 'Acesse Conciliação > Importar OFX e selecione o arquivo do banco.' },
      { question: 'Como estornar um lançamento?', answer: 'Crie um lançamento inverso com referência ao original.' },
    ],
  },
  conciliacao: {
    screenKey: 'conciliacao',
    title: 'Conciliação Bancária',
    description: 'Compare extratos bancários com lançamentos do sistema para garantir integridade.',
    commonErrors: [
      { error: 'OFX não importa', fix: 'Verifique se o formato do arquivo é OFX 1.x ou 2.x.' },
      { error: 'Transações duplicadas', fix: 'O sistema usa FITID para evitar duplicatas. Verifique o extrato.' },
    ],
    whenToOpenSupport: 'Quando o arquivo OFX é rejeitado repetidamente.',
    faq: [
      { question: 'Qual formato de arquivo aceito?', answer: 'Arquivos OFX (Open Financial Exchange) dos principais bancos.' },
    ],
  },
  dre: {
    screenKey: 'dre',
    title: 'DRE - Demonstração de Resultado',
    description: 'Visualize a DRE mensal/anual com classificação automática de receitas e despesas.',
    commonErrors: [
      { error: 'Valores zerados na DRE', fix: 'Verifique se os lançamentos possuem categoria DRE correta.' },
      { error: 'DRE desatualizada', fix: 'Recalcule a DRE após novos lançamentos financeiros.' },
    ],
    whenToOpenSupport: 'Quando categorias DRE não aparecem mesmo após configuração.',
    faq: [
      { question: 'Como alterar categorias DRE?', answer: 'Apenas admins e owners podem editar o plano de contas.' },
    ],
  },
  forecast: {
    screenKey: 'forecast',
    title: 'Forecast & Projeções',
    description: 'Projeções automáticas de resultado e fluxo de caixa baseadas em dados reais.',
    commonErrors: [
      { error: 'Forecast não calcula', fix: 'Certifique-se de ter pelo menos 3 meses de dados históricos.' },
    ],
    whenToOpenSupport: 'Quando as projeções parecem muito distantes da realidade operacional.',
    faq: [
      { question: 'Qual a base do cálculo?', answer: 'O forecast usa dados reais de lançamentos, metas e tendências históricas.' },
    ],
  },
  metas: {
    screenKey: 'metas',
    title: 'Metas',
    description: 'Defina e acompanhe metas financeiras e operacionais por período.',
    commonErrors: [
      { error: 'Meta sem período definido', fix: 'Selecione mês/ano ao criar a meta.' },
    ],
    whenToOpenSupport: 'Quando metas não refletem nos dashboards após configuração.',
    faq: [
      { question: 'Como definir metas por vendedor?', answer: 'Acesse Metas > Novo e selecione o vendedor responsável.' },
    ],
  },
};

export function ContextualHelpButton({ screenKey }: { screenKey: string }) {
  const help = HELP_DATA[screenKey];
  if (!help) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Ajuda">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            {help.title}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-4">
          <div>
            <p className="text-sm text-muted-foreground">{help.description}</p>
          </div>

          {help.commonErrors && help.commonErrors.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Erros Comuns
              </h4>
              <div className="space-y-2">
                {help.commonErrors.map((err, i) => (
                  <div key={i} className="p-3 rounded-lg border bg-muted/30 text-sm">
                    <p className="font-medium text-destructive">{err.error}</p>
                    <p className="text-muted-foreground mt-1">
                      <CheckCircle2 className="h-3 w-3 inline mr-1 text-green-500" />
                      {err.fix}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {help.howToFix && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Como Corrigir</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {help.howToFix.map((fix, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span> {fix}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {help.whenToOpenSupport && (
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-1">
                <Headphones className="h-4 w-4 text-primary" />
                Quando Abrir Suporte
              </h4>
              <p className="text-sm text-muted-foreground">{help.whenToOpenSupport}</p>
            </div>
          )}

          {help.faq && help.faq.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">FAQ</h4>
              <Accordion type="single" collapsible>
                {help.faq.map((item, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-sm">{item.question}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { HELP_DATA };
