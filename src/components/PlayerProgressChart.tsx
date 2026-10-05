import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRatingCriteria } from '@/hooks/useRatingCriteria';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { getDateFnsLocale } from '@/lib/dateLocale';
import { TrendingUp } from 'lucide-react';
import { tr } from '@/lib/tr';

type MonthlyData = Record<string, number | string | null> & {
  month: string;
  totalAvg: number;
};

interface PlayerProgressChartProps {
  data: MonthlyData[];
}

export function PlayerProgressChart({ data }: PlayerProgressChartProps) {
  const { i18n } = useTranslation();
  const { criteria } = useRatingCriteria();
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return format(date, 'MMM yy', { locale: getDateFnsLocale(i18n.language) });
  };

  const chartData = data.map(d => ({
    ...d,
    name: formatMonth(d.month),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          {tr('Evolución Mensual')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10 }} 
                className="text-muted-foreground"
              />
              <YAxis 
                domain={[0, 10]} 
                tick={{ fontSize: 10 }} 
                className="text-muted-foreground"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [value.toFixed(1), '']}
              />
              <Legend 
                wrapperStyle={{ fontSize: '10px' }}
                formatter={(value) => {
                  const cat = criteria.find(c => c.key === value);
                  return cat?.shortLabel || value;
                }}
              />
              {criteria.map(cat => (
                <Line
                  key={cat.key}
                  type="monotone"
                  dataKey={cat.key}
                  name={cat.key}
                  stroke={cat.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        {data.length > 0 && (
          <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-2">
            {criteria.map(cat => {
              const latestValue = data[data.length - 1][cat.key] as number | null;
              if (latestValue == null) return null;
              const prev = data.length > 1 ? data[data.length - 2][cat.key] : null;
              const prevValue = typeof prev === 'number' ? prev : null;
              const diff = prevValue !== null ? latestValue - prevValue : 0;
              
              return (
                <div 
                  key={cat.key} 
                  className="text-center p-2 rounded-lg"
                  style={{ backgroundColor: `${cat.color}10` }}
                >
                  <p className="text-lg font-bold" style={{ color: cat.color }}>
                    {latestValue.toFixed(1)}
                  </p>
                  {prevValue !== null && (
                    <p className={`text-xs ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground truncate">{cat.shortLabel}</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
