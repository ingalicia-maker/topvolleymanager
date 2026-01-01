import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RATING_CATEGORIES } from '@/hooks/usePlayerRatings';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, TrendingUp } from 'lucide-react';

interface MonthlyTeamData {
  month: string;
  effort_attitude: number;
  communication_cooperation: number;
  technical_execution: number;
  decision_making: number;
  leadership_initiative: number;
  totalAvg: number;
  count: number;
}

interface TeamProgressChartProps {
  data: MonthlyTeamData[];
  teamColor: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  effort_attitude: '#ef4444',
  communication_cooperation: '#3b82f6',
  technical_execution: '#22c55e',
  decision_making: '#f59e0b',
  leadership_initiative: '#8b5cf6',
};

export function TeamProgressChart({ data, teamColor }: TeamProgressChartProps) {
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return format(date, 'MMM yy', { locale: es });
  };

  const chartData = data.map(d => ({
    ...d,
    name: formatMonth(d.month),
  }));

  // Calculate latest averages
  const latestData = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div className="space-y-4">
      {/* Average Line Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Evolución Media del Equipo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 w-full">
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
                  formatter={(value: number, name: string) => {
                    if (name === 'totalAvg') return [value.toFixed(1), 'Media Total'];
                    return [value.toFixed(1), name];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="totalAvg"
                  name="totalAvg"
                  stroke={teamColor}
                  strokeWidth={3}
                  dot={{ r: 4, fill: teamColor }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Desglose por Categoría
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
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
                  <Bar
                    key={cat.key}
                    dataKey={cat.key}
                    name={cat.key}
                    fill={CATEGORY_COLORS[cat.key]}
                    radius={[2, 2, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Latest Stats */}
      {latestData && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Último Mes: {formatMonth(latestData.month)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {RATING_CATEGORIES.map(cat => (
                <div 
                  key={cat.key} 
                  className="text-center p-2 rounded-lg"
                  style={{ backgroundColor: `${CATEGORY_COLORS[cat.key]}10` }}
                >
                  <p className="text-lg font-bold" style={{ color: CATEGORY_COLORS[cat.key] }}>
                    {latestData[cat.key].toFixed(1)}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{cat.shortLabel}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 text-center p-2 rounded-lg" style={{ backgroundColor: `${teamColor}10` }}>
              <p className="text-2xl font-bold" style={{ color: teamColor }}>
                {latestData.totalAvg.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">Media Total ({latestData.count} puntuaciones)</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
