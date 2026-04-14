import { useState } from 'react';
import { useFaqItems, KNOWLEDGE_CATEGORIES, CATEGORY_LABELS } from '@/hooks/useKnowledgeData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, HelpCircle } from 'lucide-react';

const sourceLabels: Record<string, string> = { manual: 'Manual', ticket: 'Ticket', error: 'Erro', usage: 'Uso' };

export function KnowledgeFaqTab() {
  const [filterCat, setFilterCat] = useState('');
  const { data: items, isLoading } = useFaqItems(filterCat || undefined);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">FAQ Dinâmico</h2>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todas categorias" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
            {KNOWLEDGE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {!items?.length ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma FAQ cadastrada</CardContent></Card>
      ) : (
        <Card><CardContent className="p-4">
          <Accordion type="single" collapsible>
            {items.map((item: any) => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2 text-left">
                    <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                    <span>{item.question}</span>
                    <Badge variant="outline" className="ml-auto shrink-0 text-[10px]">{CATEGORY_LABELS[item.category] || item.category}</Badge>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">{sourceLabels[item.source_type] || item.source_type}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pl-6">
                  {item.answer}
                  {item.frequency > 0 && <p className="text-xs mt-2 text-muted-foreground/60">Frequência: {item.frequency}x</p>}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent></Card>
      )}
    </div>
  );
}
