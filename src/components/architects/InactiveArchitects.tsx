import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Clock, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

interface InactiveArchitect {
  id: string;
  name: string;
  last_project_at: string | null;
  days_since_last: number;
  contact_count: number;
  phone: string;
  email: string;
}

interface InactiveArchitectsProps {
  refreshKey: number;
}

export function InactiveArchitects({ refreshKey }: InactiveArchitectsProps) {
  const [inactive, setInactive] = useState<InactiveArchitect[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchInactive();
  }, [refreshKey]);

  const fetchInactive = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('architect_inactivity', { days_threshold: 60 });
    
    if (!error && data) {
      setInactive(data as InactiveArchitect[]);
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

  if (inactive.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Clock className="w-12 h-12 text-green-600 mx-auto mb-3" />
        <p className="text-muted-foreground">Ninguém parado por enquanto 👏</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">🕒 Parceiros Profissionais Inativos + de 60 Dias que já enviaram projetos</h3>
              <p className="text-sm text-muted-foreground">
                {inactive.length} parceiros profissionais precisam de atenção
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
          {inactive.map((arch) => (
            <Card
              key={arch.id}
              className="p-4 hover:shadow-lg transition-all border-l-4 border-l-orange-500"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-base">{arch.name}</h4>
                  <div className="text-sm text-muted-foreground space-y-1 mt-1">
                    <p>Último projeto: <span className="font-medium">
                      {arch.last_project_at 
                        ? format(new Date(arch.last_project_at), "dd/MM/yyyy", { locale: ptBR })
                        : 'Nunca'}
                    </span></p>
                    <p>Total de contatos: <span className="font-medium">{arch.contact_count}</span></p>
                  </div>
                </div>
                
                <div className="text-right">
                  <Badge variant="outline" className="bg-orange-50 border-orange-500 text-orange-700">
                    {arch.days_since_last >= 999 ? 'Nunca' : `${arch.days_since_last} dias`}
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
