import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Flame, Trophy, TrendingUp, Calendar } from 'lucide-react';

interface GoalStreakProps {
  currentStreak: number;
  bestStreak: number;
  totalDaysMet: number;
  averageDaily: number;
  loading?: boolean;
}

export function GoalStreak({ 
  currentStreak, 
  bestStreak, 
  totalDaysMet, 
  averageDaily,
  loading 
}: GoalStreakProps) {
  const stats = [
    {
      icon: Flame,
      label: 'Sequência Atual',
      value: currentStreak,
      suffix: 'dias',
      color: currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground',
      bgColor: currentStreak > 0 ? 'bg-orange-500/10' : 'bg-muted',
      highlight: currentStreak >= 3,
    },
    {
      icon: Trophy,
      label: 'Melhor Sequência',
      value: bestStreak,
      suffix: 'dias',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      highlight: false,
    },
    {
      icon: Calendar,
      label: 'Dias Batidos',
      value: totalDaysMet,
      suffix: 'total',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      highlight: false,
    },
    {
      icon: TrendingUp,
      label: 'Média Diária',
      value: averageDaily.toFixed(1),
      suffix: '/dia',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      highlight: false,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 animate-pulse">
              <div className="h-16 bg-muted rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Card 
          key={stat.label} 
          className={`transition-all hover:shadow-md ${stat.highlight ? 'ring-2 ring-orange-500/50 animate-pulse' : ''}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                  <span className="text-xs text-muted-foreground">{stat.suffix}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}