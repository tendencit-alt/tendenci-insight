import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { calculateVariation } from '@/hooks/usePeriodComparison';

export interface PeriodValue {
  periodId: string;
  periodLabel: string;
  periodColor: string;
  value: number;
  formattedValue: string;
}

interface ComparisonKPICardProps {
  title: string;
  icon?: LucideIcon;
  periodValues: PeriodValue[];
  loading?: boolean;
  formatValue?: (value: number) => string;
  invertVariation?: boolean; // For metrics where lower is better
  className?: string;
}

export function ComparisonKPICard({
  title,
  icon: Icon,
  periodValues,
  loading = false,
  invertVariation = false,
  className = '',
}: ComparisonKPICardProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  const primaryValue = periodValues[0];
  const hasComparison = periodValues.length > 1;

  return (
    <Card className={`transition-all hover:shadow-md ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Primary value (first period) */}
        {primaryValue && (
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: primaryValue.periodColor }}
            />
            <span className="text-xl font-bold">{primaryValue.formattedValue}</span>
          </div>
        )}

        {/* Comparison values */}
        {hasComparison && (
          <div className="space-y-1.5 pt-1 border-t">
            {periodValues.slice(1).map((pv, index) => {
              const variation = calculateVariation(primaryValue?.value || 0, pv.value);
              const isPositive = invertVariation ? !variation.isPositive : variation.isPositive;
              
              return (
                <div key={pv.periodId} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: pv.periodColor }}
                    />
                    <span className="text-muted-foreground">{pv.periodLabel}:</span>
                    <span className="font-medium">{pv.formattedValue}</span>
                  </div>
                  
                  {variation.value !== 0 && (
                    <div className={`flex items-center gap-0.5 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span className="font-medium">{variation.value.toFixed(1)}%</span>
                    </div>
                  )}
                  
                  {variation.value === 0 && (
                    <div className="flex items-center gap-0.5 text-muted-foreground">
                      <Minus className="h-3 w-3" />
                      <span>0%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Single period label */}
        {!hasComparison && primaryValue && (
          <div className="text-xs text-muted-foreground">
            {primaryValue.periodLabel}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Utility for formatting currency
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Utility for formatting percentage
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// Utility for formatting number
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}
