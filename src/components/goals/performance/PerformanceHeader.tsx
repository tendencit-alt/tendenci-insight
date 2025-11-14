import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PerformanceHeaderProps {
  sellerInfo: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    role: string;
  };
  goalInfo: {
    id: string;
    valor_meta: number;
    data_inicio: string;
    data_fim: string;
    descricao?: string;
    status: string;
    tipo_meta: string;
    valor_vendido: number;
    percentual: number;
  };
  kpis: {
    vendas_totais: number;
    ticket_medio: number;
    negocios_ganhos: number;
    negocios_perdidos: number;
    conversao_percentual: number;
  };
}

export function PerformanceHeader({ sellerInfo, goalInfo, kpis }: PerformanceHeaderProps) {
  const firstName = sellerInfo.full_name?.split(" ")[0] || sellerInfo.email;
  const periodo = `${format(new Date(goalInfo.data_inicio), "dd/MM/yyyy", { locale: ptBR })} - ${format(new Date(goalInfo.data_fim), "dd/MM/yyyy", { locale: ptBR })}`;
  const mesReferencia = format(new Date(goalInfo.data_inicio), "MMMM 'de' yyyy", { locale: ptBR });
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativa': return 'bg-green-500';
      case 'concluída': return 'bg-blue-500';
      case 'atrasada': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const percentualAtingido = goalInfo.percentual;
  const isAboveGoal = percentualAtingido >= 100;

  return (
    <Card className="bg-gradient-to-r from-primary to-primary-dark text-primary-foreground shadow-lg">
      <div className="p-8">
        <div className="flex items-start gap-6">
          <Avatar className="h-24 w-24 border-4 border-primary-foreground/20">
            <AvatarImage src={sellerInfo.avatar_url} alt={sellerInfo.full_name} />
            <AvatarFallback className="text-3xl bg-primary-light">
              {firstName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{sellerInfo.full_name}</h1>
              <Badge variant="secondary" className="capitalize">
                {sellerInfo.role === 'admin' ? 'Master' : 'Vendedor'}
              </Badge>
              <Badge className={getStatusColor(goalInfo.status)}>
                {goalInfo.status}
              </Badge>
            </div>
            
            <p className="text-primary-foreground/80 capitalize mb-4">
              {mesReferencia} • {periodo}
            </p>

            {goalInfo.descricao && (
              <p className="text-primary-foreground/90 mb-4">{goalInfo.descricao}</p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
              <div>
                <p className="text-primary-foreground/70 text-sm mb-1">Meta</p>
                <p className="text-2xl font-bold">{formatCurrency(goalInfo.valor_meta)}</p>
              </div>
              
              <div>
                <p className="text-primary-foreground/70 text-sm mb-1">Valor Vendido</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{formatCurrency(kpis.vendas_totais)}</p>
                  {isAboveGoal ? (
                    <TrendingUp className="h-5 w-5 text-green-300" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-yellow-300" />
                  )}
                </div>
              </div>
              
              <div>
                <p className="text-primary-foreground/70 text-sm mb-1">% da Meta</p>
                <p className={`text-2xl font-bold ${isAboveGoal ? 'text-green-300' : 'text-yellow-300'}`}>
                  {(percentualAtingido || 0).toFixed(1)}%
                </p>
              </div>
              
              <div>
                <p className="text-primary-foreground/70 text-sm mb-1">Ticket Médio</p>
                <p className="text-2xl font-bold">{formatCurrency(kpis.ticket_medio)}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-4">
              <div>
                <p className="text-primary-foreground/70 text-sm mb-1">Negócios Ganhos</p>
                <p className="text-xl font-semibold text-green-300">{kpis.negocios_ganhos}</p>
              </div>
              
              <div>
                <p className="text-primary-foreground/70 text-sm mb-1">Negócios Perdidos</p>
                <p className="text-xl font-semibold text-red-300">{kpis.negocios_perdidos}</p>
              </div>
              
              <div>
                <p className="text-primary-foreground/70 text-sm mb-1">Conversão Geral</p>
                <p className="text-xl font-semibold">{(kpis.conversao_percentual || 0).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
