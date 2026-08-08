import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RATING_CATEGORIES } from '@/hooks/usePlayerRatings';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { getDateFnsLocale } from '@/lib/dateLocale';
import { TrendingUp } from 'lucide-react';

interface MonthlyData {
  month: string;
  effort_attitude: number;
  communication_cooperation: number;
  technical_execution: number;
  decision_making: number;
  leadership_initiative: number;
  totalAvg: number;
}

interface PlayerProgressChartProps {
  data: MonthlyData[];
}

const CATEGORY_COLORS: Record<string, string> = {
  effort_attitude: '#ef4444',
  communication_cooperation: '#3b82f6',
  technical_execution: '#22c55e',
  decision_making: '#f59e0b',
  leadership_initiative: '#8b5cf6',
};

export function PlayerProgressChart({ data }: PlayerProgressChartProps) {
  const { i18n } = useTranslation();
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
          Evolución Mensual
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
                  const cat = RATING_CATEGORIES.find(c => c.key === value);
                  return cat?.shortLabel || value;
                }}
              />
              {RATING_CATEGORIES.map(cat => (
                <Line
                  key={cat.key}
                  type="monotone"
                  dataKey={cat.key}
                  name={cat.key}
                  stroke={CATEGORY_COLORS[cat.key]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        {data.length > 0 && (
          <div className="mt-4 grid grid-cols-5 gap-2">
            {RATING_CATEGORIES.map(cat => {
              const latestValue = data[data.length - 1][cat.key];
              const prevValue = data.length > 1 ? data[data.length - 2][cat.key] : null;
              const diff = prevValue !== null ? latestValue - prevValue : 0;
              
              return (
                <div 
                  key={cat.key} 
                  className="text-center p-2 rounded-lg"
                  style={{ backgroundColor: `${CATEGORY_COLORS[cat.key]}10` }}
                >
                  <p className="text-lg font-bold" style={{ color: CATEGORY_COLORS[cat.key] }}>
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
