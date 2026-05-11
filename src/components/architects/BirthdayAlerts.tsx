import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Cake, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

interface Birthday {
  id: string;
  name: string;
  birthday: string;
  city: string;
  tier: string;
  days_remaining: number;
  phone: string;
  email: string;
}

interface BirthdayAlertsProps {
  refreshKey: number;
}

export function BirthdayAlerts({ refreshKey }: BirthdayAlertsProps) {
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchBirthdays();
  }, [refreshKey]);

  const fetchBirthdays = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('architect_birthdays_upcoming');
    
    if (!error && data) {
      setBirthdays(data as Birthday[]);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-8 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  if (birthdays.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Cake className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Sem aniversários nos próximos 30 dias</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Cake className="w-6 h-6 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">🎂 Aniversariantes do Mês</h3>
              <p className="text-sm text-muted-foreground">
                {birthdays.length} parceiros profissionais aniversariantes
              </p>
            </div>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0">
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              <span className="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="space-y-3">
          {birthdays.map((birthday) => (
            <Card
              key={birthday.id}
              className="p-4 hover:shadow-lg transition-all border-l-4 border-l-pink-500"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-base">{birthday.name}</h4>
                  <div className="text-sm text-muted-foreground space-y-1 mt-1">
                    <p>Aniversário: <span className="font-medium">
                      {format(new Date(birthday.birthday + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                    </span></p>
                    <p>Cidade: <span className="font-medium">{birthday.city || 'Não informado'}</span></p>
                    <div className="flex items-center gap-2">
                      <span>Tier:</span>
                      <Badge variant="outline">{birthday.tier}</Badge>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <Badge className="bg-pink-500 hover:bg-pink-600">
                    {birthday.days_remaining === 0 ? 'Hoje!' : `${birthday.days_remaining} dias`}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
