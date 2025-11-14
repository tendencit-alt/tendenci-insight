import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Flame, Star, Zap, Crown, Lock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BadgeData {
  type: string;
  earned_at?: string;
  percentual?: number;
}

interface BadgesSectionProps {
  badges: BadgeData[];
}

const allBadges = [
  { type: "start_meta", label: "Start da Meta", icon: Star, color: "text-chart-2", requirement: "10% da meta" },
  { type: "meio_caminho", label: "Meio do Caminho", icon: Target, color: "text-primary", requirement: "50% da meta" },
  { type: "virada_meta", label: "Virada da Meta", icon: Flame, color: "text-warning", requirement: "80% da meta" },
  { type: "atingiu_meta", label: "Atingiu a Meta", icon: Trophy, color: "text-success", requirement: "100% da meta" },
  { type: "meta_explodida", label: "Meta Explodida", icon: Zap, color: "text-destructive", requirement: "120% da meta" },
  { type: "closer_mes", label: "Closer do Mês", icon: Crown, color: "text-warning", requirement: "1º lugar no ranking" },
];

export function BadgesSection({ badges }: BadgesSectionProps) {
  const earnedBadgeTypes = new Set(badges?.map(b => b.type) || []);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-warning" />
          Insígnias e Conquistas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {allBadges.map((badgeInfo) => {
            const earnedBadge = badges?.find(b => b.type === badgeInfo.type);
            const isEarned = earnedBadgeTypes.has(badgeInfo.type);
            const Icon = badgeInfo.icon;

            return (
              <TooltipProvider key={badgeInfo.type}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`
                        flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all cursor-pointer
                        ${isEarned 
                          ? 'bg-card border-primary shadow-md hover:shadow-lg' 
                          : 'bg-muted/30 border-muted opacity-50'
                        }
                      `}
                    >
                      <div className={`
                        p-3 rounded-full
                        ${isEarned ? 'bg-primary/10' : 'bg-muted'}
                      `}>
                        {isEarned ? (
                          <Icon className={`h-8 w-8 ${badgeInfo.color}`} />
                        ) : (
                          <Lock className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      
                      <div className="text-center">
                        <p className={`text-xs font-medium ${isEarned ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {badgeInfo.label}
                        </p>
                        {earnedBadge?.earned_at && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {format(new Date(earnedBadge.earned_at), "dd/MM/yy", { locale: ptBR })}
                          </p>
                        )}
                      </div>

                      {isEarned && earnedBadge?.percentual && (
                        <Badge variant="secondary" className="text-[10px]">
                          {earnedBadge.percentual.toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{badgeInfo.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {isEarned ? 'Conquistada!' : `Conquiste com: ${badgeInfo.requirement}`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
