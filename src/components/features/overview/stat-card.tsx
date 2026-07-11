import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import React, { useEffect, useState } from 'react'
import { Stat } from '.'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

const StatCard = ({ stat, loading }: { stat: Stat, loading?: boolean }) => {
  
   useEffect(() => {
    console.log("🚀 ~ StatCard ~ loading:", loading)

  }, [loading]);

    const formatValue = (value: number) => {
        if (stat.format === "currency") {
          return `$${ value.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
        }
        if (stat.format === "percentage") {
          return `${Math.round(value)}%`;
        }
        return Math.round(value).toString();
      };
    
      const [displayValue, setDisplayValue] = useState(formatValue(stat.value));
    
      useEffect(() => {
        let start = 0;
        let startTimestamp: number | null = null;
        let rafId: number;
        const duration = 1200;
    
        const step = (timestamp: number) => {
          if (!startTimestamp) startTimestamp = timestamp;
    
          const progress = Math.min((timestamp - startTimestamp) / duration, 1);
          const current = start + (stat.value - start) * progress;
    
          setDisplayValue(formatValue(current));
    
          if (progress < 1) {
            rafId = requestAnimationFrame(step);
          }
        };
    
        rafId = requestAnimationFrame(step);
    
        return () => cancelAnimationFrame(rafId);
      }, [stat.value, stat.format]);


      if (loading) {
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
    
            <CardContent className="space-y-2">
              <Skeleton className="h-7 w-20" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-24" />
              </div>
            </CardContent>
          </Card>
        );
      } else {
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
      
            <CardContent>
              <div className="text-2xl font-bold">{displayValue}</div>
      
              <div className="flex items-center text-xs text-muted-foreground">
                {stat.trend === "up" ? (
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                )}
                <span
                  className={stat.trend === "up" ? "text-green-500" : "text-red-500"}
                >
                 %{parseFloat(stat.change).toFixed(1)}
                </span>
                <span className="ml-1 text-nowrap">respecto al mes anterior</span>
              </div>
            </CardContent>
          </Card>
        );
      }
    
     
}

export default StatCard
