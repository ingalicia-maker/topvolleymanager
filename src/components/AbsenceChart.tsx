import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DbAusencia } from '@/hooks/useAusencias';

interface AbsenceChartProps {
  ausencias: DbAusencia[];
  teamId: string;
  teamName: string;
}

export function AbsenceChart({ ausencias, teamId, teamName }: AbsenceChartProps) {
  const chartData = useMemo(() => {
    const teamAusencias = ausencias.filter(a => a.team_id === teamId);
    
    // Group by month
    const byMonth: Record<string, { justified: number; unjustified: number }> = {};
    
    teamAusencias.forEach(a => {
      const monthKey = a.date.substring(0, 7);
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = { justified: 0, unjustified: 0 };
      }
      if (a.absence_type === 'justified') {
        byMonth[monthKey].justified++;
      } else {
        byMonth[monthKey].unjustified++;
      }
    });

    // Convert to array and sort
    return Object.entries(byMonth)
      .map(([month, data]) => {
        const [year, monthNum] = month.split('-');
        const monthDate = new Date(parseInt(year), parseInt(monthNum) - 1);
        return {
          month,
          monthLabel: format(monthDate, 'MMM yy', { locale: es }),
          justified: data.justified,
          unjustified: data.unjustified,
          total: data.justified + data.unjustified,
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
  }, [ausencias, teamId]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolución de ausencias</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-4">
            No hay datos suficientes para mostrar el gráfico
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Evolución mensual - {teamName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="monthLabel" 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
              />
              <Bar 
                dataKey="justified" 
                name="Justificadas" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
                stackId="a"
              />
              <Bar 
                dataKey="unjustified" 
                name="No justificadas" 
                fill="hsl(25, 95%, 53%)" 
                radius={[4, 4, 0, 0]}
                stackId="a"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
